-- Enable pgcrypto extension for secure PIN hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Migrate existing plaintext sec_pin to bcrypt hashes (assuming current values are plaintext)
UPDATE profiles SET sec_pin = crypt(sec_pin, gen_salt('bf')) WHERE sec_pin IS NOT NULL AND NOT (sec_pin ~ '^\\$2[aby]\\$');

-- 1. Create a secure RPC for KYC completion
CREATE OR REPLACE FUNCTION complete_kyc(p_user_id UUID, p_fin TEXT, p_otp TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_success BOOLEAN := FALSE;
    v_error TEXT := NULL;
    v_user RECORD;
    v_app_env TEXT := current_setting('app.environment', true);
BEGIN
    SET search_path = public, pg_temp;

    -- Environment guard: Mock logic only in development
    IF v_app_env IS DISTINCT FROM 'development' THEN
        RETURN json_build_object('success', false, 'error', 'Real Fayda API verification required in production');
    END IF;

    -- DEV MOCK LOGIC: Accept valid 13-digit Fayda IDs and 6-digit OTPs when real API access is unavailable.
    IF length(p_fin) = 13 AND p_fin ~ '^[0-9]{13}$' AND p_otp ~ '^[0-9]{6}$' THEN
        UPDATE profiles 
        SET kyc_status = 'VERIFIED',
            fayda_verified = true,
            onboarded = true,
            updated_at = NOW()
        WHERE id = p_user_id
        RETURNING * INTO v_user;
        
        IF FOUND THEN
            v_success := TRUE;
            RETURN json_build_object('success', v_success, 'data', json_build_object(
                'id', v_user.id,
                'phone', v_user.phone,
                'email', v_user.email,
                'kyc_status', v_user.kyc_status,
                'created_at', v_user.created_at
            ));
        ELSE
            v_error := 'User profile not found';
            RETURN json_build_object('success', v_success, 'error', v_error);
        END IF;
    ELSE
        v_error := 'Invalid FIN or OTP';
        RETURN json_build_object('success', v_success, 'error', v_error);
    END IF;
END;
$$;

-- 2. Create a secure RPC for Government Admin Login (Dev Fallback)
CREATE OR REPLACE FUNCTION verify_gov_admin_dev(p_badge_id TEXT, p_sec_pin TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
    v_app_env TEXT := current_setting('app.environment', true);
BEGIN
    SET search_path = public, pg_temp;

    IF v_app_env IS DISTINCT FROM 'development' THEN
        RETURN json_build_object('success', false, 'error', 'Dev fallback disabled in non-development environment');
    END IF;

    SELECT * INTO v_user
    FROM profiles
    WHERE role = 'admin'
      AND badge_id = p_badge_id
      AND crypt(p_sec_pin, sec_pin) = sec_pin;
      
    IF FOUND THEN
        RETURN json_build_object('success', true, 'user', json_build_object(
            'id', v_user.id,
            'email', v_user.email,
            'full_name', v_user.full_name,
            'role', v_user.role
        ));
    ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid credentials');
    END IF;
END;
$$;

-- 3. Lock down RLS on profiles to prevent client-side manipulation of sensitive columns
-- By using a BEFORE UPDATE trigger, we can ensure that standard client (authenticated) users
-- cannot tamper with their KYC status, role, or PIN directly via the API.
CREATE OR REPLACE FUNCTION check_profile_sensitive_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    SET search_path = public, pg_temp;

    -- If the current role is authenticated (meaning a client web/mobile user)
    IF current_setting('role', true) = 'authenticated' THEN
        -- Check if sensitive fields changed
        IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status OR
           NEW.fayda_verified IS DISTINCT FROM OLD.fayda_verified OR
           NEW.role IS DISTINCT FROM OLD.role OR
           NEW.sec_pin IS DISTINCT FROM OLD.sec_pin THEN
            RAISE EXCEPTION 'Not authorized to update sensitive profile fields';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_profile_sensitive_updates ON profiles;
CREATE TRIGGER trigger_check_profile_sensitive_updates
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION check_profile_sensitive_updates();

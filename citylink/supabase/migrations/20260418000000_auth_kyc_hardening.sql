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

    -- Real Fayda API verification logic should be implemented here.
    -- For now, we strictly enforce that this function is a stub that requires
    -- a real identity gateway integration.
    v_error := 'Fayda API integration required for verification';
    RETURN json_build_object('success', false, 'error', v_error);
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

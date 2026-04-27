-- supabase/migrations/20260423000001_production_hardening_v6.sql

-- 1. Hardening delivery_agents RLS
-- Prevent agents from reactivating themselves if suspended.
DROP POLICY IF EXISTS agents_update_own_profile ON delivery_agents;
CREATE POLICY agents_update_own_details ON delivery_agents
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR is_admin())
    WITH CHECK (
        (id = auth.uid() AND agent_status = (SELECT agent_status FROM delivery_agents WHERE id = auth.uid())) 
        OR is_admin()
    );

-- 2. Secure RPC for user mode switching (Citizen <-> Agent)
-- This allows verified agents to switch their active role without needing Admin privileges.
CREATE OR REPLACE FUNCTION switch_user_mode(p_target_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_current_role TEXT;
    v_is_verified BOOLEAN;
BEGIN
    -- 1. Check current role and verification status
    SELECT role, (kyc_status = 'VERIFIED') INTO v_current_role, v_is_verified 
    FROM profiles WHERE id = auth.uid();
    
    IF NOT v_is_verified THEN
        RETURN jsonb_build_object('ok', false, 'error', 'KYC verification required to switch roles');
    END IF;

    -- 2. Validate target role
    -- Only allow switching between citizen and delivery_agent
    IF p_target_role NOT IN ('citizen', 'delivery_agent') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Invalid role switch target');
    END IF;

    -- 3. If switching TO delivery_agent, ensure they are an APPROVED agent
    IF p_target_role = 'delivery_agent' THEN
        IF NOT EXISTS (SELECT 1 FROM delivery_agents WHERE id = auth.uid() AND agent_status = 'APPROVED') THEN
            RETURN jsonb_build_object('ok', false, 'error', 'Not an approved delivery agent');
        END IF;
    END IF;

    -- 4. Perform Switch
    UPDATE profiles 
    SET role = p_target_role::user_role,
        updated_at = NOW()
    WHERE id = auth.uid();

    RETURN jsonb_build_object('ok', true, 'new_role', p_target_role);
END;
$$;

-- 3. Audit Log Table (Real Infrastructure)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    actor_id UUID REFERENCES profiles(id),
    resource_id TEXT,
    details JSONB,
    severity TEXT DEFAULT 'low',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_only_audit_logs ON audit_logs
    FOR SELECT TO authenticated
    USING (is_admin());

-- 4. Secure RPC to fetch real audit logs
CREATE OR REPLACE FUNCTION fetch_system_audit_logs(p_limit INT DEFAULT 20)
RETURNS SETOF audit_logs
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT * FROM audit_logs 
    WHERE is_admin()
    ORDER BY created_at DESC 
    LIMIT p_limit;
$$;

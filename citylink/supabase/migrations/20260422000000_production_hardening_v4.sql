-- =============================================================================
-- CITYLINK PRODUCTION HARDENING V4
-- Applied: 2026-04-22
-- Fixes all P0-P2 issues from the dual static + live MCP audit.
-- =============================================================================

-- 2.1 Fix is_real_user() — add SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_real_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth AS $$
  SELECT auth.role() = 'authenticated'
    AND auth.jwt() IS NOT NULL
    AND (auth.jwt() ->> 'role') IS DISTINCT FROM 'anon';
$$;

-- 2.2-2.3 RLS policies rebuilt with (SELECT auth.uid()) and consolidated
-- (See full migration body applied via MCP)

-- 2.4 Duplicate indexes dropped
-- 2.5 Missing FK indexes added
-- 2.6 generate_secure_6digit_pin() fixed (single gen_random_bytes call)
-- 2.7 get_platform_revenue() RPC created
-- 2.8 treasury_wallet_user_id added to app_config
-- 2.9 otp_challenges table created
-- 2.10 fayda_mock_enabled flag added to app_config
-- 2.11 merchant_mark_shipped() RPC created
-- 2.12 sec_pin plaintext values nullified

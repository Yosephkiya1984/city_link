-- Migration: Security Audit Fixes based on MCP Advisors

-- 1. Change views to Security Invoker
ALTER VIEW IF EXISTS public.marketplace_view SET (security_invoker = on);

-- 2. Set strict search_path on vulnerable functions dynamically
DO $$
DECLARE
    rec record;
BEGIN
    FOR rec IN 
        SELECT oid::regprocedure AS proc_name
        FROM pg_proc
        WHERE proname IN (
            'confirm_delivery_with_pin', 'request_merchant_withdrawal', 'complete_kyc', 
            'prevent_kyc_status_client_update', 'validate_image_upload', 'increment_buyer_rejection_count', 
            'check_profile_sensitive_updates', 'protect_profile_columns', 'verify_gov_admin_dev', 
            'start_parking_session_atomic', 'end_parking_session_atomic', 'handle_agent_decline', 
            'execute_ekub_draw_atomic', 'mark_delivery_delivered_atomic'
        ) AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'ALTER FUNCTION ' || rec.proc_name || ' SET search_path = public, pg_temp';
    END LOOP;
END
$$;

-- 3. Remediate Anonymous Access RLS
-- Any policy assigned to 'public' allows anonymous access. We restrict them to 'authenticated'.
-- Any policy explicitly assigned to 'anon' will be dropped.
DO $$
DECLARE
    rec record;
BEGIN
    -- Change 'public' policies to 'authenticated'
    FOR rec IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public' 
          AND roles @> '{public}'::name[]
          AND tablename IN (
            'chat_messages', 'delivery_agents', 'disputes', 'escrows', 'fayda_mock_registry', 
            'food_orders', 'kyc_verifications', 'marketplace_orders', 'marketplace_security_logs', 
            'merchants', 'message_threads', 'notifications', 'parking_sessions', 'products', 
            'profiles', 'restaurant_bookings', 'transactions', 'wallets', 'withdrawal_requests'
          )
    LOOP
        EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated', rec.policyname, rec.schemaname, rec.tablename);
    END LOOP;

    -- Drop 'anon' policies
    FOR rec IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public' 
          AND roles @> '{anon}'::name[]
          AND tablename IN (
            'chat_messages', 'delivery_agents', 'disputes', 'escrows', 'fayda_mock_registry', 
            'food_orders', 'kyc_verifications', 'marketplace_orders', 'marketplace_security_logs', 
            'merchants', 'message_threads', 'notifications', 'parking_sessions', 'products', 
            'profiles', 'restaurant_bookings', 'transactions', 'wallets', 'withdrawal_requests'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', rec.policyname, rec.schemaname, rec.tablename);
    END LOOP;
END
$$;

-- Restrict storage objects if applicable
DO $$
DECLARE
    rec record;
BEGIN
    FOR rec IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND roles @> '{public}'::name[]
    LOOP
        EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated', rec.policyname, rec.schemaname, rec.tablename);
    END LOOP;
END
$$;

-- 4. Remove duplicate unused indexes
DROP INDEX IF EXISTS public.idx_chat_msgs_user;
DROP INDEX IF EXISTS public.idx_delala_listings_status;

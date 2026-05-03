-- Migration: Security Audit Fixes v2.2 (Correct CMD Handling)
-- Date: 2026-04-21

-- 1. Strict Search Path for ALL public functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT 
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS function_args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        -- Exclude functions that belong to an extension (like postgis)
        LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
        WHERE n.nspname = 'public' 
          AND d.objid IS NULL
          -- Exclude C and internal functions just in case
          AND p.prolang IN (SELECT oid FROM pg_language WHERE lanname IN ('sql', 'plpgsql'))
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp', 
                       func_record.schema_name, 
                       func_record.function_name, 
                       func_record.function_args);
    END LOOP;
END
$$;

-- 2. Restrict Anonymous Access on ALL public tables
DO $$
DECLARE
    pol_record RECORD;
BEGIN
    FOR pol_record IN
        SELECT schemaname, tablename, policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public' 
          AND (roles @> '{public}'::name[] OR roles @> '{anon}'::name[])
          AND tablename NOT IN ('products', 'restaurants') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol_record.policyname, pol_record.schemaname, pol_record.tablename);
        
        IF pol_record.cmd = 'INSERT' THEN
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated WITH CHECK (%s)', 
                           pol_record.policyname, 
                           pol_record.schemaname, 
                           pol_record.tablename,
                           COALESCE(pol_record.with_check, 'true'));
        ELSIF pol_record.cmd = 'SELECT' THEN
             EXECUTE format('CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated USING (%s)', 
                           pol_record.policyname, 
                           pol_record.schemaname, 
                           pol_record.tablename,
                           COALESCE(pol_record.qual, 'true'));
        ELSE
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR %s TO authenticated USING (%s) %s', 
                           pol_record.policyname, 
                           pol_record.schemaname, 
                           pol_record.tablename,
                           pol_record.cmd,
                           COALESCE(pol_record.qual, 'true'),
                           CASE WHEN pol_record.with_check IS NOT NULL THEN 'WITH CHECK (' || pol_record.with_check || ')' ELSE '' END);
        END IF;
    END LOOP;
END
$$;

-- 3. Storage Security Hardening
DO $$
DECLARE
    pol_record RECORD;
BEGIN
    FOR pol_record IN
        SELECT schemaname, tablename, policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND (roles @> '{public}'::name[] OR roles @> '{anon}'::name[])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol_record.policyname, pol_record.schemaname, pol_record.tablename);
        
        IF pol_record.cmd = 'INSERT' THEN
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated WITH CHECK (%s)', 
                           pol_record.policyname, 
                           pol_record.schemaname, 
                           pol_record.tablename,
                           COALESCE(pol_record.with_check, 'true'));
        ELSIF pol_record.cmd = 'SELECT' THEN
             EXECUTE format('CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated USING (%s)', 
                           pol_record.policyname, 
                           pol_record.schemaname, 
                           pol_record.tablename,
                           COALESCE(pol_record.qual, 'true'));
        ELSE
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR %s TO authenticated USING (%s) %s', 
                           pol_record.policyname, 
                           pol_record.schemaname, 
                           pol_record.tablename,
                           pol_record.cmd,
                           COALESCE(pol_record.qual, 'true'),
                           CASE WHEN pol_record.with_check IS NOT NULL THEN 'WITH CHECK (' || pol_record.with_check || ')' ELSE '' END);
        END IF;
    END LOOP;
END
$$;

-- 4. Revoke direct table inserts for notifications
REVOKE INSERT ON public.notifications FROM public;
REVOKE INSERT ON public.notifications FROM anon;
GRANT INSERT ON public.notifications TO authenticated;
DROP POLICY IF EXISTS notifications_insert_self ON public.notifications;
CREATE POLICY notifications_insert_self ON public.notifications 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- 5. Final Cleanup
DROP INDEX IF EXISTS public.idx_chat_msgs_user;
DROP INDEX IF EXISTS public.idx_delala_listings_status;

-- 6. Protect Sensitive Columns in profiles
-- Ensure sec_pin and pin_hash are not easily selectable if not needed
-- Actually, postgrest doesn't allow column level select policies natively without views,
-- but we can ensure the update policy prevents updating them directly without RPCs
-- We already have the profiles_self_update with_check

-- 7. Harden Marketplace Orders policies
DROP POLICY IF EXISTS marketplace_orders_update ON public.marketplace_orders;
CREATE POLICY marketplace_orders_update ON public.marketplace_orders
    FOR UPDATE TO authenticated
    USING (is_admin() OR buyer_id = auth.uid() OR merchant_id = auth.uid() OR agent_id = auth.uid())
    WITH CHECK (
        (is_admin()) OR 
        (buyer_id = auth.uid() AND status IN ('pending', 'cancelled')) OR
        (merchant_id = auth.uid()) OR
        (agent_id = auth.uid())
    );

-- 8. Harden Wallets
-- Users should only be able to see their own wallet and not update balance directly
DROP POLICY IF EXISTS wallets_select ON public.wallets;
CREATE POLICY wallets_select ON public.wallets
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS wallets_update ON public.wallets;
CREATE POLICY wallets_update ON public.wallets
    FOR UPDATE TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS wallets_insert ON public.wallets;
CREATE POLICY wallets_insert ON public.wallets
    FOR INSERT TO authenticated
    WITH CHECK (is_admin() OR (user_id = auth.uid() AND balance = 0));


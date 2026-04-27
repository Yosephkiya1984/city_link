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
        WHERE n.nspname = 'public'
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

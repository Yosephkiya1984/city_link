-- Migration: Security Audit Fixes v3 (Scorched Earth RLS)
-- Date: 2026-04-21
-- Description: Drops all existing policies and recreates a production-grade, authenticated-only security model.

-- 1. Ensure RLS is enabled on ALL tables
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
END $$;

-- 2. Clear the slate (Done via previous RPC, but included here for completeness if run as migration)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. Profiles: Self-manage + Public Discovery
CREATE POLICY profiles_read_discovery ON public.profiles 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_self_update ON public.profiles 
    FOR UPDATE TO authenticated USING (auth.uid() = id OR is_admin());
CREATE POLICY profiles_self_insert ON public.profiles 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 4. Wallets & Finance: Owner/Admin Only
CREATE POLICY wallets_owner_policy ON public.wallets 
    FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY transactions_owner_policy ON public.transactions 
    FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY withdrawal_requests_owner_policy ON public.withdrawal_requests 
    FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());

-- 5. Orders: Participants/Admin Only
CREATE POLICY marketplace_orders_participant_policy ON public.marketplace_orders 
    FOR ALL TO authenticated 
    USING (auth.uid() = buyer_id OR auth.uid() = merchant_id OR auth.uid() = agent_id OR is_admin());

CREATE POLICY food_orders_participant_policy ON public.food_orders 
    FOR ALL TO authenticated 
    USING (auth.uid() = citizen_id OR auth.uid() = merchant_id OR auth.uid() = agent_id OR is_admin());

-- 6. Messaging: Participants/Admin Only
CREATE POLICY message_threads_participant_policy ON public.message_threads 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_a_id OR auth.uid() = user_b_id OR is_admin());

CREATE POLICY chat_messages_participant_policy ON public.chat_messages 
    FOR ALL TO authenticated 
    USING (
        auth.uid() = user_id OR 
        auth.uid() = to_user_id OR 
        EXISTS (
            SELECT 1 FROM message_threads 
            WHERE thread_id = chat_messages.thread_id 
              AND (user_a_id = auth.uid() OR user_b_id = auth.uid())
        ) OR 
        is_admin()
    );

-- 7. Discovery (Read: Authenticated, Write: Owner/Admin)
CREATE POLICY products_read_policy ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY products_write_policy ON public.products FOR ALL TO authenticated USING (auth.uid() = merchant_id OR is_admin());

CREATE POLICY restaurants_read_policy ON public.restaurants FOR SELECT TO authenticated USING (true);
CREATE POLICY restaurants_write_policy ON public.restaurants FOR ALL TO authenticated USING (auth.uid() = id OR is_admin());

CREATE POLICY merchants_read_policy ON public.merchants FOR SELECT TO authenticated USING (true);
CREATE POLICY merchants_write_policy ON public.merchants FOR ALL TO authenticated USING (auth.uid() = id OR is_admin());

-- 8. Notifications: Owner/Admin Only (Insert handled via RPC or self-insert)
CREATE POLICY notifications_owner_policy ON public.notifications 
    FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin());

-- 9. Delivery: Participants/Admin Only
CREATE POLICY delivery_agents_read_policy ON public.delivery_agents FOR SELECT TO authenticated USING (true);
CREATE POLICY delivery_agents_write_policy ON public.delivery_agents FOR ALL TO authenticated USING (id = auth.uid() OR is_admin());

CREATE POLICY delivery_dispatches_participant_policy ON public.delivery_dispatches 
    FOR SELECT TO authenticated USING (agent_id = auth.uid() OR is_admin());

-- 10. Utility Tables
CREATE POLICY app_config_read_policy ON public.app_config FOR SELECT TO authenticated USING (true);
CREATE POLICY fayda_mock_registry_read_policy ON public.fayda_mock_registry FOR SELECT TO authenticated USING (true);

-- 11. Marketplace Security Logs: Admin Only
CREATE POLICY marketplace_security_logs_admin_policy ON public.marketplace_security_logs 
    FOR SELECT TO authenticated USING (is_admin());

-- 12. Storage Hardening (objects table)
DO $$
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

CREATE POLICY authenticated_read_objects ON storage.objects FOR SELECT TO authenticated USING (true);
CREATE POLICY authenticated_write_objects ON storage.objects FOR ALL TO authenticated USING (auth.uid() = owner OR is_admin());

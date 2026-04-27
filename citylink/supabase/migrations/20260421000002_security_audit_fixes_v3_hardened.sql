-- Migration: Security Audit Fixes v3.1 (Hardened Scorched Earth RLS)
-- Date: 2026-04-21
-- Description: Adds 'is_anonymous' checks to all policies to prevent temporary anonymous JWTs from accessing data.

-- Helper function for hardened authenticated check
CREATE OR REPLACE FUNCTION public.is_real_user() 
RETURNS boolean 
LANGUAGE sql 
STABLE
AS $$
  SELECT (auth.role() = 'authenticated' AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE);
$$;

-- 1. Clear the slate again
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 2. Profiles: Real User Discovery
CREATE POLICY profiles_read_discovery ON public.profiles 
    FOR SELECT TO authenticated USING (is_real_user());
CREATE POLICY profiles_self_update ON public.profiles 
    FOR UPDATE TO authenticated USING ((auth.uid() = id AND is_real_user()) OR is_admin());
CREATE POLICY profiles_self_insert ON public.profiles 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id AND is_real_user());

-- 3. Wallets & Finance: Real Owner/Admin Only
CREATE POLICY wallets_owner_policy ON public.wallets 
    FOR ALL TO authenticated USING ((auth.uid() = user_id AND is_real_user()) OR is_admin());
CREATE POLICY transactions_owner_policy ON public.transactions 
    FOR SELECT TO authenticated USING ((auth.uid() = user_id AND is_real_user()) OR is_admin());
CREATE POLICY withdrawal_requests_owner_policy ON public.withdrawal_requests 
    FOR SELECT TO authenticated USING ((auth.uid() = user_id AND is_real_user()) OR is_admin());

-- 4. Orders: Real Participants/Admin Only
CREATE POLICY marketplace_orders_participant_policy ON public.marketplace_orders 
    FOR ALL TO authenticated 
    USING (((auth.uid() = buyer_id OR auth.uid() = merchant_id OR auth.uid() = agent_id) AND is_real_user()) OR is_admin());

CREATE POLICY food_orders_participant_policy ON public.food_orders 
    FOR ALL TO authenticated 
    USING (((auth.uid() = citizen_id OR auth.uid() = merchant_id OR auth.uid() = agent_id) AND is_real_user()) OR is_admin());

-- 5. Messaging: Real Participants/Admin Only
CREATE POLICY message_threads_participant_policy ON public.message_threads 
    FOR ALL TO authenticated 
    USING (((auth.uid() = user_a_id OR auth.uid() = user_b_id) AND is_real_user()) OR is_admin());

CREATE POLICY chat_messages_participant_policy ON public.chat_messages 
    FOR ALL TO authenticated 
    USING (
        ((auth.uid() = user_id OR auth.uid() = to_user_id) AND is_real_user()) OR 
        EXISTS (
            SELECT 1 FROM message_threads 
            WHERE thread_id = chat_messages.thread_id 
              AND (user_a_id = auth.uid() OR user_b_id = auth.uid())
              AND is_real_user()
        ) OR 
        is_admin()
    );

-- 6. Discovery (Read: Real User, Write: Real Owner/Admin)
CREATE POLICY products_read_policy ON public.products FOR SELECT TO authenticated USING (is_real_user());
CREATE POLICY products_write_policy ON public.products FOR ALL TO authenticated USING ((auth.uid() = merchant_id AND is_real_user()) OR is_admin());

CREATE POLICY restaurants_read_policy ON public.restaurants FOR SELECT TO authenticated USING (is_real_user());
CREATE POLICY restaurants_write_policy ON public.restaurants FOR ALL TO authenticated USING ((auth.uid() = id AND is_real_user()) OR is_admin());

CREATE POLICY merchants_read_policy ON public.merchants FOR SELECT TO authenticated USING (is_real_user());
CREATE POLICY merchants_write_policy ON public.merchants FOR ALL TO authenticated USING ((auth.uid() = id AND is_real_user()) OR is_admin());

-- 7. Notifications: Real Owner/Admin Only
CREATE POLICY notifications_owner_policy ON public.notifications 
    FOR ALL TO authenticated USING ((auth.uid() = user_id AND is_real_user()) OR is_admin());

-- 8. Delivery: Real Participants/Admin Only
CREATE POLICY delivery_agents_read_policy ON public.delivery_agents FOR SELECT TO authenticated USING (is_real_user());
CREATE POLICY delivery_agents_write_policy ON public.delivery_agents FOR ALL TO authenticated USING ((id = auth.uid() AND is_real_user()) OR is_admin());

CREATE POLICY delivery_dispatches_participant_policy ON public.delivery_dispatches 
    FOR SELECT TO authenticated USING ((agent_id = auth.uid() AND is_real_user()) OR is_admin());

-- 9. Catch-all for other tables (Admin only or Real User Read)
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN (
        'profiles', 'wallets', 'transactions', 'withdrawal_requests', 'marketplace_orders', 'food_orders',
        'message_threads', 'chat_messages', 'products', 'restaurants', 'merchants', 'notifications',
        'delivery_agents', 'delivery_dispatches'
    )) LOOP
        EXECUTE format('CREATE POLICY %I_admin_only ON public.%I FOR ALL TO authenticated USING (is_admin())', t.tablename, t.tablename);
        EXECUTE format('CREATE POLICY %I_real_user_read ON public.%I FOR SELECT TO authenticated USING (is_real_user())', t.tablename, t.tablename);
    END LOOP;
END $$;

-- 10. Storage Hardening (objects table)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

CREATE POLICY authenticated_read_objects ON storage.objects FOR SELECT TO authenticated USING (is_real_user());
CREATE POLICY authenticated_write_objects ON storage.objects FOR ALL TO authenticated 
    USING ((auth.uid() = owner::uuid AND is_real_user()) OR is_admin());

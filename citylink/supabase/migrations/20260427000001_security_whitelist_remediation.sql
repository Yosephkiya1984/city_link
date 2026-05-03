-- Migration: Security Whitelist Remediation (v4 Hardened)
-- Date: 2026-04-27
-- Description: Replaces catch-all "read-everything" policies with strict, table-by-table whitelisting.
-- Impact: Any table not explicitly listed here will revert to 'Default Deny' for all non-admin users.

-- 1. Reset all public policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 2. CORE: Profiles
CREATE POLICY profiles_discovery_read ON public.profiles 
    FOR SELECT TO authenticated USING (is_real_user());
CREATE POLICY profiles_self_all ON public.profiles 
    FOR ALL TO authenticated USING ((auth.uid() = id AND is_real_user()) OR is_admin());

-- 3. FINANCE: wallets, transactions, withdrawal_requests, p2p_transfers
CREATE POLICY wallets_owner_all ON public.wallets 
    FOR ALL TO authenticated USING ((auth.uid() = user_id AND is_real_user()) OR is_admin());

CREATE POLICY transactions_owner_read ON public.transactions 
    FOR SELECT TO authenticated USING ((auth.uid() = user_id AND is_real_user()) OR is_admin());

CREATE POLICY withdrawal_requests_owner_read ON public.withdrawal_requests 
    FOR SELECT TO authenticated USING ((auth.uid() = user_id AND is_real_user()) OR is_admin());

CREATE POLICY p2p_transfers_participant_read ON public.p2p_transfers 
    FOR SELECT TO authenticated USING (((auth.uid() = sender_id OR auth.uid() = receiver_id) AND is_real_user()) OR is_admin());

-- 4. MARKETPLACE: products, merchants, marketplace_orders, marketplace_security_logs
CREATE POLICY products_discovery_read ON public.products 
    FOR SELECT TO authenticated USING (is_real_user());
CREATE POLICY products_merchant_all ON public.products 
    FOR ALL TO authenticated USING ((auth.uid() = merchant_id AND is_real_user()) OR is_admin());

CREATE POLICY merchants_discovery_read ON public.merchants 
    FOR SELECT TO authenticated USING (is_real_user());
CREATE POLICY merchants_self_all ON public.merchants 
    FOR ALL TO authenticated USING ((auth.uid() = id AND is_real_user()) OR is_admin());

CREATE POLICY marketplace_orders_participant_all ON public.marketplace_orders 
    FOR ALL TO authenticated 
    USING (((auth.uid() = buyer_id OR auth.uid() = merchant_id OR auth.uid() = agent_id) AND is_real_user()) OR is_admin());

CREATE POLICY marketplace_security_logs_admin ON public.marketplace_security_logs 
    FOR ALL TO authenticated USING (is_admin());

-- 5. DISCOVERY & CITY SERVICES: restaurants, parking_lots, parking_sessions, parking_spots, delala_listings
CREATE POLICY restaurants_discovery_read ON public.restaurants 
    FOR SELECT TO authenticated USING (is_real_user());

CREATE POLICY parking_lots_discovery_read ON public.parking_lots 
    FOR SELECT TO authenticated USING (is_real_user());

CREATE POLICY parking_sessions_owner_all ON public.parking_sessions 
    FOR ALL TO authenticated USING ((auth.uid() = user_id AND is_real_user()) OR is_admin());

CREATE POLICY delala_listings_discovery_read ON public.delala_listings 
    FOR SELECT TO authenticated USING (is_real_user());

CREATE POLICY app_config_read ON public.app_config 
    FOR SELECT TO authenticated USING (is_real_user());

-- 6. EKUB & SOCIAL: ekubs, ekub_members, chat_messages, message_threads
CREATE POLICY ekubs_discovery_read ON public.ekubs 
    FOR SELECT TO authenticated USING (is_real_user());

CREATE POLICY ekub_members_participant_read ON public.ekub_members 
    FOR SELECT TO authenticated USING ((auth.uid() = user_id AND is_real_user()) OR is_admin());

CREATE POLICY chat_messages_participant_all ON public.chat_messages 
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

CREATE POLICY message_threads_participant_all ON public.message_threads 
    FOR ALL TO authenticated USING (((auth.uid() = user_a_id OR auth.uid() = user_b_id) AND is_real_user()) OR is_admin());

-- 7. DELIVERY: delivery_agents, delivery_dispatches, agent_telemetry
CREATE POLICY delivery_agents_discovery_read ON public.delivery_agents 
    FOR SELECT TO authenticated USING (is_real_user());
CREATE POLICY delivery_agents_self_all ON public.delivery_agents 
    FOR ALL TO authenticated USING ((id = auth.uid() AND is_real_user()) OR is_admin());

CREATE POLICY delivery_dispatches_participant_all ON public.delivery_dispatches 
    FOR ALL TO authenticated 
    USING (((auth.uid() = agent_id OR auth.uid() = merchant_id OR auth.uid() = citizen_id) AND is_real_user()) OR is_admin());

CREATE POLICY agent_telemetry_agent_all ON public.agent_telemetry 
    FOR ALL TO authenticated USING ((agent_id = auth.uid() AND is_real_user()) OR is_admin());

-- 8. SENSITIVE & INFRA (ADMIN ONLY): audit_logs, otp_challenges, rate_limits, client_error_logs, fayda_mock_registry
CREATE POLICY audit_logs_admin ON public.audit_logs FOR ALL TO authenticated USING (is_admin());
CREATE POLICY otp_challenges_admin ON public.otp_challenges FOR ALL TO authenticated USING (is_admin());
CREATE POLICY rate_limits_admin ON public.rate_limits FOR ALL TO authenticated USING (is_admin());
CREATE POLICY client_error_logs_admin ON public.client_error_logs FOR ALL TO authenticated USING (is_admin());
CREATE POLICY fayda_mock_registry_admin ON public.fayda_mock_registry FOR ALL TO authenticated USING (is_admin());

-- 9. STORAGE HARDENING
-- Drop all existing policies on objects
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- Public read for products and general media
CREATE POLICY storage_public_read ON storage.objects 
    FOR SELECT TO authenticated USING (bucket_id IN ('products', 'citylink-media') AND is_real_user());

-- Owner-only access for delivery proofs and sensitive docs
CREATE POLICY storage_owner_restricted ON storage.objects 
    FOR SELECT TO authenticated 
    USING ((bucket_id = 'delivery-proofs' AND (auth.uid() = owner::uuid OR is_admin())) OR is_admin());

-- General upload/manage policy for owners
CREATE POLICY storage_owner_manage ON storage.objects 
    FOR ALL TO authenticated 
    USING ((auth.uid() = owner::uuid AND is_real_user()) OR is_admin())
    WITH CHECK ((auth.uid() = owner::uuid AND is_real_user()) OR is_admin());

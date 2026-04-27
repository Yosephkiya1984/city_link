-- supabase/migrations/00000000000000_security_baseline.sql
-- ===========================================================================
-- SECURITY BASELINE: Live Database Sync
-- Generated to capture 'Ghost' RLS policies existing in Supabase Dashboard
-- but missing from the repository.
-- ===========================================================================

-- 1. ENUMS & TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('citizen', 'merchant', 'agent', 'admin', 'minister');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CORE SECURITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'minister')
  );
END;
$function$;

-- 3. ENABLE RLS ON ALL TABLES
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- 4. CAPTURED POLICIES (Sync from Live DB)

-- agent_telemetry
CREATE POLICY auth_only_select_agent_telemetry ON agent_telemetry FOR SELECT TO authenticated USING (((auth.jwt() ->> 'is_anonymous'::text))::boolean IS NOT TRUE);

-- app_config
CREATE POLICY auth_only_select_app_config ON app_config FOR SELECT TO authenticated USING (((auth.jwt() ->> 'is_anonymous'::text))::boolean IS NOT TRUE);

-- chat_messages (⚠️ Audit Warning: These are permissive and should be hardened)
CREATE POLICY public_insert_messages ON chat_messages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY public_select_messages ON chat_messages FOR SELECT TO public USING (true);

-- delala_listings
CREATE POLICY auth_only_select_delala_listings ON delala_listings FOR SELECT TO authenticated USING (((auth.jwt() ->> 'is_anonymous'::text))::boolean IS NOT TRUE);

-- delivery_agents
CREATE POLICY agents_insert_own_profile ON delivery_agents FOR INSERT TO public WITH CHECK ((id = auth.uid()) OR is_admin());
CREATE POLICY agents_update_own_profile ON delivery_agents FOR UPDATE TO public USING ((id = auth.uid()) OR is_admin());
CREATE POLICY public_select_delivery_agents ON delivery_agents FOR SELECT TO public USING (true);

-- delivery_dispatches
CREATE POLICY auth_only_select_delivery_dispatches ON delivery_dispatches FOR SELECT TO public USING ((( SELECT (auth.jwt() ->> 'is_anonymous'::text)))::boolean IS NOT TRUE);

-- disputes
CREATE POLICY auth_only_insert_disputes ON disputes FOR INSERT TO public WITH CHECK (( SELECT auth.uid() AS uid) IS NOT NULL);
CREATE POLICY auth_only_select_disputes ON disputes FOR SELECT TO public USING (( SELECT auth.uid() AS uid) IS NOT NULL);
CREATE POLICY disputes_select_policy ON disputes FOR SELECT TO public USING ((auth.uid() = buyer_id) OR (auth.uid() = merchant_id) OR is_admin());

-- escrows
CREATE POLICY escrows_parties ON escrows FOR SELECT TO public USING ((auth.uid() = buyer_id) OR (auth.uid() = merchant_id) OR is_admin());

-- fayda_mock_registry
CREATE POLICY auth_only_select_fayda_mock_registry ON fayda_mock_registry FOR SELECT TO authenticated USING (((auth.jwt() ->> 'is_anonymous'::text))::boolean IS NOT TRUE);
CREATE POLICY fayda_admin_only ON fayda_mock_registry FOR ALL TO public USING (is_admin());

-- food_items
CREATE POLICY auth_only_select_food_items ON food_items FOR SELECT TO authenticated USING (((auth.jwt() ->> 'is_anonymous'::text))::boolean IS NOT TRUE);

-- food_orders
CREATE POLICY auth_only_insert_food_orders ON food_orders FOR INSERT TO public WITH CHECK (( SELECT auth.uid() AS uid) IS NOT NULL);
CREATE POLICY auth_only_select_food_orders ON food_orders FOR SELECT TO public USING (( SELECT auth.uid() AS uid) IS NOT NULL);

-- kyc_verifications
CREATE POLICY kyc_verifications_owner ON kyc_verifications FOR SELECT TO public USING ((auth.uid() = user_id) OR is_admin());

-- marketplace_orders
CREATE POLICY marketplace_orders_parties ON marketplace_orders FOR ALL TO authenticated USING (((buyer_id = auth.uid()) OR (merchant_id = auth.uid()) OR (agent_id = auth.uid()) OR is_admin()) AND (((auth.jwt() ->> 'is_anonymous'::text))::boolean IS NOT TRUE));

-- marketplace_security_logs
CREATE POLICY "Admins can read security logs" ON marketplace_security_logs FOR SELECT TO public USING (auth.uid() IN ( SELECT profiles.id FROM profiles WHERE (profiles.role = 'admin'::user_role)));

-- merchants
CREATE POLICY merchants_modify_own ON merchants FOR ALL TO public USING ((auth.uid() = id) OR is_admin());
CREATE POLICY merchants_read_public ON merchants FOR SELECT TO public USING (true);

-- message_threads
CREATE POLICY public_insert_threads ON message_threads FOR INSERT TO public WITH CHECK (true);
CREATE POLICY public_select_threads ON message_threads FOR SELECT TO public USING (true);
CREATE POLICY public_update_threads ON message_threads FOR UPDATE TO public USING (true);

-- notifications
CREATE POLICY notifications_owner ON notifications FOR ALL TO public USING ((auth.uid() = user_id) OR is_admin());

-- parking_lots
CREATE POLICY parking_lots_merchant ON parking_lots FOR ALL TO authenticated USING (((merchant_id = auth.uid()) OR is_admin()) AND (((auth.jwt() ->> 'is_anonymous'::text))::boolean IS NOT TRUE));
CREATE POLICY parking_lots_read ON parking_lots FOR SELECT TO authenticated USING (((auth.jwt() ->> 'is_anonymous'::text))::boolean IS NOT TRUE);

-- products
CREATE POLICY "Owner Delete" ON products FOR DELETE TO authenticated USING (auth.uid() = merchant_id);
CREATE POLICY "Owner Update" ON products FOR UPDATE TO authenticated USING (auth.uid() = merchant_id) WITH CHECK (auth.uid() = merchant_id);
CREATE POLICY "Public Read" ON products FOR SELECT TO public USING (true);
CREATE POLICY products_insert_policy ON products FOR INSERT TO public WITH CHECK (auth.uid() = merchant_id);

-- profiles
CREATE POLICY profiles_admin ON profiles FOR ALL TO authenticated USING (is_admin() AND (((auth.jwt() ->> 'is_anonymous'::text))::boolean IS NOT TRUE));
CREATE POLICY profiles_public_insert ON profiles FOR INSERT TO public WITH CHECK ((auth.uid() = id) OR true);
CREATE POLICY profiles_read_all ON profiles FOR SELECT TO authenticated USING (((auth.jwt() ->> 'is_anonymous'::text))::boolean IS NOT TRUE);
CREATE POLICY profiles_read_discovery ON profiles FOR SELECT TO public USING (true);
CREATE POLICY profiles_self ON profiles FOR ALL TO authenticated USING ((auth.uid() = id) AND (((auth.jwt() ->> 'is_anonymous'::text))::boolean IS NOT TRUE));
CREATE POLICY profiles_self_update ON profiles FOR UPDATE TO public USING ((auth.uid() = id) OR is_admin());

-- transactions
CREATE POLICY transactions_owner ON transactions FOR SELECT TO public USING ((auth.uid() = user_id) OR is_admin());

-- wallets
CREATE POLICY wallets_owner ON wallets FOR SELECT TO public USING ((auth.uid() = user_id) OR is_admin());

-- withdrawal_requests
CREATE POLICY "Users can view own withdrawals" ON withdrawal_requests FOR SELECT TO public USING (auth.uid() = user_id);

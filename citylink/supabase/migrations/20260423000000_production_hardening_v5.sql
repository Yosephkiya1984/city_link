-- supabase/migrations/20260423000000_production_hardening_v5.sql

-- 1. Hardening food_orders RLS (Fixing privacy leak)
DROP POLICY IF EXISTS auth_only_select_food_orders ON food_orders;
CREATE POLICY food_orders_parties_policy ON food_orders
    FOR SELECT TO authenticated
    USING (
        citizen_id = auth.uid() 
        OR merchant_id = auth.uid() 
        OR agent_id = auth.uid() 
        OR is_admin()
    );

-- 2. Secure RPC for food order dispute resolution
CREATE OR REPLACE FUNCTION resolve_food_order_dispute(
    p_order_id UUID,
    p_resolution_type TEXT -- 'RELEASE' or 'REFUND'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_order RECORD;
    v_target_status TEXT;
BEGIN
    -- 🛡️ Auth Check: Only Admins/Ministers
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin privileges required.';
    END IF;

    -- Fetch order
    SELECT * INTO v_order FROM food_orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Order not found');
    END IF;

    IF v_order.status != 'DISPUTED' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Order is not in DISPUTED state');
    END IF;

    -- Map resolution to status
    IF p_resolution_type = 'REFUND' THEN
        v_target_status := 'CANCELLED';
    ELSIF p_resolution_type = 'RELEASE' THEN
        v_target_status := 'COMPLETED';
    ELSE
        RETURN jsonb_build_object('ok', false, 'error', 'Invalid resolution type');
    END IF;

    -- Update order
    UPDATE food_orders
    SET status = v_target_status,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 🛡️ TODO: Trigger ledger entries if applicable for food (e.g. payout to restaurant)
    -- For now, food orders are handled via external gateway logic, so state update is sufficient.

    RETURN jsonb_build_object(
        'ok', true,
        'order_id', p_order_id,
        'new_status', v_target_status
    );
END;
$$;

-- 3. Hardening products (Merchant-only update/delete)
DROP POLICY IF EXISTS "Owner Update" ON products;
CREATE POLICY products_owner_update_policy ON products
    FOR UPDATE TO authenticated
    USING (merchant_id = auth.uid() OR is_admin())
    WITH CHECK (merchant_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Owner Delete" ON products;
CREATE POLICY products_owner_delete_policy ON products
    FOR DELETE TO authenticated
    USING (merchant_id = auth.uid() OR is_admin());

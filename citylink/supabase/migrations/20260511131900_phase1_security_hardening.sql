-- Phase 1: Security Hardening Migration
-- Target: Function search_path hardening, View to TVF conversion, and PostGIS RLS enforcement.

-- 1. Function Hardening: SET search_path = public, pg_temp (or with extensions if needed)
-- This prevents search-path injection attacks in SECURITY DEFINER functions.

ALTER FUNCTION public.log_client_errors(jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.process_cart_checkout(uuid, jsonb, text, numeric) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.process_marketplace_purchase(uuid, uuid, uuid, integer, text, numeric, numeric, text) SET search_path = public, extensions, pg_temp;

-- Ensure all other SD functions found in the audit have pg_temp (most already do, but we verify and apply to be safe)
-- We'll explicitly apply it to those that might have been missed or had 'null' configuration.

-- 2. Convert SECURITY DEFINER views to Table-Valued Functions (TVFs)
-- This allows for better RLS enforcement and search_path protection.

-- marketplace_view conversion
CREATE OR REPLACE FUNCTION get_marketplace_orders()
RETURNS TABLE (
    id UUID,
    escrow_id UUID,
    buyer_id UUID,
    product_id UUID,
    shipping_address TEXT,
    tracking_number TEXT,
    created_at TIMESTAMPTZ,
    merchant_id UUID,
    product_name TEXT,
    qty INTEGER,
    quantity INTEGER,
    total NUMERIC,
    status TEXT,
    escrow_release_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    delivery_pin TEXT,
    expires_at TIMESTAMPTZ,
    idempotency_key TEXT,
    merchant_business_name TEXT
) 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT mo.id, mo.escrow_id, mo.buyer_id, mo.product_id, mo.shipping_address, mo.tracking_number, 
           mo.created_at, mo.merchant_id, mo.product_name, mo.qty, mo.qty, mo.total, mo.status, 
           mo.escrow_release_at, mo.updated_at, mo.delivery_pin, mo.expires_at, mo.idempotency_key, 
           m.business_name
    FROM marketplace_orders mo
    JOIN merchants m ON mo.merchant_id = m.id
    WHERE (mo.buyer_id = auth.uid() OR mo.merchant_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
END;
$$ LANGUAGE plpgsql;

-- merchant_transaction_history conversion
CREATE OR REPLACE FUNCTION get_merchant_transaction_history()
RETURNS TABLE (
    id UUID,
    merchant_id UUID,
    amount NUMERIC,
    type TEXT,
    category TEXT,
    description TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, w.user_id, t.amount, t.type, t.category, t.description, t.idempotency_key, t.created_at
    FROM transactions t
    JOIN wallets w ON w.id = t.wallet_id
    JOIN profiles p ON p.id = w.user_id
    WHERE p.id = auth.uid() AND p.role = 'merchant';
END;
$$ LANGUAGE plpgsql;

-- merchant_metrics conversion
CREATE OR REPLACE FUNCTION get_merchant_metrics()
RETURNS TABLE (
    merchant_id UUID,
    total_revenue NUMERIC,
    active_orders BIGINT,
    total_products BIGINT,
    low_stock_products BIGINT
)
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT p.merchant_id,
        COALESCE(sum(CASE WHEN mo.status = 'COMPLETED' THEN mo.total ELSE 0 END), 0),
        count(CASE WHEN mo.status NOT IN ('COMPLETED', 'CANCELLED', 'DISPUTED', 'REJECTED_BY_BUYER') THEN 1 END),
        count(DISTINCT CASE WHEN p.status <> 'removed' THEN p.id END),
        count(DISTINCT CASE WHEN p.status <> 'removed' AND p.stock <= 5 THEN p.id END)
    FROM products p
    LEFT JOIN marketplace_orders mo ON p.merchant_id = mo.merchant_id
    WHERE p.merchant_id = auth.uid() -- Enforce RLS
    GROUP BY p.merchant_id;
END;
$$ LANGUAGE plpgsql;

-- broker_reputation (Public view, but hardened)
CREATE OR REPLACE FUNCTION get_broker_reputation()
RETURNS TABLE (
    broker_id UUID,
    full_name TEXT,
    kyc_status kyc_status,
    credit_score INTEGER,
    phone TEXT,
    primary_subcity TEXT,
    successful_escrows BIGINT,
    quality_escrow_score BIGINT,
    trust_rank NUMERIC
)
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH valid_escrows AS (
        SELECT e.merchant_id, e.id, e.buyer_id,
               (EXTRACT(epoch FROM (e.resolved_at - e.created_at)) / 60) AS duration_minutes
        FROM escrows e
        WHERE e.status = 'RELEASED'
    )
    SELECT p.id, p.full_name, p.kyc_status, p.credit_score, p.phone, p.subcity,
           count(ve.id),
           count(DISTINCT ve.buyer_id) FILTER (WHERE ve.duration_minutes > 30),
           COALESCE((
               (CASE WHEN p.kyc_status = 'VERIFIED' THEN 30 ELSE 0 END)::numeric + 
               ((p.credit_score::numeric / 850.0) * 30) + 
               ((LEAST(count(DISTINCT ve.buyer_id) FILTER (WHERE ve.duration_minutes > 30), 15))::numeric * 2.6) + 
               (LEAST(EXTRACT(days FROM (now() - p.created_at)), 365) / 36.5)
           ), 0)
    FROM profiles p
    LEFT JOIN valid_escrows ve ON ve.merchant_id = p.id
    WHERE p.role = 'merchant'
    GROUP BY p.id;
END;
$$ LANGUAGE plpgsql;

-- Final dynamic hardening pass
DO $$
DECLARE
    func_name RECORD;
BEGIN
    FOR func_name IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.prosecdef = true 
        AND (p.proconfig IS NULL OR NOT (p.proconfig @> ARRAY['search_path=public, pg_temp']))
        AND p.proname NOT IN ('st_estimatedextent')
    LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp', func_name.proname, func_name.args);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not harden function %: %', func_name.proname, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- Phase 1: Security Hardening Migration (Part 2)
-- Remaining View to TVF conversions

-- low_stock_alerts conversion
CREATE OR REPLACE FUNCTION get_low_stock_alerts()
RETURNS TABLE (
    stock_id UUID,
    merchant_id UUID,
    item_name TEXT,
    quantity NUMERIC,
    unit TEXT,
    min_threshold NUMERIC,
    marketplace_product_id UUID,
    current_market_price NUMERIC,
    product_image TEXT
)
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.merchant_id, s.item_name, s.quantity, s.unit, s.min_threshold,
           p.id, p.price, p.image_url
    FROM restaurant_stock s
    LEFT JOIN products p ON (
        (lower(p.name) LIKE '%' || lower(s.item_name) || '%' OR lower(s.item_name) LIKE '%' || lower(p.name) || '%')
        AND p.status = 'active'
    )
    WHERE (s.quantity <= s.min_threshold)
    AND (s.merchant_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
END;
$$ LANGUAGE plpgsql;

-- merchant_parking_ledger conversion
CREATE OR REPLACE FUNCTION get_merchant_parking_ledger()
RETURNS TABLE (
    session_id UUID,
    merchant_id UUID,
    user_id UUID,
    user_name TEXT,
    vehicle_plate TEXT,
    status TEXT,
    payment_method TEXT,
    digital_revenue NUMERIC,
    cash_revenue NUMERIC,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT ps.id, ps.merchant_id, ps.user_id, p.full_name, ps.plate, ps.status, ps.payment_method::text,
           CASE WHEN ps.payment_method = 'WALLET' THEN ps.calculated_cost ELSE 0 END,
           CASE WHEN ps.payment_method = 'CASH' THEN ps.cash_received_amount ELSE 0 END,
           ps.start_time, ps.end_time
    FROM parking_sessions ps
    LEFT JOIN profiles p ON ps.user_id = p.id
    WHERE (ps.merchant_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
END;
$$ LANGUAGE plpgsql;

-- merchant_sales_history_7d conversion
CREATE OR REPLACE FUNCTION get_merchant_sales_history_7d()
RETURNS TABLE (
    merchant_id UUID,
    day DATE,
    total NUMERIC
)
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT mo.merchant_id, (date_trunc('day', mo.created_at))::date, COALESCE(sum(mo.total), 0)
    FROM marketplace_orders mo
    WHERE mo.status = ANY (ARRAY['PAID', 'DISPATCHING', 'AGENT_ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'AWAITING_PIN', 'COMPLETED'])
    AND (mo.merchant_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
    GROUP BY mo.merchant_id, (date_trunc('day', mo.created_at))::date;
END;
$$ LANGUAGE plpgsql;

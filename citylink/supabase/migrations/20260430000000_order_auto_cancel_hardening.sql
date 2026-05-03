-- supabase/migrations/20260430000000_order_auto_cancel_hardening.sql
-- Implements the 3-hour auto-cancel requirement for Marketplace orders

-- 1. Update the table default to 3 hours (previously 72 hours)
ALTER TABLE public.marketplace_orders 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '3 hours');

-- 2. Create the auto-cleanup function
-- This function can be called by an Edge Function cron job or manual trigger
CREATE OR REPLACE FUNCTION public.cleanup_expired_marketplace_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_order_id text;
    v_count int := 0;
    v_res jsonb;
BEGIN
    FOR v_order_id IN 
        SELECT id::text 
        FROM public.marketplace_orders 
        WHERE status IN ('PAID', 'DISPATCHING') 
          AND expires_at < now()
    LOOP
        -- Re-use the existing hardened cancel & refund logic
        SELECT public.cancel_and_refund_marketplace_order(v_order_id, 'Auto-cancelled: Merchant did not ship within 3 hours') INTO v_res;
        IF (v_res->>'ok')::boolean THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('ok', true, 'cancelled_count', v_count);
END;
$function$;

-- 3. Hardening: Update existing purchase logic to explicitly use 3 hours
-- We update both single-item and cart-based checkout functions

-- Update single purchase
CREATE OR REPLACE FUNCTION public.process_marketplace_purchase(p_buyer_id uuid, p_product_id uuid, p_merchant_id uuid, p_qty integer, p_shipping_address text, p_delivery_fee numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_name text;
  v_price numeric;
  v_total numeric;
  v_balance numeric;
  v_agent_fee numeric;
  v_platform_fee numeric;
  v_order_id uuid := gen_random_uuid();
  v_escrow_id uuid := gen_random_uuid();
  v_idempotency_key text := 'mkt-' || v_order_id::text;
  v_pickup_pin varchar(6);
BEGIN
  -- 1. Auth Check
  IF auth.uid() <> p_buyer_id AND NOT is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  -- 2. Fetch Product Data
  SELECT name, price INTO v_product_name, v_price 
  FROM public.products 
  WHERE id = p_product_id;

  IF v_product_name IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'product_not_found');
  END IF;

  -- Fee Validation (max 20% of subtotal)
  IF p_delivery_fee > (v_price * p_qty * 0.20) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Delivery fee exceeds maximum allowed percentage');
  END IF;

  v_total := (v_price * p_qty) + COALESCE(p_delivery_fee, 0);
  v_agent_fee := COALESCE(p_delivery_fee, 0);
  v_platform_fee := ROUND((v_price * p_qty) * 0.05, 2);

  v_pickup_pin := lpad(floor(random() * 1000000)::text, 6, '0');

  -- 3. Lock Buyer Wallet
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_buyer_id FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  END IF;

  IF v_balance < v_total THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  END IF;

  -- 4. Check & Decrement Stock
  IF NOT (SELECT (public.decrement_stock(p_product_id, p_qty))->>'ok')::boolean THEN
    RETURN jsonb_build_object('ok', false, 'error', 'out_of_stock');
  END IF;

  -- 5. Deduct Balance
  UPDATE public.wallets SET balance = balance - v_total, updated_at = now() 
  WHERE user_id = p_buyer_id;

  -- 6. Create Escrow
  INSERT INTO public.escrows (
    id, buyer_id, merchant_id, amount, service_type, status, created_at, updated_at
  )
  VALUES (
    v_escrow_id, p_buyer_id, p_merchant_id, v_total, 'marketplace', 'LOCKED', now(), now()
  );

  -- 7. Create Order (Using 3 hours expiration)
  INSERT INTO public.marketplace_orders (
    id, escrow_id, buyer_id, merchant_id, product_id, product_name, 
    qty, quantity, total, status, shipping_address, 
    created_at, updated_at, expires_at, idempotency_key, pickup_pin, agent_fee, platform_fee
  )
  VALUES (
    v_order_id::text, v_escrow_id, p_buyer_id, p_merchant_id, p_product_id, v_product_name, 
    p_qty, p_qty, v_total, 'PAID', p_shipping_address, 
    now(), now(), now() + INTERVAL '3 hours', v_idempotency_key, v_pickup_pin, v_agent_fee, v_platform_fee
  );

  RETURN jsonb_build_object(
    'ok', true, 
    'order_id', v_order_id,
    'total', v_total,
    'new_balance', v_balance - v_total
  );
END;
$function$;

-- Update cart checkout
CREATE OR REPLACE FUNCTION public.process_cart_checkout(
    p_buyer_id uuid,
    p_items jsonb,
    p_total_delivery_fee numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_item           record;
    v_product        record;
    v_total_product_price numeric := 0;
    v_grand_total    numeric := 0;
    v_balance        numeric;
    v_merchant_count int;
    v_fee_per_merchant numeric;
    v_order_id       uuid;
    v_escrow_id      uuid;
    v_idempotency_prefix text := 'cart-' || encode(gen_random_bytes(6), 'hex');
    v_pickup_pin     text;
BEGIN
    IF auth.uid() <> p_buyer_id AND NOT is_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;

    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_buyer_id FOR UPDATE;
    IF v_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'wallet_not_found');
    END IF;

    SELECT COUNT(DISTINCT (item->>'merchant_id')) INTO v_merchant_count
    FROM (
        SELECT p.merchant_id
        FROM jsonb_array_elements(p_items) AS item_json
        JOIN public.products p ON p.id = (item_json->>'product_id')::uuid
    ) x;

    IF v_merchant_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'empty_cart');
    END IF;

    IF p_total_delivery_fee < (v_merchant_count * 150) THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_delivery_fee');
    END IF;

    v_fee_per_merchant := p_total_delivery_fee / v_merchant_count;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT * INTO v_product FROM public.products WHERE id = (v_item.value->>'product_id')::uuid FOR UPDATE;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'product_not_found', 'id', v_item.value->>'product_id');
        END IF;
        IF v_product.stock < (v_item.value->>'qty')::int THEN
            RETURN jsonb_build_object('success', false, 'error', 'out_of_stock', 'product', v_product.name);
        END IF;
        IF v_product.price <> (v_item.value->>'expected_price')::numeric THEN
            RETURN jsonb_build_object('success', false, 'error', 'price_mismatch', 'product', v_product.name, 'current_price', v_product.price);
        END IF;
        v_total_product_price := v_total_product_price + (v_product.price * (v_item.value->>'qty')::int);
    END LOOP;

    v_grand_total := v_total_product_price + p_total_delivery_fee;

    IF v_balance < v_grand_total THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance', 'required', v_grand_total);
    END IF;

    UPDATE public.wallets SET balance = balance - v_grand_total, updated_at = now() WHERE user_id = p_buyer_id;

    FOR v_item IN (
        SELECT 
            p.merchant_id,
            jsonb_agg(item_json) as items,
            SUM(p.price * (item_json->>'qty')::int) as subtotal
        FROM jsonb_array_elements(p_items) AS item_json
        JOIN public.products p ON p.id = (item_json->>'product_id')::uuid
        GROUP BY p.merchant_id
    ) LOOP
        v_order_id := gen_random_uuid();
        v_escrow_id := gen_random_uuid();
        v_pickup_pin := lpad(floor(random() * 1000000)::text, 6, '0');

        INSERT INTO public.escrows (id, buyer_id, merchant_id, amount, service_type, status)
        VALUES (v_escrow_id, p_buyer_id, v_item.merchant_id, v_item.subtotal + v_fee_per_merchant, 'marketplace', 'LOCKED');

        INSERT INTO public.marketplace_orders (
            id, escrow_id, buyer_id, merchant_id, product_name, qty, total, 
            status, idempotency_key, pickup_pin, agent_fee, platform_fee, expires_at
        )
        VALUES (
            v_order_id::text, v_escrow_id, p_buyer_id, v_item.merchant_id,
            'Multi-item Order',
            (SELECT SUM((i->>'qty')::int) FROM jsonb_array_elements(v_item.items) i),
            v_item.subtotal + v_fee_per_merchant,
            'PAID',
            v_idempotency_prefix || '-' || v_item.merchant_id,
            v_pickup_pin,
            v_fee_per_merchant,
            v_item.subtotal * 0.05,
            now() + interval '3 hours' -- 🛡️ Hardened for 3-hour auto-cancel
        );

        FOR v_product IN SELECT * FROM jsonb_array_elements(v_item.items) LOOP
            UPDATE public.products 
            SET stock = stock - (v_product->>'qty')::int, 
                updated_at = now() 
            WHERE id = (v_product->>'product_id')::uuid;
        END LOOP;
    END LOOP;

    INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, idempotency_key)
    VALUES (gen_random_uuid(), (SELECT id FROM public.wallets WHERE user_id = p_buyer_id), v_grand_total, 'debit', 'marketplace_purchase', 'Cart Checkout', v_idempotency_prefix);

    RETURN jsonb_build_object('success', true, 'total_deducted', v_grand_total, 'order_count', v_merchant_count);
END;
$function$;

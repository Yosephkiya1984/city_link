-- supabase/migrations/20260427160000_hardened_cart_checkout.sql
-- Unified, atomic, and multi-merchant aware cart checkout

DROP FUNCTION IF EXISTS public.process_cart_checkout(uuid, jsonb, numeric);

CREATE OR REPLACE FUNCTION public.process_cart_checkout(
    p_buyer_id uuid,
    p_items jsonb, -- [{product_id, qty, expected_price}]
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
    -- 1. AUTH & LOCKING
    IF auth.uid() <> p_buyer_id AND NOT is_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;

    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_buyer_id FOR UPDATE;
    IF v_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'wallet_not_found');
    END IF;

    -- 2. VALIDATION & PRE-CALCULATION
    -- Calculate unique merchants
    SELECT COUNT(DISTINCT (item->>'merchant_id')) INTO v_merchant_count
    FROM (
        SELECT p.merchant_id
        FROM jsonb_array_elements(p_items) AS item_json
        JOIN public.products p ON p.id = (item_json->>'product_id')::uuid
    ) x;

    IF v_merchant_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'empty_cart');
    END IF;

    -- Verify total delivery fee matches our business logic (150 per shop)
    -- This prevents frontend tampering
    IF p_total_delivery_fee < (v_merchant_count * 150) THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_delivery_fee');
    END IF;

    v_fee_per_merchant := p_total_delivery_fee / v_merchant_count;

    -- 3. ATOMIC STOCK & PRICE CHECK
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

    -- 4. EXECUTION (The Actual Work)
    -- Deduct Wallet
    UPDATE public.wallets SET balance = balance - v_grand_total, updated_at = now() WHERE user_id = p_buyer_id;

    -- Group and Create Orders
    -- We'll group by merchant_id and create one order per merchant
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

        -- Create Escrow (Subtotal + Per-Merchant Delivery Fee)
        INSERT INTO public.escrows (id, buyer_id, merchant_id, amount, service_type, status)
        VALUES (v_escrow_id, p_buyer_id, v_item.merchant_id, v_item.subtotal + v_fee_per_merchant, 'marketplace', 'LOCKED');

        -- Create Order record
        INSERT INTO public.marketplace_orders (
            id, escrow_id, buyer_id, merchant_id, product_name, qty, total, 
            status, idempotency_key, pickup_pin, agent_fee, platform_fee
        )
        VALUES (
            v_order_id::text, v_escrow_id, p_buyer_id, v_item.merchant_id,
            'Multi-item Order', -- Aggregated name
            (SELECT SUM((i->>'qty')::int) FROM jsonb_array_elements(v_item.items) i),
            v_item.subtotal + v_fee_per_merchant,
            'PAID',
            v_idempotency_prefix || '-' || v_item.merchant_id,
            v_pickup_pin,
            v_fee_per_merchant,
            v_item.subtotal * 0.05 -- 5% Platform commission
        );

        -- Decrement Stocks
        FOR v_product IN SELECT * FROM jsonb_array_elements(v_item.items) LOOP
            UPDATE public.products 
            SET stock = stock - (v_product->>'qty')::int, 
                updated_at = now() 
            WHERE id = (v_product->>'product_id')::uuid;
        END LOOP;
    END LOOP;

    -- 5. AUDIT LOG
    INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, idempotency_key)
    VALUES (gen_random_uuid(), (SELECT id FROM public.wallets WHERE user_id = p_buyer_id), v_grand_total, 'debit', 'marketplace_purchase', 'Cart Checkout', v_idempotency_prefix);

    RETURN jsonb_build_object('success', true, 'total_deducted', v_grand_total, 'order_count', v_merchant_count);
END;
$function$;

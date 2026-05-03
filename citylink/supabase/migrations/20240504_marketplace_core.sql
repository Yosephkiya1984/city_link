-- Marketplace Core RPCs
-- Restored and Hardened on 2024-05-04

-- 1. confirm_order_pickup
-- Hardened with CSPRNG for PIN generation
CREATE OR REPLACE FUNCTION public.confirm_order_pickup(
  p_order_id text,
  p_merchant_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_record record;
  v_pickup_pin text;
BEGIN
  SELECT * INTO v_order_record
  FROM marketplace_orders
  WHERE id = p_order_id AND merchant_id = p_merchant_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF v_order_record.status NOT IN ('PAID', 'DISPATCHING', 'AGENT_ASSIGNED') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_order_status');
  END IF;

  v_pickup_pin := v_order_record.pickup_pin;
  IF v_pickup_pin IS NULL OR v_pickup_pin = '' THEN
    v_pickup_pin := encode(gen_random_bytes(3), 'hex');
  END IF;

  UPDATE marketplace_orders
  SET 
    status = 'SHIPPED',
    pickup_pin = v_pickup_pin,
    merchant_confirmed_pickup = true,
    picked_up_at = now(),
    updated_at = now()
  WHERE id = p_order_id;

  RETURN json_build_object('ok', true, 'pickup_pin', v_pickup_pin);
END;
$$;

-- 2. release_escrow
-- 4-arg version, hardened with status guards and dispute checks
CREATE OR REPLACE FUNCTION public.release_escrow(
  p_escrow_id text,
  p_order_id text,
  p_release_method text,
  p_delivery_pin text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow RECORD; v_order RECORD;
  v_merch_wallet_id UUID; v_agent_wallet_id UUID; v_treasury_id UUID;
  v_merch_share DECIMAL; v_agent_share DECIMAL; v_platform_fee DECIMAL;
  v_dispute_count INTEGER;
BEGIN
  SELECT * INTO v_escrow FROM public.escrows WHERE id::TEXT = p_escrow_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'escrow_not_found'); END IF;
  IF v_escrow.status <> 'LOCKED' THEN RETURN json_build_object('ok', false, 'error', 'escrow_already_processed'); END IF;

  SELECT * INTO v_order FROM public.marketplace_orders WHERE id::TEXT = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'order_not_found'); END IF;

  SELECT count(*) INTO v_dispute_count FROM public.disputes WHERE order_id = v_order.id AND status = 'OPEN';
  IF v_dispute_count > 0 THEN
    RETURN json_build_object('ok', false, 'error', 'order_has_open_dispute');
  END IF;

  IF v_order.status NOT IN ('AWAITING_PIN', 'IN_TRANSIT', 'SHIPPED', 'COMPLETED') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status_for_escrow_release');
  END IF;

  IF p_release_method = 'delivery_pin' THEN
    IF v_order.delivery_pin IS NULL OR v_order.delivery_pin <> p_delivery_pin THEN
      UPDATE marketplace_orders 
      SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
          is_locked = CASE WHEN COALESCE(failed_pin_attempts, 0) + 1 >= 5 THEN true ELSE false END
      WHERE id = v_order.id;
      RETURN json_build_object('ok', false, 'error', 'invalid_pin');
    END IF;
  END IF;

  SELECT id INTO v_merch_wallet_id FROM public.wallets WHERE user_id = v_escrow.merchant_id;
  SELECT id INTO v_agent_wallet_id FROM public.wallets WHERE user_id = v_order.agent_id;
  SELECT id INTO v_treasury_id FROM public.wallets WHERE user_id = '00000000-0000-0000-0000-000000000000';

  IF v_merch_wallet_id IS NULL OR v_treasury_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'wallet_missing');
  END IF;

  v_agent_share := COALESCE(v_order.agent_fee, 0);
  v_platform_fee := COALESCE(v_order.platform_fee, 0);
  v_merch_share := v_escrow.amount - v_agent_share - v_platform_fee;

  UPDATE public.wallets SET balance = balance + v_merch_share, updated_at = now() WHERE id = v_merch_wallet_id;
  INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
  VALUES (gen_random_uuid(), v_merch_wallet_id, v_merch_share, 'credit', 'marketplace_payout', 'Sale: ' || v_order.product_name, now(), 'merch-' || p_order_id);

  IF v_order.agent_id IS NOT NULL AND v_agent_wallet_id IS NOT NULL AND v_agent_share > 0 THEN
    UPDATE public.wallets SET balance = balance + v_agent_share, updated_at = now() WHERE id = v_agent_wallet_id;
    INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
    VALUES (gen_random_uuid(), v_agent_wallet_id, v_agent_share, 'credit', 'delivery_earning', 'Delivery: ' || v_order.product_name, now(), 'agent-' || p_order_id);
  END IF;

  UPDATE public.wallets SET balance = balance + v_platform_fee, updated_at = now() WHERE id = v_treasury_id;
  INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
  VALUES (gen_random_uuid(), v_treasury_id, v_platform_fee, 'credit', 'platform_fee', 'Platform Fee: ' || p_order_id, now(), 'fee-' || p_order_id);

  UPDATE public.escrows SET status = 'RELEASED', release_method = p_release_method, resolved_at = now(), updated_at = now() WHERE id::TEXT = p_escrow_id;
  UPDATE public.marketplace_orders SET status = 'COMPLETED', updated_at = now(), delivered_at = now() WHERE id = v_order.id;

  RETURN json_build_object('ok', true, 'merchant_share', v_merch_share);
END;
$$;

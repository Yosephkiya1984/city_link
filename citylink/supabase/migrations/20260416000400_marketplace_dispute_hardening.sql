-- Marketplace dispute and pickup hardening
-- Fixes confirm_order_pickup authorization and dispute resolution edge cases.

DROP FUNCTION IF EXISTS public.confirm_order_pickup(text, uuid);
DROP FUNCTION IF EXISTS public.resolve_marketplace_dispute(text, text);

CREATE OR REPLACE FUNCTION public.confirm_order_pickup(
  p_order_id text,
  p_user_id uuid
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_delivery_pin text;
  v_final_status text;
BEGIN
  SELECT * INTO v_order FROM public.marketplace_orders WHERE id::text = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF p_user_id <> v_order.merchant_id
     AND p_user_id <> v_order.agent_id
     AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF v_order.status NOT IN ('PAID', 'DISPATCHING', 'AGENT_ASSIGNED') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status_for_pickup');
  END IF;

  IF v_order.delivery_pin IS NULL OR v_order.delivery_pin = '' THEN
    v_delivery_pin := lpad(floor(random() * 1000000)::text, 6, '0');
  ELSE
    v_delivery_pin := v_order.delivery_pin;
  END IF;

  IF p_user_id = v_order.merchant_id OR v_order.agent_id IS NULL THEN
    UPDATE public.marketplace_orders
    SET merchant_confirmed_pickup = true,
        delivery_pin = v_delivery_pin,
        updated_at = now()
    WHERE id::text = p_order_id;
  ELSE
    UPDATE public.marketplace_orders
    SET agent_confirmed_pickup = true,
        delivery_pin = v_delivery_pin,
        updated_at = now()
    WHERE id::text = p_order_id;
  END IF;

  SELECT merchant_confirmed_pickup, agent_confirmed_pickup, status, agent_id
  INTO v_order
  FROM public.marketplace_orders
  WHERE id::text = p_order_id;

  IF v_order.agent_confirmed_pickup = true
     AND (v_order.merchant_confirmed_pickup = true OR v_order.agent_id IS NULL) THEN
    UPDATE public.marketplace_orders
    SET status = 'SHIPPED', updated_at = now()
    WHERE id::text = p_order_id;
    v_final_status := 'SHIPPED';
  ELSE
    v_final_status := v_order.status;
  END IF;

  RETURN json_build_object('ok', true, 'status', v_final_status, 'delivery_pin', v_delivery_pin);
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_marketplace_dispute(p_order_id text, p_resolution_type text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $function$
 DECLARE
   v_order           RECORD;
   v_escrow          RECORD;
   v_merch_wallet_id UUID;
   v_agent_wallet_id UUID;
   v_buyer_wallet_id UUID;
   v_treasury_id     UUID;
   v_agent_share     NUMERIC;
   v_platform_fee    NUMERIC;
   v_merch_share     NUMERIC;
   v_buyer_refund    NUMERIC := 0;
   v_order_status    TEXT;
   v_escrow_status   TEXT := 'RELEASED';
 BEGIN
   IF NOT is_admin() THEN
     RETURN json_build_object('ok', false, 'error', 'unauthorized_admin_only');
   END IF;
 
   SELECT * INTO v_order FROM public.marketplace_orders WHERE id::text = p_order_id FOR UPDATE;
   IF NOT FOUND THEN
     RETURN json_build_object('ok', false, 'error', 'order_not_found');
   END IF;

   IF v_order.status NOT IN ('DISPUTED', 'REJECTED_BY_BUYER') THEN
     RETURN json_build_object('ok', false, 'error', 'order_not_in_dispute');
   END IF;
 
   SELECT * INTO v_escrow FROM public.escrows WHERE id = v_order.escrow_id FOR UPDATE;
   IF NOT FOUND OR v_escrow.status <> 'LOCKED' THEN
     RETURN json_build_object('ok', false, 'error', 'escrow_invalid_or_released');
   END IF;
 
   SELECT id INTO v_merch_wallet_id FROM public.wallets WHERE user_id = v_order.merchant_id;
   SELECT id INTO v_buyer_wallet_id FROM public.wallets WHERE user_id = v_order.buyer_id;
   SELECT id INTO v_treasury_id     FROM public.wallets WHERE user_id = '00000000-0000-0000-0000-000000000000';
 
   v_agent_share  := COALESCE(v_order.agent_fee, 0);
   v_platform_fee := COALESCE(v_order.platform_fee, 0);
   v_merch_share  := v_escrow.amount - v_agent_share - v_platform_fee;
 
   IF v_order.agent_id IS NOT NULL AND v_agent_share > 0 THEN
     SELECT id INTO v_agent_wallet_id FROM public.wallets WHERE user_id = v_order.agent_id;
     IF v_agent_wallet_id IS NULL THEN
       RETURN json_build_object('ok', false, 'error', 'agent_wallet_missing');
     END IF;
   END IF;
 
   IF v_buyer_wallet_id IS NULL OR v_merch_wallet_id IS NULL OR v_treasury_id IS NULL THEN
     RETURN json_build_object('ok', false, 'error', 'missing_wallets_on_dispute_resolution');
   END IF;
 
   IF p_resolution_type = 'BUYER_FAULT' THEN
     v_order_status := 'COMPLETED';
     UPDATE public.wallets SET balance = balance + v_merch_share WHERE id = v_merch_wallet_id;
     IF v_agent_wallet_id IS NOT NULL AND v_agent_share > 0 THEN
       UPDATE public.wallets SET balance = balance + v_agent_share WHERE id = v_agent_wallet_id;
     END IF;
     UPDATE public.wallets SET balance = balance + v_platform_fee WHERE id = v_treasury_id;
     v_escrow_status := 'RELEASED';
 
     INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
     VALUES (gen_random_uuid(), v_merch_wallet_id, v_merch_share, 'credit', 'marketplace_payout', 'Dispute Resolved: Sale Credit', now(), 'merch-resolve-' || p_order_id);
 
     INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
     VALUES (gen_random_uuid(), v_treasury_id, v_platform_fee, 'credit', 'platform_fee', 'Dispute Resolved: Platform Fee', now(), 'fee-resolve-' || p_order_id);
 
     IF v_agent_wallet_id IS NOT NULL AND v_agent_share > 0 THEN
       INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
       VALUES (gen_random_uuid(), v_agent_wallet_id, v_agent_share, 'credit', 'delivery_earning', 'Dispute Resolved: Delivery Earnings', now(), 'agent-resolve-' || p_order_id);
     END IF;
 
   ELSIF p_resolution_type = 'MERCHANT_AT_FAULT' THEN
     v_order_status := 'CANCELLED';
     UPDATE public.wallets SET balance = balance + v_escrow.amount WHERE id = v_buyer_wallet_id;
     IF v_agent_wallet_id IS NOT NULL AND v_agent_share > 0 THEN
       UPDATE public.wallets SET balance = balance + v_agent_share WHERE id = v_agent_wallet_id;
     END IF;
     UPDATE public.wallets SET balance = balance + v_platform_fee WHERE id = v_treasury_id;
     UPDATE public.wallets SET balance = balance - (v_agent_share + v_platform_fee) WHERE id = v_merch_wallet_id;
     v_buyer_refund := v_escrow.amount;
     v_escrow_status := 'REFUNDED';
 
     INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
     VALUES (gen_random_uuid(), v_buyer_wallet_id, v_escrow.amount, 'credit', 'refund', 'Dispute Resolved: Full Refund', now(), 'buyer-refund-' || p_order_id);
 
     INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
     VALUES (gen_random_uuid(), v_treasury_id, v_platform_fee, 'credit', 'platform_fee', 'Dispute Resolved: Platform Fee', now(), 'fee-resolve-' || p_order_id);
 
     INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
     VALUES (gen_random_uuid(), v_merch_wallet_id, (v_agent_share + v_platform_fee) * -1, 'debit', 'penalty', 'Dispute Resolved: Fee Liability', now(), 'merch-penalty-' || p_order_id);
 
     IF v_agent_wallet_id IS NOT NULL AND v_agent_share > 0 THEN
       INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
       VALUES (gen_random_uuid(), v_agent_wallet_id, v_agent_share, 'credit', 'delivery_earning', 'Dispute Resolved: Delivery Earnings', now(), 'agent-resolve-' || p_order_id);
     END IF;
 
   ELSIF p_resolution_type = 'ORDER_CANCELLED_REFUND' THEN
     v_order_status := 'CANCELLED';
     UPDATE public.wallets SET balance = balance + v_escrow.amount WHERE id = v_buyer_wallet_id;
     v_buyer_refund := v_escrow.amount;
     v_escrow_status := 'REFUNDED';
 
     INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
     VALUES (gen_random_uuid(), v_buyer_wallet_id, v_escrow.amount, 'credit', 'refund', 'Order Aborted: Full Refund', now(), 'buyer-abort-' || p_order_id);
 
   ELSE
     RETURN json_build_object('ok', false, 'error', 'invalid_resolution_type');
   END IF;
 
   UPDATE public.escrows
   SET status = v_escrow_status,
       resolved_at = now(),
       updated_at = now()
   WHERE id = v_escrow.id;
 
   UPDATE public.marketplace_orders
   SET status = v_order_status,
       updated_at = now()
   WHERE id = v_order.id;
 
   UPDATE public.disputes
   SET status = 'CLOSED',
       resolution_path = p_resolution_type,
       updated_at = now()
   WHERE order_id = v_order.id
     AND status = 'OPEN';
 
   RETURN json_build_object('ok', true, 'resolution', p_resolution_type, 'buyer_refunded', v_buyer_refund, 'status', v_order_status);
 END;
 $function$;

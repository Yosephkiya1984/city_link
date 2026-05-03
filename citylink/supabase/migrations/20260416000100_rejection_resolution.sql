-- New RPC: resolve_marketplace_dispute (Admin Only) - HARDENED VERSION
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
   v_buyer_refund    NUMERIC;
   v_order_status    TEXT;
 BEGIN
   -- 1. Auth Check (Admin Only)
   IF NOT is_admin() THEN
     RETURN json_build_object('ok', false, 'error', 'unauthorized_admin_only');
   END IF;
 
   -- 2. Fetch Order & Escrow
   SELECT * INTO v_order FROM public.marketplace_orders WHERE id::text = p_order_id FOR UPDATE;
   IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'order_not_found'); END IF;
 
   SELECT * INTO v_escrow FROM public.escrows WHERE id = v_order.escrow_id FOR UPDATE;
   IF NOT FOUND OR v_escrow.status <> 'LOCKED' THEN
     RETURN json_build_object('ok', false, 'error', 'escrow_invalid_or_released');
   END IF;
 
   -- 3. Setup Wallet IDs
   SELECT id INTO v_merch_wallet_id FROM public.wallets WHERE user_id = v_order.merchant_id;
   SELECT id INTO v_agent_wallet_id FROM public.wallets WHERE user_id = v_order.agent_id;
   SELECT id INTO v_buyer_wallet_id FROM public.wallets WHERE user_id = v_order.buyer_id;
   SELECT id INTO v_treasury_id     FROM public.wallets WHERE user_id = '00000000-0000-0000-0000-000000000000';
 
   -- Wallet validation
   IF v_buyer_wallet_id IS NULL OR v_merch_wallet_id IS NULL OR v_treasury_id IS NULL OR v_agent_wallet_id IS NULL THEN
     RETURN json_build_object('ok', false, 'error', 'missing_wallets_on_dispute_resolution');
   END IF;

   v_agent_share  := COALESCE(v_order.agent_fee, 0);
   v_platform_fee := COALESCE(v_order.platform_fee, 0);
   v_merch_share  := v_escrow.amount - v_agent_share - v_platform_fee;
 
   -- 4. Payout Logic based on resolution_type
   IF p_resolution_type = 'BUYER_FAULT' THEN
     v_order_status := 'COMPLETED';
     -- Merchant gets product cost, Agent/Platform paid. Buyer gets zero.
     UPDATE public.wallets SET balance = balance + v_merch_share WHERE id = v_merch_wallet_id;
     UPDATE public.wallets SET balance = balance + v_agent_share WHERE id = v_agent_wallet_id;
     UPDATE public.wallets SET balance = balance + v_platform_fee WHERE id = v_treasury_id;
     
     INSERT INTO transactions (wallet_id, amount, type, category, description, idempotency_key)
     VALUES 
       (v_merch_wallet_id, v_merch_share, 'credit', 'marketplace_payout', 'Dispute Resolved: Sale Credit', 'merch-resolve-' || p_order_id),
       (v_agent_wallet_id, v_agent_share, 'credit', 'delivery_earning', 'Dispute Resolved: Delivery Earnings', 'agent-resolve-' || p_order_id),
       (v_treasury_id, v_platform_fee, 'credit', 'platform_fee', 'Dispute Resolved: Platform Fee', 'fee-resolve-' || p_order_id);
     
     v_buyer_refund := 0;
 
   ELSIF p_resolution_type = 'MERCHANT_AT_FAULT' THEN
     v_order_status := 'CANCELLED';
     -- Buyer gets FULL refund. Agent and platform still paid (Merchant is billed for the labor and fee).
     UPDATE public.wallets SET balance = balance + v_escrow.amount WHERE id = v_buyer_wallet_id;
     UPDATE public.wallets SET balance = balance + v_agent_share WHERE id = v_agent_wallet_id;
     UPDATE public.wallets SET balance = balance + v_platform_fee WHERE id = v_treasury_id;
     -- Penalty to merchant to cover the agent's labor and platform fee
     UPDATE public.wallets SET balance = balance - (v_agent_share + v_platform_fee) WHERE id = v_merch_wallet_id;
     
     INSERT INTO transactions (wallet_id, amount, type, category, description, idempotency_key)
     VALUES 
       (v_buyer_wallet_id, v_escrow.amount, 'credit', 'refund', 'Dispute Resolved: Full Refund', 'buyer-refund-' || p_order_id),
       (v_agent_wallet_id, v_agent_share, 'credit', 'delivery_earning', 'Dispute Resolved: Delivery Earnings', 'agent-resolve-' || p_order_id),
       (v_treasury_id, v_platform_fee, 'credit', 'platform_fee', 'Dispute Resolved: Platform Fee', 'fee-resolve-' || p_order_id),
       (v_merch_wallet_id, -(v_agent_share + v_platform_fee), 'debit', 'penalty', 'Dispute Resolved: Fee Liability', 'merch-penalty-' || p_order_id);
     
     v_buyer_refund := v_escrow.amount;
 
   ELSIF p_resolution_type = 'ORDER_CANCELLED_REFUND' THEN
     v_order_status := 'CANCELLED';
     -- "Clean Reset": Buyer gets all money back, no one else is paid.
     UPDATE public.wallets SET balance = balance + v_escrow.amount WHERE id = v_buyer_wallet_id;
     
     INSERT INTO transactions (wallet_id, amount, type, category, description, idempotency_key)
     VALUES 
       (v_buyer_wallet_id, v_escrow.amount, 'credit', 'refund', 'Order Aborted: Full Refund', 'buyer-abort-' || p_order_id);
       
     v_buyer_refund := v_escrow.amount;
 
   ELSE
     RETURN json_build_object('ok', false, 'error', 'invalid_resolution_type');
   END IF;
 
   -- 5. Close Records
   UPDATE public.escrows SET status = 'RELEASED', resolved_at = now() WHERE id = v_escrow.id;
   UPDATE public.marketplace_orders SET status = v_order_status, updated_at = now() WHERE id = v_order.id;
   UPDATE public.disputes SET status = 'CLOSED', resolution_path = p_resolution_type WHERE order_id = v_order.id;
 
   -- 🛡️ Mandatory Audit Log
   INSERT INTO public.audit_logs (event_type, actor_id, resource_id, severity, details)
   VALUES (
     'DISPUTE_RESOLUTION',
     auth.uid(),
     p_order_id,
     'medium',
     jsonb_build_object(
       'order_type', 'marketplace',
       'resolution', p_resolution_type,
       'buyer_refunded', v_buyer_refund,
       'merchant_id', v_order.merchant_id
     )
   );

   RETURN json_build_object('ok', true, 'resolution', p_resolution_type, 'buyer_refunded', v_buyer_refund, 'status', v_order_status);
 END;
 $function$;

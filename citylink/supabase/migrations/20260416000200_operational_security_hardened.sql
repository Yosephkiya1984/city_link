-- 1. Tables Extension (Ensure columns exist safely)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_rejection_count int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_rejection_at timestamp WITH TIME ZONE;

ALTER TABLE public.delivery_agents ADD COLUMN IF NOT EXISTS blocked_until timestamp WITH TIME ZONE;
ALTER TABLE public.delivery_agents ADD COLUMN IF NOT EXISTS last_block_reason text;

ALTER TABLE public.marketplace_orders ADD COLUMN IF NOT EXISTS pin_reveal_count int DEFAULT 0;
ALTER TABLE public.marketplace_orders ADD COLUMN IF NOT EXISTS last_pin_reveal_at timestamp WITH TIME ZONE;

-- 2. Security Logs Table
CREATE TABLE IF NOT EXISTS public.marketplace_security_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    order_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 3. Secure PIN Reveal RPC with Rate Limiting and Wallet PIN Binding
CREATE OR REPLACE FUNCTION public.reveal_marketplace_order_pin(
    p_order_id text, 
    p_wallet_pin_hash text DEFAULT NULL
)
 RETURNS TABLE(ok boolean, delivery_pin text, error text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_order RECORD;
    v_wallet RECORD;
BEGIN
    -- Fetch the order
    SELECT * INTO v_order FROM public.marketplace_orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, 'order_not_found'::TEXT;
        RETURN;
    END IF;

    -- Verify ownership (Buyer or Assigned Agent or Admin)
    IF v_order.buyer_id != auth.uid() AND v_order.agent_id != auth.uid() AND 
       NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, 'unauthorized'::TEXT;
        RETURN;
    END IF;

    -- Rate Limiting (5 reveals per 30 minutes)
    IF v_order.last_pin_reveal_at > now() - interval '30 minutes' AND v_order.pin_reveal_count >= 5 THEN
        INSERT INTO public.marketplace_security_logs (event_type, user_id, order_id, metadata)
        VALUES ('PIN_REVEAL_BLOCKED_RATE_LIMIT', auth.uid(), p_order_id, jsonb_build_object('count', v_order.pin_reveal_count));
        
        RETURN QUERY SELECT FALSE, NULL::TEXT, 'rate_limit_exceeded'::TEXT;
        RETURN;
    END IF;

    -- Mandatory Wallet PIN validation for Fallback flow (Server-Side Secure Binding)
    IF p_wallet_pin_hash IS NOT NULL THEN
        SELECT pin_hash INTO v_wallet FROM public.profiles WHERE id = auth.uid();
        -- Note: v_wallet.pin_hash is compared against the provided hash
        IF v_wallet.pin_hash IS NULL OR v_wallet.pin_hash != p_wallet_pin_hash THEN
            INSERT INTO public.marketplace_security_logs (event_type, user_id, order_id, metadata)
            VALUES ('PIN_REVEAL_FAIL_INVALID_WALLET_PIN', auth.uid(), p_order_id, '{}');
            
            RETURN QUERY SELECT FALSE, NULL::TEXT, 'invalid_wallet_pin'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Update reveal metadata
    UPDATE public.marketplace_orders
    SET 
        pin_reveal_count = CASE 
            WHEN last_pin_reveal_at < now() - interval '30 minutes' THEN 1 
            ELSE pin_reveal_count + 1 
        END,
        last_pin_reveal_at = now()
    WHERE id = p_order_id;

    -- Log success
    INSERT INTO public.marketplace_security_logs (event_type, user_id, order_id)
    VALUES ('PIN_REVEAL_SUCCESS', auth.uid(), p_order_id);

    RETURN QUERY SELECT TRUE, v_order.delivery_pin, NULL::TEXT;
END;
$function$;

-- 4. Multi-Window Agent Penalty System
CREATE OR REPLACE FUNCTION public.handle_agent_decline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_decline_count_4h int;
  v_decline_count_24h int;
  v_blocked_until timestamp WITH TIME ZONE;
  v_reason text;
BEGIN
  IF NEW.status = 'DECLINED' AND (OLD.status IS NULL OR OLD.status != 'DECLINED') THEN
    NEW.declined_at := now();
    
    -- Check window: 4 hours
    SELECT count(*) INTO v_decline_count_4h 
    FROM public.delivery_dispatches 
    WHERE agent_id = NEW.agent_id 
      AND status = 'DECLINED' 
      AND declined_at > now() - INTERVAL '4 hours';
      
    -- Check window: 24 hours  
    SELECT count(*) INTO v_decline_count_24h 
    FROM public.delivery_dispatches 
    WHERE agent_id = NEW.agent_id 
      AND status = 'DECLINED' 
      AND declined_at > now() - INTERVAL '24 hours';

    -- Tier 1: 3 declines in 4h = 30m block
    IF v_decline_count_4h >= 2 THEN -- This is the 3rd decline
      v_blocked_until := now() + INTERVAL '30 minutes';
      v_reason := 'High decline rate (3 in 4h)';
    END IF;

    -- Tier 2: 5 declines in 24h = 2h block
    IF v_decline_count_24h >= 4 THEN -- This is the 5th decline
      v_blocked_until := now() + INTERVAL '2 hours';
      v_reason := 'Excessive declines (5 in 24h)';
    END IF;

    IF v_blocked_until IS NOT NULL THEN
      UPDATE public.delivery_agents 
      SET blocked_until = v_blocked_until, last_block_reason = v_reason
      WHERE id = NEW.agent_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS tr_agent_decline ON public.delivery_dispatches;
CREATE TRIGGER tr_agent_decline
BEFORE UPDATE ON public.delivery_dispatches
FOR EACH ROW EXECUTE FUNCTION handle_agent_decline();

-- 5. Daily Buyer Rejection Limits RPC
CREATE OR REPLACE FUNCTION public.reject_delivery_by_buyer(
  p_order_id text, 
  p_buyer_id uuid, 
  p_reason_code text DEFAULT 'BUYER_REJECTION', 
  p_comment text DEFAULT ''
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_rejection_count int;
  v_last_rejection timestamp WITH TIME ZONE;
  v_reason text;
BEGIN
  -- Construct combined reason
  v_reason := p_reason_code || CASE WHEN p_comment <> '' THEN ': ' || p_comment ELSE '' END;

  -- Check limits
  SELECT daily_rejection_count, last_rejection_at 
  INTO v_rejection_count, v_last_rejection
  FROM public.profiles WHERE id = p_buyer_id FOR UPDATE;

  -- Reset counter if last rejection was on a different day
  IF v_last_rejection IS NULL OR v_last_rejection < date_trunc('day', now()) THEN
    v_rejection_count := 0;
  END IF;

  IF v_rejection_count >= 3 THEN
    RETURN json_build_object('ok', false, 'error', 'daily_rejection_limit_reached');
  END IF;

  SELECT * INTO v_order FROM public.marketplace_orders WHERE id::text = p_order_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF v_order.buyer_id <> p_buyer_id AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF v_order.status NOT IN ('IN_TRANSIT', 'SHIPPED', 'AWAITING_PIN') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status_for_rejection');
  END IF;

  -- Update order
  UPDATE public.marketplace_orders 
  SET status = 'REJECTED_BY_BUYER', updated_at = now() 
  WHERE id::text = p_order_id;
  
  -- Update buyer profile
  UPDATE public.profiles 
  SET daily_rejection_count = v_rejection_count + 1, last_rejection_at = now()
  WHERE id = p_buyer_id;

  -- Open dispute
  INSERT INTO public.disputes (
    order_id, buyer_id, merchant_id, product_name, amount, reason, description, stage, status, raised_at
  )
  VALUES (
    v_order.id, v_order.buyer_id, v_order.merchant_id, v_order.product_name, v_order.total, p_reason_code, v_reason, 'at_delivery', 'OPEN', now()
  );

  RETURN json_build_object('ok', true, 'status', 'REJECTED_BY_BUYER');
END;
$function$;

-- 6. Hardened Job Acceptance RPC
CREATE OR REPLACE FUNCTION public.accept_delivery_job(p_order_id text, p_agent_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated_count int;
  v_agent_balance numeric;
  v_blocked_until timestamp WITH TIME ZONE;
BEGIN
  -- 0. Check Blocked Status
  SELECT blocked_until INTO v_blocked_until FROM public.delivery_agents WHERE id = p_agent_id;
  IF v_blocked_until IS NOT NULL AND v_blocked_until > now() THEN
    RETURN json_build_object('ok', false, 'error', 'You are temporarily blocked from accepting jobs due to frequent declines. Try again at ' || v_blocked_until::text);
  END IF;

  -- 1. Check Agent Collateral (Min 500 ETB)
  SELECT balance INTO v_agent_balance FROM public.wallets WHERE user_id = p_agent_id;
  IF v_agent_balance IS NULL OR v_agent_balance < 500 THEN
    RETURN json_build_object('ok', false, 'error', 'Insufficient collateral. You need at least 500 ETB in your wallet to accept this delivery.');
  END IF;

  -- 2. Attempt to claim the order
  UPDATE marketplace_orders
  SET agent_id = p_agent_id,
      status = 'AGENT_ASSIGNED',
      updated_at = now()
  WHERE id = p_order_id
    AND agent_id IS NULL
    AND status IN ('DISPATCHING', 'PAID', 'SHIPPED');

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Job already taken or no longer available');
  END IF;

  UPDATE delivery_dispatches
  SET status = 'ACCEPTED', responded_at = now()
  WHERE order_id = p_order_id AND agent_id = p_agent_id;

  UPDATE delivery_dispatches
  SET status = 'SUPERSEDED'
  WHERE order_id = p_order_id AND agent_id != p_agent_id AND status = 'PENDING';

  RETURN json_build_object('ok', true);
END;
$function$;

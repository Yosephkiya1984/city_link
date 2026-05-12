-- Migration: Ghost RPC Synchronization & RLS Hardening
-- Date: 2026-05-07
-- Description: Synchronizes "Ghost" RPC functions (Ekub, Wallet) from the live database to the repository and implements strict RLS.

-- 1. RPC: process_ekub_contribution_atomic
CREATE OR REPLACE FUNCTION public.process_ekub_contribution_atomic(p_user_id uuid, p_ekub_id uuid, p_round_number integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_amount NUMERIC;
  v_balance NUMERIC;
  v_idempotency_key TEXT;
  v_contribution_id UUID := gen_random_uuid();
BEGIN
  -- 1. Auth Check - Only self or admin
  IF auth.uid() <> p_user_id AND NOT is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  -- 2. Fetch Ekub Amount
  SELECT contribution_amount INTO v_amount 
  FROM public.ekubs 
  WHERE id = p_ekub_id;

  IF v_amount IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ekub_not_found');
  END IF;

  -- 3. Idempotency Key
  v_idempotency_key := 'ekub-' || p_ekub_id::text || '-' || p_round_number::text || '-' || p_user_id::text;

  -- 4. Check if already contributed for this round
  IF EXISTS (SELECT 1 FROM public.ekub_contributions WHERE ekub_id = p_ekub_id AND user_id = p_user_id AND round_number = p_round_number) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_contributed');
  END IF;

  -- 5. Lock & Check Wallet
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_balance < v_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  END IF;

  -- 6. Deduct Wallet
  UPDATE public.wallets SET balance = balance - v_amount, updated_at = now() 
  WHERE user_id = p_user_id;

  -- 7. Update Ekub Pot
  UPDATE public.ekubs SET pot_balance = pot_balance + v_amount, updated_at = now()
  WHERE id = p_ekub_id;

  -- 8. Create Contribution Record
  INSERT INTO public.ekub_contributions (
    id, ekub_id, user_id, round_number, amount, paid_at, base_amount, total_amount, is_penalty_payment
  )
  VALUES (
    v_contribution_id, p_ekub_id, p_user_id, p_round_number, v_amount, now(), v_amount, v_amount, false
  );

  -- 9. Create Transaction History
  INSERT INTO public.transactions (
    id, wallet_id, amount, type, category, description, created_at, idempotency_key, user_id
  )
  VALUES (
    gen_random_uuid(), 
    (SELECT id FROM public.wallets WHERE user_id = p_user_id),
    v_amount, 'debit', 'ekub', 'Ekub Contribution - Round ' || p_round_number, now(), v_idempotency_key, p_user_id
  );

  RETURN jsonb_build_object(
    'ok', true, 
    'contribution_id', v_contribution_id,
    'new_balance', v_balance - v_amount
  );
END;
$function$;

-- 2. RPC: execute_ekub_draw_atomic
CREATE OR REPLACE FUNCTION public.execute_ekub_draw_atomic(p_ekub_id uuid, p_round_number integer, p_pot_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_winner_id UUID;
    v_winner_name TEXT;
    v_draw_id UUID;
BEGIN
    -- Auth check: Organiser or Admin
    IF NOT EXISTS (SELECT 1 FROM ekubs WHERE id = p_ekub_id AND organiser_id = auth.uid()) AND NOT is_admin() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized: Only the organiser can trigger a draw');
    END IF;

    IF EXISTS (SELECT 1 FROM ekub_draws WHERE ekub_id = p_ekub_id AND round_number = p_round_number) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Draw already exists for this round');
    END IF;

    -- Fair selection: Randomly pick a member who hasn't won yet
    SELECT user_id INTO v_winner_id
    FROM ekub_members
    WHERE ekub_id = p_ekub_id 
      AND status = 'ACTIVE' 
      AND has_won = FALSE
    ORDER BY random()
    LIMIT 1;

    IF v_winner_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'No eligible members found for draw');
    END IF;

    SELECT full_name INTO v_winner_name FROM profiles WHERE id = v_winner_id;

    INSERT INTO ekub_draws (
        ekub_id,
        round_number,
        winner_id,
        winner_name,
        pot_amount,
        status,
        created_at
    ) VALUES (
        p_ekub_id,
        p_round_number,
        v_winner_id,
        v_winner_name,
        p_pot_amount,
        'AWAITING_CONSENT',
        NOW()
    ) RETURNING id INTO v_draw_id;

    UPDATE ekub_members SET has_won = TRUE WHERE ekub_id = p_ekub_id AND user_id = v_winner_id;

    RETURN jsonb_build_object(
        'ok', true, 
        'draw_id', v_draw_id, 
        'winner_name', v_winner_name,
        'winner_id', v_winner_id
    );
END;
$function$;

-- 3. RPC: execute_ekub_payout_atomic
CREATE OR REPLACE FUNCTION public.execute_ekub_payout_atomic(p_draw_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_ekub_id UUID;
    v_winner_id UUID;
    v_pot_amount DECIMAL;
    v_vouch_count INT;
BEGIN
    SELECT ekub_id, winner_id, pot_amount
    INTO v_ekub_id, v_winner_id, v_pot_amount
    FROM ekub_draws WHERE id = p_draw_id AND status = 'NEEDS_VOUCHING';

    IF v_ekub_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Draw not found or not ready for payout');
    END IF;

    -- Auth check: Organiser or Admin
    IF NOT EXISTS (SELECT 1 FROM ekubs WHERE id = v_ekub_id AND organiser_id = auth.uid()) AND NOT is_admin() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
    END IF;

    -- Vouch check: Need at least one approval from another member
    SELECT COUNT(*) INTO v_vouch_count
    FROM ekub_vouches
    WHERE draw_id = p_draw_id AND is_approved = TRUE;

    IF v_vouch_count < 1 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Insufficient vouches');
    END IF;

    -- Pot balance check
    UPDATE ekubs 
    SET pot_balance = pot_balance - v_pot_amount 
    WHERE id = v_ekub_id AND pot_balance >= v_pot_amount;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Insufficient circle balance');
    END IF;

    -- Payout to winner's wallet
    UPDATE public.wallets SET balance = balance + v_pot_amount, updated_at = now() WHERE user_id = v_winner_id;

    -- Update records
    UPDATE ekub_draws SET status = 'PAID', paid_at = NOW() WHERE id = p_draw_id;
    UPDATE ekubs SET current_round = current_round + 1 WHERE id = v_ekub_id;

    -- Transaction history for winner
    INSERT INTO public.transactions (
        id, wallet_id, amount, type, category, description, created_at, user_id
    ) VALUES (
        gen_random_uuid(),
        (SELECT id FROM public.wallets WHERE user_id = v_winner_id),
        v_pot_amount, 'credit', 'ekub', 'Ekub Payout Received - Draw ' || p_draw_id, now(), v_winner_id
    );

    RETURN jsonb_build_object('ok', true, 'amount', v_pot_amount);
END;
$function$;

-- 4. RPC: process_wallet_topup
CREATE OR REPLACE FUNCTION public.process_wallet_topup(p_user_id uuid, p_amount numeric, p_tx_ref text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_wallet_id UUID;
BEGIN
    -- 1. Idempotency Check
    IF EXISTS (SELECT 1 FROM public.transactions WHERE reference_id = p_tx_ref) THEN
        RETURN; 
    END IF;

    -- 2. Fetch wallet ID
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;
    
    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
    END IF;

    -- 3. Add funds
    UPDATE public.wallets 
    SET balance = balance + p_amount, 
        updated_at = now()
    WHERE id = v_wallet_id;

    -- 4. Log transaction
    INSERT INTO public.transactions (wallet_id, user_id, amount, type, category, description, reference_id, created_at)
    VALUES (
        v_wallet_id, 
        p_user_id,
        p_amount, 
        'credit', 
        'topup', 
        'Wallet Top-up - Ref: ' || p_tx_ref, 
        p_tx_ref,
        now()
    );

    -- 5. Send Notification
    INSERT INTO public.notifications (user_id, title, message, type, created_at)
    VALUES (
        p_user_id,
        'Top-up Successful',
        'Your wallet has been credited with ' || p_amount || ' ETB.',
        'success',
        now()
    );
END;
$function$;

-- 5. RLS Implementation
ALTER TABLE public.ekub_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ekub_members_circle_read ON public.ekub_members;
CREATE POLICY ekub_members_circle_read ON public.ekub_members
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ekub_members m 
            WHERE m.ekub_id = ekub_members.ekub_id AND m.user_id = auth.uid()
        ) OR is_admin()
    );

ALTER TABLE public.ekub_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ekub_contributions_read ON public.ekub_contributions;
CREATE POLICY ekub_contributions_read ON public.ekub_contributions
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.ekubs WHERE id = ekub_id AND organiser_id = auth.uid()) OR 
        is_admin()
    );

ALTER TABLE public.ekub_draws ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ekub_draws_read ON public.ekub_draws;
CREATE POLICY ekub_draws_read ON public.ekub_draws
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ekub_members 
            WHERE ekub_id = ekub_draws.ekub_id AND user_id = auth.uid()
        ) OR is_admin()
    );

ALTER TABLE public.ekub_vouches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ekub_vouches_read ON public.ekub_vouches;
CREATE POLICY ekub_vouches_read ON public.ekub_vouches
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ekub_members 
            WHERE ekub_id = ekub_vouches.ekub_id AND user_id = auth.uid()
        ) OR is_admin()
    );

DROP POLICY IF EXISTS ekub_vouches_insert ON public.ekub_vouches;
CREATE POLICY ekub_vouches_insert ON public.ekub_vouches
    FOR INSERT TO authenticated
    WITH CHECK (
        voucher_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM public.ekub_members 
            WHERE ekub_id = ekub_vouches.ekub_id AND user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

ALTER TABLE public.ekub_penalties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ekub_penalties_read ON public.ekub_penalties;
CREATE POLICY ekub_penalties_read ON public.ekub_penalties
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.ekubs WHERE id = ekub_id AND organiser_id = auth.uid()) OR 
        is_admin()
    );

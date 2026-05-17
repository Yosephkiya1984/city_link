-- supabase/migrations/20260517133000_fix_reservation_cancellation.sql

CREATE OR REPLACE FUNCTION public.cancel_reservation(p_reservation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_reservation RECORD;
    v_escrow RECORD;
    v_citizen_wallet RECORD;
BEGIN
    -- 1. Get reservation details
    SELECT * INTO v_reservation FROM public.reservations WHERE id = p_reservation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation not found.';
    END IF;

    -- 2. Verify ownership (Citizen can cancel their own, Merchant can cancel theirs)
    IF v_user_id != v_reservation.citizen_id AND v_user_id != v_reservation.merchant_id THEN
        RAISE EXCEPTION 'Unauthorized.';
    END IF;

    -- 3. Check "Point of No Return"
    -- If FIRED or COOKING or SEATED or COMPLETED, citizen cannot cancel. Merchant still can (e.g. if they ran out of stock).
    IF v_user_id = v_reservation.citizen_id AND v_reservation.status IN ('FIRED', 'COOKING', 'SEATED', 'COMPLETED') THEN
        RAISE EXCEPTION 'Cannot cancel. Your order is already being prepared in the kitchen.';
    END IF;

    -- 4. Find Escrow in public.escrows (since escrow_transactions does not exist)
    IF v_reservation.escrow_id IS NOT NULL THEN
        SELECT * INTO v_escrow FROM public.escrows 
        WHERE id = v_reservation.escrow_id AND status = 'LOCKED'
        LIMIT 1;

        IF FOUND THEN
            -- Update escrow status to REFUNDED
            UPDATE public.escrows 
            SET status = 'REFUNDED', updated_at = NOW(), resolved_at = NOW() 
            WHERE id = v_escrow.id;

            -- Refund to citizen's wallet
            UPDATE public.wallets 
            SET balance = balance + v_escrow.amount 
            WHERE user_id = v_reservation.citizen_id;

            -- Get wallet id for transaction log
            SELECT id INTO v_citizen_wallet FROM public.wallets WHERE user_id = v_reservation.citizen_id;
            
            -- Insert Refund Transaction
            IF FOUND THEN
                INSERT INTO public.transactions (
                    wallet_id, amount, type, category, description, reference_id, user_id
                ) VALUES (
                    v_citizen_wallet.id, v_escrow.amount, 'credit', 'refund', 
                    'Refund: Reservation Cancelled', p_reservation_id::text, v_reservation.citizen_id
                );
            END IF;
        END IF;
    END IF;

    -- 5. Free up table if reservation was for a table
    IF v_reservation.table_id IS NOT NULL THEN
        UPDATE public.restaurant_tables 
        SET status = 'free', reserved_until = NULL 
        WHERE id = v_reservation.table_id;
    END IF;

    -- 6. Mark reservation status cancelled
    UPDATE public.reservations 
    SET status = 'CANCELLED', updated_at = NOW() 
    WHERE id = p_reservation_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Reservation cancelled and funds refunded.'
    );
END;
$$;

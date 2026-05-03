-- supabase/migrations/20260427215518_add_table_to_reservations.sql

ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS table_id TEXT,
ADD COLUMN IF NOT EXISTS table_number TEXT;

-- Update the RPC to accept table_id and table_number
CREATE OR REPLACE FUNCTION public.process_table_reservation(
    p_merchant_id UUID,
    p_reservation_time TIMESTAMPTZ,
    p_guest_count INTEGER,
    p_deposit_amount NUMERIC,
    p_items JSONB, -- Array of {product_id, quantity, unit_price}
    p_table_id TEXT DEFAULT NULL,
    p_table_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_citizen_id UUID := auth.uid();
    v_total_cost NUMERIC := p_deposit_amount;
    v_citizen_balance NUMERIC;
    v_service_pin TEXT;
    v_reservation_id UUID;
    v_item RECORD;
BEGIN
    -- 1. Calculate items cost if pre-ordering
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, unit_price NUMERIC) LOOP
            v_total_cost := v_total_cost + (v_item.quantity * v_item.unit_price);
        END LOOP;
    END IF;

    -- 2. Check balance
    SELECT balance INTO v_citizen_balance FROM public.wallets WHERE user_id = v_citizen_id;
    IF v_citizen_balance < v_total_cost THEN
        RAISE EXCEPTION 'Insufficient balance. Need % ETB', v_total_cost;
    END IF;

    -- 3. Deduct balance and add to Escrow
    UPDATE public.wallets SET balance = balance - v_total_cost WHERE user_id = v_citizen_id;
    
    -- We will put it all in one Escrow hold
    INSERT INTO public.escrow_transactions (
        payer_id, payee_id, amount, status, reference_type, reference_id
    ) VALUES (
        v_citizen_id, p_merchant_id, v_total_cost, 'HELD', 'RESERVATION', p_merchant_id
    );

    -- 4. Generate PIN and create reservation
    v_service_pin := lpad(floor(random() * 10000)::text, 4, '0');
    
    INSERT INTO public.reservations (
        merchant_id, citizen_id, reservation_time, guest_count, deposit_amount, service_pin, status, table_id, table_number
    ) VALUES (
        p_merchant_id, v_citizen_id, p_reservation_time, p_guest_count, p_deposit_amount, v_service_pin, 'PENDING', p_table_id, p_table_number
    ) RETURNING id INTO v_reservation_id;

    -- Update escrow reference to point to reservation_id
    UPDATE public.escrow_transactions 
    SET reference_id = v_reservation_id 
    WHERE reference_type = 'RESERVATION' AND payer_id = v_citizen_id AND payee_id = p_merchant_id AND status = 'HELD'
    -- Small hack to just get the latest one we inserted
    AND created_at >= NOW() - INTERVAL '1 minute';

    -- 5. Insert items
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, unit_price NUMERIC) LOOP
            INSERT INTO public.reservation_items (
                reservation_id, product_id, quantity, unit_price
            ) VALUES (
                v_reservation_id, v_item.product_id, v_item.quantity, v_item.unit_price
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', v_reservation_id,
        'service_pin', v_service_pin
    );
END;
$$;

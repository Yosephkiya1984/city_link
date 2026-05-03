-- supabase/migrations/20260427191850_hospitality_expansion.sql

-- 1. Create Events Table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    cover_charge NUMERIC NOT NULL DEFAULT 0 CHECK (cover_charge >= 0),
    capacity INTEGER NOT NULL CHECK (capacity >= 0),
    available_capacity INTEGER NOT NULL CHECK (available_capacity >= 0),
    status TEXT NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Event Tickets Table
CREATE TABLE IF NOT EXISTS public.event_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_paid NUMERIC NOT NULL CHECK (total_paid >= 0),
    ticket_pin TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'SCANNED', 'REFUNDED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Reservations Table
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reservation_time TIMESTAMPTZ NOT NULL,
    guest_count INTEGER NOT NULL CHECK (guest_count > 0),
    deposit_amount NUMERIC NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
    service_pin TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Reservation Items Table (Pre-ordered food/drinks)
CREATE TABLE IF NOT EXISTS public.reservation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Events are visible to everyone"
ON public.events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Merchants can manage their own events"
ON public.events FOR ALL
TO authenticated
USING (auth.uid() = merchant_id)
WITH CHECK (auth.uid() = merchant_id);

-- RLS Policies for event_tickets
CREATE POLICY "Citizens can view their own tickets"
ON public.event_tickets FOR SELECT
TO authenticated
USING (auth.uid() = citizen_id);

CREATE POLICY "Merchants can view tickets for their events"
ON public.event_tickets FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.events
        WHERE events.id = event_tickets.event_id
        AND events.merchant_id = auth.uid()
    )
);

CREATE POLICY "Merchants can update tickets for their events"
ON public.event_tickets FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.events
        WHERE events.id = event_tickets.event_id
        AND events.merchant_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.events
        WHERE events.id = event_tickets.event_id
        AND events.merchant_id = auth.uid()
    )
);

-- RLS Policies for reservations
CREATE POLICY "Citizens can view their own reservations"
ON public.reservations FOR SELECT
TO authenticated
USING (auth.uid() = citizen_id);

CREATE POLICY "Merchants can manage their own reservations"
ON public.reservations FOR ALL
TO authenticated
USING (auth.uid() = merchant_id)
WITH CHECK (auth.uid() = merchant_id);

-- RLS Policies for reservation_items
CREATE POLICY "Citizens can view items for their reservations"
ON public.reservation_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.reservations
        WHERE reservations.id = reservation_items.reservation_id
        AND reservations.citizen_id = auth.uid()
    )
);

CREATE POLICY "Merchants can view items for their reservations"
ON public.reservation_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.reservations
        WHERE reservations.id = reservation_items.reservation_id
        AND reservations.merchant_id = auth.uid()
    )
);

-- RPCs for Escrow-backed booking
-- 1. Event Ticket Purchase
CREATE OR REPLACE FUNCTION public.process_event_ticket_purchase(
    p_event_id UUID,
    p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_citizen_id UUID := auth.uid();
    v_event RECORD;
    v_total_cost NUMERIC;
    v_citizen_balance NUMERIC;
    v_ticket_pin TEXT;
    v_ticket_id UUID;
BEGIN
    -- 1. Get event details
    SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found.';
    END IF;

    IF v_event.status != 'UPCOMING' AND v_event.status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Event is not active.';
    END IF;

    IF v_event.available_capacity < p_quantity THEN
        RAISE EXCEPTION 'Not enough tickets available.';
    END IF;

    -- 2. Calculate cost and check balance
    v_total_cost := v_event.cover_charge * p_quantity;
    
    SELECT balance INTO v_citizen_balance FROM public.wallets WHERE user_id = v_citizen_id;
    IF v_citizen_balance < v_total_cost THEN
        RAISE EXCEPTION 'Insufficient balance.';
    END IF;

    -- 3. Deduct balance and add to Escrow
    UPDATE public.wallets SET balance = balance - v_total_cost WHERE user_id = v_citizen_id;
    
    INSERT INTO public.escrow_transactions (
        payer_id, payee_id, amount, status, reference_type, reference_id
    ) VALUES (
        v_citizen_id, v_event.merchant_id, v_total_cost, 'HELD', 'EVENT_TICKET', p_event_id
    );

    -- 4. Update capacity
    UPDATE public.events SET available_capacity = available_capacity - p_quantity WHERE id = p_event_id;

    -- 5. Generate PIN and create ticket
    v_ticket_pin := lpad(floor(random() * 10000)::text, 4, '0');
    
    INSERT INTO public.event_tickets (
        event_id, citizen_id, quantity, total_paid, ticket_pin, status
    ) VALUES (
        p_event_id, v_citizen_id, p_quantity, v_total_cost, v_ticket_pin, 'VALID'
    ) RETURNING id INTO v_ticket_id;

    RETURN jsonb_build_object(
        'success', true,
        'ticket_id', v_ticket_id,
        'ticket_pin', v_ticket_pin
    );
END;
$$;

-- 2. Table Reservation
CREATE OR REPLACE FUNCTION public.process_table_reservation(
    p_merchant_id UUID,
    p_reservation_time TIMESTAMPTZ,
    p_guest_count INTEGER,
    p_deposit_amount NUMERIC,
    p_items JSONB -- Array of {product_id, quantity, unit_price}
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
        merchant_id, citizen_id, reservation_time, guest_count, deposit_amount, service_pin, status
    ) VALUES (
        p_merchant_id, v_citizen_id, p_reservation_time, p_guest_count, p_deposit_amount, v_service_pin, 'PENDING'
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

-- 3. Release Escrow (Generic for Hospitality pins)
CREATE OR REPLACE FUNCTION public.release_hospitality_escrow(
    p_pin TEXT,
    p_type TEXT -- 'TICKET' or 'RESERVATION'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_merchant_id UUID := auth.uid();
    v_ticket RECORD;
    v_reservation RECORD;
    v_escrow RECORD;
BEGIN
    IF p_type = 'TICKET' THEN
        -- Find valid ticket for this merchant's events with this PIN
        SELECT t.* INTO v_ticket 
        FROM public.event_tickets t
        JOIN public.events e ON t.event_id = e.id
        WHERE t.ticket_pin = p_pin AND t.status = 'VALID' AND e.merchant_id = v_merchant_id
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid or already scanned Ticket PIN.';
        END IF;

        -- Find Escrow
        SELECT * INTO v_escrow FROM public.escrow_transactions 
        WHERE reference_type = 'EVENT_TICKET' AND reference_id = v_ticket.event_id AND payer_id = v_ticket.citizen_id AND status = 'HELD'
        LIMIT 1;

        IF FOUND THEN
            -- Release Escrow to Merchant
            UPDATE public.escrow_transactions SET status = 'RELEASED', updated_at = NOW() WHERE id = v_escrow.id;
            UPDATE public.wallets SET balance = balance + v_escrow.amount WHERE user_id = v_merchant_id;
        END IF;

        -- Mark scanned
        UPDATE public.event_tickets SET status = 'SCANNED', updated_at = NOW() WHERE id = v_ticket.id;

        RETURN jsonb_build_object('success', true, 'message', 'Ticket scanned and funds released.');

    ELSIF p_type = 'RESERVATION' THEN
        -- Find reservation
        SELECT * INTO v_reservation 
        FROM public.reservations 
        WHERE service_pin = p_pin AND merchant_id = v_merchant_id AND status IN ('PENDING', 'CONFIRMED', 'SEATED')
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid Service PIN or reservation already closed.';
        END IF;

        -- Find Escrow
        SELECT * INTO v_escrow FROM public.escrow_transactions 
        WHERE reference_type = 'RESERVATION' AND reference_id = v_reservation.id AND status = 'HELD'
        LIMIT 1;

        IF FOUND THEN
            -- Release Escrow to Merchant
            UPDATE public.escrow_transactions SET status = 'RELEASED', updated_at = NOW() WHERE id = v_escrow.id;
            UPDATE public.wallets SET balance = balance + v_escrow.amount WHERE user_id = v_merchant_id;
        END IF;

        -- Mark completed
        UPDATE public.reservations SET status = 'COMPLETED', updated_at = NOW() WHERE id = v_reservation.id;

        RETURN jsonb_build_object('success', true, 'message', 'Reservation closed and funds released.');
    ELSE
        RAISE EXCEPTION 'Invalid type. Use TICKET or RESERVATION.';
    END IF;
END;
$$;

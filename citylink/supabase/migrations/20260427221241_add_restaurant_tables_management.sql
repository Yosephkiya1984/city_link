-- supabase/migrations/20260427221241_add_restaurant_tables_management.sql

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    table_number INTEGER NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(merchant_id, table_number)
);

-- Enable RLS
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tables are visible to everyone') THEN
        CREATE POLICY "Tables are visible to everyone" ON public.restaurant_tables FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Merchants can manage their own tables') THEN
        CREATE POLICY "Merchants can manage their own tables" ON public.restaurant_tables FOR ALL TO authenticated USING (auth.uid() = merchant_id) WITH CHECK (auth.uid() = merchant_id);
    END IF;
END $$;

-- RPC to toggle table status
CREATE OR REPLACE FUNCTION public.toggle_table_status(
    p_table_id UUID,
    p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.restaurant_tables
    SET status = p_status,
        updated_at = NOW()
    WHERE id = p_table_id
    AND merchant_id = auth.uid();

    RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC to initialize tables for a restaurant
CREATE OR REPLACE FUNCTION public.initialize_restaurant_tables(
    p_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_merchant_id UUID := auth.uid();
    i INTEGER;
BEGIN
    FOR i IN 1..p_count LOOP
        INSERT INTO public.restaurant_tables (merchant_id, table_number)
        VALUES (v_merchant_id, i)
        ON CONFLICT (merchant_id, table_number) DO NOTHING;
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$;

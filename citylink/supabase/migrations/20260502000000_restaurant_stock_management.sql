
-- Migration: 20260502000000_restaurant_stock_management.sql
-- Description: Adds inventory stock management for restaurants and Agro-Link integration.

-- 1. Create restaurant_stock table
CREATE TABLE IF NOT EXISTS public.restaurant_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g. 'Meat', 'Vegetables', 'Dairy', 'Spices'
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL, -- e.g. 'kg', 'ltr', 'pcs'
    min_threshold NUMERIC NOT NULL DEFAULT 5, -- Alert level
    last_restocked_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.restaurant_stock ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
CREATE POLICY "Merchants can manage own stock" ON public.restaurant_stock
    FOR ALL
    TO authenticated
    USING (auth.uid() = merchant_id)
    WITH CHECK (auth.uid() = merchant_id);

-- 4. Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_restaurant_stock_updated_at
    BEFORE UPDATE ON public.restaurant_stock
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Agro-Link Integration: Create a view or function for marketplace recommendations
-- This will be used to show "Order Supplies" suggestions based on low stock
CREATE OR REPLACE VIEW public.low_stock_alerts AS
SELECT 
    s.id,
    s.merchant_id,
    s.item_name,
    s.quantity,
    s.unit,
    s.min_threshold,
    p.id as marketplace_product_id,
    p.price as current_market_price
FROM public.restaurant_stock s
LEFT JOIN public.products p ON LOWER(p.name) LIKE '%' || LOWER(s.item_name) || '%'
WHERE s.quantity <= s.min_threshold;

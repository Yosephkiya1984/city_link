
-- Migration: 20260502000100_rls_hardening_and_stock_fix.sql
-- Description: Hardens RLS for developers and creates missing stock management infrastructure.

-- 1. Helper function for Developer Whitelist in DB
CREATE OR REPLACE FUNCTION public.is_developer()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    -- Check phone from JWT (reliable for Supabase Auth)
    RETURN (
        auth.jwt() ->> 'phone' IN ('0911178024', '251911178024', '+251911178024')
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND phone IN ('0911178024', '251911178024', '+251911178024')
        )
    );
END;
$$;

-- 2. Update products RLS policy
-- We drop the old one and create a more robust one that includes is_developer()
DROP POLICY IF EXISTS products_merchant_all ON public.products;
CREATE POLICY products_merchant_all ON public.products
    FOR ALL
    TO authenticated
    USING (
        (auth.uid() = merchant_id AND is_real_user()) 
        OR is_admin() 
        OR is_developer()
    )
    WITH CHECK (
        (auth.uid() = merchant_id AND is_real_user()) 
        OR is_admin() 
        OR is_developer()
    );

-- 3. Create restaurant_stock table (if not exists)
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
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(merchant_id, item_name) -- Prevent duplicate entries for same item
);

ALTER TABLE public.restaurant_stock ENABLE ROW LEVEL SECURITY;

-- 4. RLS for restaurant_stock
DROP POLICY IF EXISTS "Merchants can manage own stock" ON public.restaurant_stock;
CREATE POLICY "Merchants can manage own stock" ON public.restaurant_stock
    FOR ALL
    TO authenticated
    USING (
        (auth.uid() = merchant_id AND is_real_user()) 
        OR is_admin() 
        OR is_developer()
    )
    WITH CHECK (
        (auth.uid() = merchant_id AND is_real_user()) 
        OR is_admin() 
        OR is_developer()
    );

-- 5. Updated At Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_restaurant_stock_updated_at ON public.restaurant_stock;
CREATE TRIGGER set_restaurant_stock_updated_at
    BEFORE UPDATE ON public.restaurant_stock
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. Low Stock Alerts View (Agro-Link Integration)
CREATE OR REPLACE VIEW public.low_stock_alerts AS
SELECT 
    s.id as stock_id,
    s.merchant_id,
    s.item_name,
    s.quantity,
    s.unit,
    s.min_threshold,
    p.id as marketplace_product_id,
    p.price as current_market_price,
    p.image_url as product_image
FROM public.restaurant_stock s
LEFT JOIN public.products p ON (
    LOWER(p.name) LIKE '%' || LOWER(s.item_name) || '%'
    OR LOWER(s.item_name) LIKE '%' || LOWER(p.name) || '%'
) AND p.status = 'active'
WHERE s.quantity <= s.min_threshold;

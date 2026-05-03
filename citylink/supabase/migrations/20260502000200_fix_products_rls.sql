
-- Migration: 20260502000200_fix_products_rls.sql
-- Description: Simplifies and stabilizes products RLS to prevent 401/Unauthorized errors for merchants.

-- 1. Ensure is_developer() is stable and doesn't throw
CREATE OR REPLACE FUNCTION public.is_developer()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    -- Use COALESCE to prevent null propagation
    RETURN COALESCE(
        (auth.jwt() ->> 'phone' IN ('0911178024', '251911178024', '+251911178024')),
        FALSE
    ) OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND phone IN ('0911178024', '251911178024', '+251911178024')
    );
END;
$$;

-- 2. Drop all conflicting policies to start fresh
DROP POLICY IF EXISTS "Owner Delete" ON public.products;
DROP POLICY IF EXISTS "Owner Update" ON public.products;
DROP POLICY IF EXISTS "Public Read" ON public.products;
DROP POLICY IF EXISTS products_insert_policy ON public.products;
DROP POLICY IF EXISTS products_merchant_all ON public.products;
DROP POLICY IF EXISTS products_discovery_read ON public.products;

-- 3. Create clean, consolidated policies

-- 3.1 Public Read (Discovery)
CREATE POLICY "products_public_read" ON public.products
    FOR SELECT
    TO public
    USING (status = 'active' OR is_developer());

-- 3.2 Merchant Management (Authenticated)
CREATE POLICY "products_merchant_manage" ON public.products
    FOR ALL
    TO authenticated
    USING (
        merchant_id = auth.uid() 
        OR is_developer()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
    WITH CHECK (
        merchant_id = auth.uid() 
        OR is_developer()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- 3.3 Restaurant Stock Management (Authenticated)
DROP POLICY IF EXISTS \"Merchants can manage own stock\" ON public.restaurant_stock;
CREATE POLICY \"restaurant_stock_merchant_manage\" ON public.restaurant_stock
    FOR ALL
    TO authenticated
    USING (
        merchant_id = auth.uid() 
        OR is_developer()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
    WITH CHECK (
        merchant_id = auth.uid() 
        OR is_developer()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- 4. Ensure RLS is enabled
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_stock ENABLE ROW LEVEL SECURITY;

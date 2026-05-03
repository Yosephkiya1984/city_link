-- Fix for Identity Fragmentation RLS errors
-- This allows a user who logged in with a test phone number (generating a new auth.uid())
-- to manage products associated with their original merchant profile (which has a different UUID).

-- 1. Helper function to check if the current user owns the profile (by ID or Phone)
CREATE OR REPLACE FUNCTION public.owns_profile(profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    RETURN profile_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = profile_id AND phone = (auth.jwt() ->> 'phone')
    );
END;
$$;

-- 2. Update products RLS
DROP POLICY IF EXISTS "products_merchant_manage" ON public.products;
CREATE POLICY "products_merchant_manage" ON public.products
    FOR ALL
    TO authenticated
    USING (
        owns_profile(merchant_id)
        OR is_developer()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
    WITH CHECK (
        owns_profile(merchant_id)
        OR is_developer()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- 3. Update restaurant_stock RLS
DROP POLICY IF EXISTS "restaurant_stock_merchant_manage" ON public.restaurant_stock;
CREATE POLICY "restaurant_stock_merchant_manage" ON public.restaurant_stock
    FOR ALL
    TO authenticated
    USING (
        owns_profile(merchant_id)
        OR is_developer()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
    WITH CHECK (
        owns_profile(merchant_id)
        OR is_developer()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

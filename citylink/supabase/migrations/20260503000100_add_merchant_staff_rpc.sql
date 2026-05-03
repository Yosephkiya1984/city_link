-- Migration: Add Merchant Staff RPC
-- Created: 2026-05-03

CREATE OR REPLACE FUNCTION public.add_merchant_staff_member(
  p_merchant_id UUID,
  p_phone TEXT,
  p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_profile_id UUID;
  v_existing_staff_id UUID;
BEGIN
  -- 1. Find the profile for the given phone number
  SELECT id INTO v_staff_profile_id FROM public.profiles WHERE phone = p_phone LIMIT 1;
  
  IF v_staff_profile_id IS NULL THEN
    RAISE EXCEPTION 'User with phone number % not found', p_phone;
  END IF;

  -- 2. Check if already staff for this merchant
  SELECT id INTO v_existing_staff_id 
  FROM public.merchant_staff 
  WHERE merchant_id = p_merchant_id AND profile_id = v_staff_profile_id;

  IF v_existing_staff_id IS NOT NULL THEN
    UPDATE public.merchant_staff 
    SET role = p_role 
    WHERE id = v_existing_staff_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Staff role updated', 'id', v_existing_staff_id);
  END IF;

  -- 3. Insert new staff record
  INSERT INTO public.merchant_staff (merchant_id, profile_id, role)
  VALUES (p_merchant_id, v_staff_profile_id, p_role)
  RETURNING id INTO v_existing_staff_id;

  RETURN jsonb_build_object('success', true, 'message', 'Staff member added', 'id', v_existing_staff_id);
END;
$$;

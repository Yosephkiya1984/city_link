import { getClient, supaQuery, hasSupabase } from './supabase';
import { fetchWallet, ensureWallet } from './wallet.service';
import { User } from '../types';

/**
 * flattenUser — flattens the nested merchants join into the User object.
 */
export function flattenUser(data: User & { merchants?: any }): User | null {
  if (!data) return null;
  const { merchants, ...profile } = data;
  let merchant = merchants;
  if (Array.isArray(merchants)) {
    merchant = merchants[0];
  }

  if (merchant) {
    return {
      ...profile,
      business_name: merchant.business_name,
      merchant_type: merchant.merchant_type,
      merchant_status: merchant.merchant_status,
      tin: merchant.tin,
      license_no: merchant.license_no,
      trade_license: merchant.trade_license,
      merchant_details: merchant.merchant_details,
    } as User;
  }
  return profile as User;
}

/**
 * fetchProfile — fetches a user's profile by their ID, joining with merchants.
 */
export async function fetchProfile(userId: string) {
  const res = await supaQuery<User & { merchants: any }>((c) =>
    c.from('profiles').select('*, merchants(*)').eq('id', userId).maybeSingle()
  );
  return { ...res, data: flattenUser(res.data as any) };
}

/**
 * upsertProfile — creates or updates a user's profile.
 */
export async function upsertProfile(profile: Partial<User> & { id: string }) {
  // Only use fields that exist in database schema
  const data: Partial<User> & { updated_at?: string } = {
    id: profile.id,
    role: profile.role || 'citizen',
    kyc_status: profile.kyc_status ?? 'NOT_STARTED',
    updated_at: new Date().toISOString(),
  };

  if (profile.phone !== undefined) data.phone = profile.phone;
  if (profile.full_name !== undefined) data.full_name = profile.full_name;
  if (profile.subcity !== undefined) data.subcity = profile.subcity;
  if (profile.woreda !== undefined) data.woreda = profile.woreda;
  if (profile.credit_score !== undefined) data.credit_score = profile.credit_score;
  if (profile.welcome_bonus_paid !== undefined)
    data.welcome_bonus_paid = profile.welcome_bonus_paid;

  return supaQuery<User>((c) =>
    c.from('profiles').upsert(data, { onConflict: 'id' }).select().single()
  );
}

/**
 * checkPhoneExists — checks if a phone number is already registered via secure RPC.
 */
export async function checkPhoneExists(
  phone: string
): Promise<{ id: string; role: string; full_name?: string } | null> {
  if (!hasSupabase()) {
    return null;
  }
  const { data, error } = await supaQuery<any>((c) =>
    c.rpc('lookup_profile_by_phone', { p_phone: phone })
  );

  if (error || !data) return null;
  return {
    id: data.id,
    role: data.role,
    full_name: data.full_name,
  };
}

interface SessionProfileResult {
  profile: User;
  balance: number;
}

/**
 * loadSessionProfile — load profile + balance for a session.
 * Resolves OTP-bypass IDs via phone lookup if necessary.
 */
export async function loadSessionProfile(
  authUser: { id: string } | null,
  normalizedPhone: string
): Promise<SessionProfileResult | null> {
  if (!getClient()) return null;
  let row: User | null = null;
  const authId = authUser?.id;

  if (authId && !String(authId).startsWith('local-')) {
    const r = await fetchProfile(authId);
    if (r.data) row = r.data;
  }

  if (!row && normalizedPhone) {
    // Attempt lookup by normalized phone with merchant join
    const r = await supaQuery<User & { merchants: any }>((c) =>
      c.from('profiles').select('*, merchants(*)').eq('phone', normalizedPhone).maybeSingle()
    );
    if (r.data) row = flattenUser(r.data as any);
    else {
      // Fallback: search for variations
      const alt = normalizedPhone.startsWith('+251')
        ? '0' + normalizedPhone.slice(4)
        : normalizedPhone;
      const r2 = await supaQuery<User & { merchants: any }>((c) =>
        c.from('profiles').select('*, merchants(*)').eq('phone', alt).maybeSingle()
      );
      if (r2.data) row = flattenUser(r2.data as any);
    }
  }

  if (!row) return null;

  let balance = 0;
  const w = await fetchWallet(row.id);
  if (w.data) {
    balance = Number(w.data.balance) || 0;
  } else {
    const ensured = await ensureWallet(row.id);
    if (ensured.data) balance = Number(ensured.data.balance) || 0;
  }

  return { profile: row, balance };
}

/**
 * switchUserMode — allows a verified user to toggle between citizen and delivery_agent roles.
 * This replaces the insecure admin_set_user_role for self-service mode switching.
 */
export async function switchUserMode(targetRole: 'citizen' | 'delivery_agent') {
  const res = await supaQuery<{ ok: boolean; new_role?: string; error?: string }>((c) =>
    c.rpc('switch_user_mode', { p_target_role: targetRole })
  );

  if (res.error) return { error: res.error };
  if (res.data && !res.data.ok) return { error: res.data.error || 'Switch failed' };

  return { data: res.data?.new_role, error: null };
}

/**
 * registerMerchant — registers a user as a merchant in both profiles and merchants tables.
 * This ensures the profiles entry exists with personal details before creating the merchant entry.
 */
export async function registerMerchant(
  userId: string,
  merchantData: {
    business_name: string;
    merchant_type: string;
    full_name?: string;
    phone?: string;
    tin?: string;
    license_no?: string;
    details?: any;
  }
) {
  // Strict Validation
  if (!merchantData.tin || !/^\d{10}$/.test(merchantData.tin)) {
    return { data: null, error: 'Invalid TIN format. Must be exactly 10 digits.' };
  }
  if (!merchantData.license_no || merchantData.license_no.trim().length < 4) {
    return { data: null, error: 'Invalid Trade License Number.' };
  }
  // 1. Ensure Profile exists with correct role and personal details
  const pRes = await upsertProfile({
    id: userId,
    full_name: merchantData.full_name,
    phone: merchantData.phone,
    role: 'merchant',
    kyc_status: 'PENDING', // By the book: start as pending
  });
  if (pRes.error) return pRes;

  // 2. Upsert Merchant Table
  return supaQuery((c) =>
    c
      .from('merchants')
      .upsert(
        {
          id: userId,
          business_name: merchantData.business_name,
          merchant_type: merchantData.merchant_type,
          merchant_status: 'PENDING', // By the book: start as pending
          tin: merchantData.tin,
          license_no: merchantData.license_no,
          merchant_details: merchantData.details || {},
        },
        { onConflict: 'id' }
      )
      .select()
      .single()
  );
}

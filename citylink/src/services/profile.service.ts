import { getClient, supaQuery, hasSupabase } from './supabase';
import { fetchWallet, ensureWallet } from './wallet.service';
import { User } from '../types';

/**
 * flattenUser — flattens the nested merchants join into the User object.
 */
export function flattenUser(data: any): User | null {
  if (!data) return null;
  const { merchants, ...profile } = data;
  if (merchants) {
    return {
      ...profile,
      business_name: merchants.business_name,
      merchant_type: merchants.merchant_type,
      merchant_status: merchants.merchant_status,
      tin: merchants.tin,
      license_no: merchants.license_no,
      trade_license: merchants.trade_license,
      merchant_details: merchants.merchant_details,
    };
  }
  return profile as User;
}

/**
 * fetchProfile — fetches a user's profile by their ID, joining with merchants.
 */
export async function fetchProfile(userId: string) {
  const res = await supaQuery<any>((c) =>
    c.from('profiles').select('*, merchants(*)').eq('id', userId).maybeSingle()
  );
  return { ...res, data: flattenUser(res.data) };
}

/**
 * upsertProfile — creates or updates a user's profile.
 */
export async function upsertProfile(profile: Partial<User> & { id: string }) {
  // Only use fields that exist in database schema
  const data = {
    id: profile.id,
    phone: profile.phone,
    full_name: profile.full_name,
    role: profile.role || 'citizen',
    kyc_status: profile.kyc_status || 'NONE',
    subcity: profile.subcity,
    woreda: profile.woreda,
    credit_score: profile.credit_score,
    welcome_bonus_paid: profile.welcome_bonus_paid || false,
    updated_at: new Date().toISOString(),
  };
  return supaQuery<User>((c) =>
    c.from('profiles').upsert(data, { onConflict: 'id' }).select().single()
  );
}

/**
 * checkPhoneExists — checks if a phone number is already registered.
 */
export async function checkPhoneExists(
  phone: string
): Promise<{ id: string; role: string } | null> {
  if (!hasSupabase()) {
    return null;
  }
  const { data } = await supaQuery<{ id: string; role: string }>((c) =>
    c.from('profiles').select('id, role').eq('phone', phone).maybeSingle()
  );
  return data;
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
    const r = await supaQuery<any>((c) =>
      c.from('profiles').select('*, merchants(*)').eq('phone', normalizedPhone).maybeSingle()
    );
    if (r.data) row = flattenUser(r.data);
    else {
      // Fallback: search for variations
      const alt = normalizedPhone.startsWith('+251')
        ? '0' + normalizedPhone.slice(4)
        : normalizedPhone;
      const r2 = await supaQuery<any>((c) =>
        c.from('profiles').select('*, merchants(*)').eq('phone', alt).maybeSingle()
      );
      if (r2.data) row = flattenUser(r2.data);
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
 * updateUserRole — persists a role change for the user.
 */
export async function updateUserRole(userId: string, newRole: string) {
  return supaQuery<void>((c) => c.from('profiles').update({ role: newRole }).eq('id', userId));
}

/**
 * registerMerchant — registers a user as a merchant in both profiles and merchants tables.
 */
export async function registerMerchant(
  userId: string,
  merchantData: {
    business_name: string;
    merchant_type: string;
    tin?: string;
    license_no?: string;
    details?: any;
  }
) {
  // 1. Update Profile Role
  const pRes = await supaQuery((c) =>
    c.from('profiles').update({ role: 'merchant' }).eq('id', userId)
  );
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
          merchant_status: 'PENDING',
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

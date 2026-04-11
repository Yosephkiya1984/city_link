import { getClient, supaQuery, hasSupabase } from './supabase';
import { fetchWallet, ensureWallet } from './wallet.service';

/**
 * fetchProfile — fetches a user's profile by their ID.
 */
export async function fetchProfile(userId) {
  return supaQuery((c) => c.from('profiles').select('*').eq('id', userId).maybeSingle());
}

/**
 * upsertProfile — creates or updates a user's profile.
 */
export async function upsertProfile(profile) {
  // Only use fields that exist in database schema
  const data = {
    id: profile.id,
    phone: profile.phone,
    full_name: profile.full_name,
    role: profile.role || 'citizen',
    kyc_status: profile.kyc_status || 'NONE',
    subcity: profile.subcity,
    woreda: profile.woreda,
    merchant_type: profile.merchant_type,
    business_name: profile.business_name,
    tin: profile.tin,
    license_no: profile.license_no,
    trade_license: profile.trade_license,
    credit_score: profile.credit_score,
    welcome_bonus_paid: profile.welcome_bonus_paid || false,
    updated_at: new Date().toISOString(),
  };
  return supaQuery((c) => c.from('profiles').upsert(data, { onConflict: 'id' }));
}

/**
 * checkPhoneExists — checks if a phone number is already registered.
 */
export async function checkPhoneExists(phone) {
  if (!hasSupabase()) {
    // In dev mode without Supabase, return null (no existing user)
    return null;
  }
  const { data } = await supaQuery((c) => 
    c.from('profiles').select('id, role').eq('phone', phone).maybeSingle()
  );
  return data;
}

/**
 * loadSessionProfile — load profile + balance for a session.
 * Resolves OTP-bypass IDs via phone lookup if necessary.
 */
export async function loadSessionProfile(authUser, normalizedPhone) {
  if (!getClient()) return null;
  let row = null;
  const authId = authUser?.id;
  if (authId && !String(authId).startsWith('local-')) {
    const r = await fetchProfile(authId);
    if (r.data) row = r.data;
  }
  if (!row && normalizedPhone) {
    // Attempt lookup by normalized phone
    const r = await supaQuery((c) =>
      c.from('profiles').select('*').eq('phone', normalizedPhone).maybeSingle()
    );
    if (r.data) row = r.data;
    else {
      // Fallback: search for variations (some users might have stored it without +251 or with 09)
      const alt = normalizedPhone.startsWith('+251') ? '0' + normalizedPhone.slice(4) : normalizedPhone;
      const r2 = await supaQuery((c) =>
        c.from('profiles').select('*').eq('phone', alt).maybeSingle()
      );
      if (r2.data) row = r2.data;
    }
  }
  if (!row) return null;
  let balance = 0;
  const w = await fetchWallet(row.id);
  if (w.data) balance = Number(w.data.balance) || 0;
  else {
    const ensured = await ensureWallet(row.id);
    if (ensured.data) balance = Number(ensured.data.balance) || 0;
  }
  return { profile: row, balance };
}

/**
 * updateUserRole — persists a role change for the user.
 */
export async function updateUserRole(userId, newRole) {
  return supaQuery((c) => 
    c.from('profiles').update({ role: newRole }).eq('id', userId)
  );
}

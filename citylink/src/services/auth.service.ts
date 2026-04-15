import { getClient } from './supabase';
import { Config } from '../config';
import { uid, normalizePhone } from '../utils';
import { User as AppUser } from '../types';
import { Session } from '@supabase/supabase-js';

// Re-export auth-adjacent helpers so screens can import from one place
export { checkPhoneExists, fetchProfile } from './profile.service';

interface AuthResponse {
  error: string | null;
  success: boolean;
  devOtp?: string;
}

interface VerifyResponse {
  user: { id: string; phone?: string } | null;
  error: string | null;
}

/**
 * sendOtp — sends a 6-digit code to the user's phone.
 * Dev builds use a simulated OTP flow gated by __DEV__ (compile-time constant).
 * Production builds ALWAYS use Supabase Auth. No config-based bypass exists.
 */
export async function sendOtp(phone: string, metadata: Record<string, string | number | boolean> | null = null): Promise<AuthResponse> {
  const client = getClient();
  if (!client) return { error: 'no-credentials', success: false };

  // DEV-ONLY: Simulated OTP for development/emulator testing.
  // __DEV__ is a compile-time constant stripped from production bundles.
  if (__DEV__) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    console.log(`[CityLink Dev] Simulated OTP for ${phone}: ${otp}`);
    return { error: null, success: true, devOtp: otp };
  }

  const payload: { phone: string; channel: 'sms'; options?: { data: Record<string, string | number | boolean> } } = { phone, channel: 'sms' };
  if (metadata) {
    payload.options = { data: metadata };
  }

  const { error } = await client.auth.signInWithOtp(payload);
  return { error: error?.message || null, success: !error };
}

/**
 * verifyOtp — verifies the code sent to the phone.
 * Returns a session/user object.
 */
export async function verifyOtp(phone: string, token: string): Promise<VerifyResponse> {
  const client = getClient();
  if (!client) return { user: null, error: 'no-credentials' };

  // DEV-ONLY: Simulated verification for emulator testing.
  if (__DEV__) {
    console.log(`[CityLink Dev] Simulated OTP verification for ${phone}`);
    const norm = normalizePhone(phone);
    const alt = norm.startsWith('+251') ? '0' + norm.slice(4) : norm;

    const { data } = await getClient()
      .from('profiles')
      .select('id')
      .or(`phone.eq."${norm}",phone.eq."${alt}",phone.eq."${phone}"`)
      .maybeSingle();

    return {
      user: { id: data?.id || uid(), phone },
      error: null,
    };
  }
  const { data, error } = await client.auth.verifyOtp({ phone, token, type: 'sms' });
  return { user: data?.user || null, error: error?.message || null };
}

/**
 * getSession — returns the current active Supabase session.
 */
export async function getSession(): Promise<Session | null> {
  const client = getClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session || null;
}

/**
 * signOut — logs out the current user.
 */
export async function signOut(): Promise<void> {
  const client = getClient();
  if (client) await client.auth.signOut();
}

interface GovAuthResponse {
  user: AppUser | null;
  error: string | null;
}

/**
 * govBadgeLogin — authenticates a government staff member via Badge ID and PIN.
 * Production: Authenticates against the government auth gateway.
 * Dev: Falls back to DB lookup if the gateway is unavailable (no hardcoded credentials).
 */
export async function govBadgeLogin(badgeId: string, secPin: string): Promise<GovAuthResponse> {
  const BASE_URL = Config.govAuthBaseUrl;
  const client = getClient();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeId, pin: secPin }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { user: data.user as AppUser, error: null };
    }

    if (__DEV__ && (response.status === 404 || response.status >= 500) && client) {
      console.warn('[CityLink Auth] Gov gateway unavailable — falling back to dev DB');
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('role', 'admin')
          .eq('badge_id', badgeId)
          .eq('sec_pin', secPin)
          .maybeSingle();

        if (error) {
          console.warn('[CityLink Auth] Dev fallback query error:', error);
          return { user: null, error: 'Invalid credentials' };
        }

        if (data) return { user: data as AppUser, error: null };
      } catch (dbError) {
        console.warn('[CityLink Auth] Dev fallback DB error:', dbError);
        if (process.env.ALLOW_DEV_AUTH_FALLBACK !== 'true') {
          return { user: null, error: 'Invalid credentials' };
        }
      }
      return { user: null, error: 'Invalid credentials' };
    }

    const errData = await response.json().catch(() => ({}));
    return { user: null, error: errData.message || 'Invalid government credentials' };

  } catch (err: any) {
    clearTimeout(timeoutId);
    if (__DEV__ && client) {
      console.warn('[CityLink Auth] Network error — falling back to dev DB');
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('role', 'admin')
          .eq('badge_id', badgeId)
          .eq('sec_pin', secPin)
          .maybeSingle();

        if (error) {
          console.warn('[CityLink Auth] Dev fallback query error:', error);
          return { user: null, error: 'Invalid credentials' };
        }

        if (data) return { user: data as AppUser, error: null };
      } catch (dbError) {
        console.warn('[CityLink Auth] Dev fallback DB error:', dbError);
        if (process.env.ALLOW_DEV_AUTH_FALLBACK !== 'true') {
          return { user: null, error: 'Invalid credentials' };
        }
      }
      return { user: null, error: 'Invalid credentials' };
    }
    
    const msg = err.name === 'AbortError' ? 'Connection timed out' : 'Government gateway unavailable';
    return { user: null, error: msg };
  }
}

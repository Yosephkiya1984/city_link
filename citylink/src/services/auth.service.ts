import { getClient } from './supabase';
import { Config } from '../config';
import { uid } from '../utils';
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
    return {
      user: { id: uid(), phone },
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

  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeId, secPin })
    });

    if (!response.ok) {
      // DEV-ONLY: If the gov gateway is not running locally, fall back to DB lookup.
      // In production, we fail closed — no fallback.
      if (__DEV__ && response.status === 404 && client) {
        console.warn('[CityLink Auth] Gov auth endpoint unavailable — DEV DB fallback');

        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('role', 'admin')
          .eq('badge_id', badgeId)
          .maybeSingle();

        if (error) {
          console.error('[CityLink Auth] Error querying admin profile:', error);
          return { user: null, error: error.message };
        }

        if (data) return { user: data as AppUser, error: null };
      }
      return { user: null, error: 'Invalid government credentials.' };
    }

    const data = await response.json();
    return { user: data.user as AppUser, error: data.error || null };

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[CityLink Auth] Gov login network error:', msg);
    return { user: null, error: msg || 'Network error. Please ensure you are on a restricted gateway.' };
  }
}

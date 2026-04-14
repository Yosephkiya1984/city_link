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
 * Supports OTP bypass in development mode.
 */
export async function sendOtp(phone: string, metadata: Record<string, string | number | boolean> | null = null): Promise<AuthResponse> {
  const client = getClient();
  if (!client) return { error: 'no-credentials', success: false };

  // SECURITY: Hard-block OTP bypass in production builds regardless of config
  if (Config.otpBypass && !__DEV__) {
    console.error('[SECURITY] OTP bypass attempted in production — blocked.');
    return { error: 'otp-bypass-blocked', success: false };
  }

  // FAIL-CLOSED: Bypass only if explicitly enabled AND we are in dev
  if (Config.otpBypass && __DEV__) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    console.log(`[CityLink Dev] OTP Bypass active for ${phone}. Simulated OTP: ${otp}`);
    return { error: null, success: true, devOtp: otp };
  }

  const payload: { phone: string; channel: 'sms'; options?: { data: any } } = { phone, channel: 'sms' };
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

  if (Config.otpBypass && (Config.devMode || __DEV__)) {
    console.log(`[CityLink Dev] OTP Verification Bypass active for ${phone}`);
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
  user: Partial<AppUser> | null;
  error: string | null;
}

/**
 * govBadgeLogin — authenticates a government staff member via Badge ID and PIN.
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
      if ((Config.devMode || __DEV__) && response.status === 404 && client) {
        console.warn('[CityLink Auth] Gov auth endpoint unavailable — using DB fallback');
        
        // SECURITY: Verify the PIN even in fallback mode.
        const isDevBypass = process.env.EXPO_PUBLIC_OTP_BYPASS === 'true';
        const isValidMockPin = secPin === '8888';
        
        if (!isDevBypass && !isValidMockPin) {
          return { user: null, error: 'Unauthorized: Invalid PIN provided for administrative access.' };
        }

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
    return { user: data.user, error: data.error || null };

  } catch (err: any) {
    console.error('[CityLink Auth] Gov login network error:', err);
    return { user: null, error: err?.message || 'Network error. Please ensure you are on a restricted gateway.' };
  }
}

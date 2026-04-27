import { getClient } from './supabase';
import { Config } from '../config';
import { User as AppUser } from '../types';
import { Session } from '@supabase/supabase-js';
import { clearAllStores } from '../store/StoreUtils';

// Import and re-export auth-adjacent helpers so screens can import from one place
import { checkPhoneExists, fetchProfile } from './profile.service';
export { checkPhoneExists, fetchProfile };

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
 * sendOtp — sends a 6-digit code to the user's phone or email.
 * Production builds ALWAYS use Supabase Auth.
 */
export async function sendOtp(
  identifier: string,
  metadata: Record<string, string | number | boolean> | null = null
): Promise<AuthResponse> {
  const isEmail = identifier.includes('@');

  // Validate format
  if (!isEmail) {
    const phoneRegex = /^(\+)?251[789]\d{8}$/;
    if (!phoneRegex.test(identifier)) {
      return { error: 'invalid-phone-format', success: false };
    }
  }

  const client = getClient();
  if (!client) return { error: 'no-credentials', success: false };

  const payload: any = isEmail 
    ? { email: identifier } 
    : { phone: identifier, channel: 'sms' };

  if (metadata) {
    payload.options = { data: metadata };
  }

  const { error } = await client.auth.signInWithOtp(payload);
  return { error: error?.message || null, success: !error };
}

/**
 * verifyOtp — verifies the code sent to the phone or email.
 * Returns a session/user object.
 */
export async function verifyOtp(identifier: string, token: string): Promise<VerifyResponse> {
  const isEmail = identifier.includes('@');

  // Validate inputs
  if (!isEmail) {
    const phoneRegex = /^(\+)?251[789]\d{8}$/;
    if (!phoneRegex.test(identifier)) {
      return { user: null, error: 'invalid-phone-format' };
    }
  }

  const tokenRegex = /^\d{6,8}$/;
  if (!tokenRegex.test(token)) {
    return { user: null, error: 'invalid-token-format' };
  }

  const client = getClient();
  if (!client) return { user: null, error: 'no-credentials' };

  const payload: any = isEmail
    ? { email: identifier, token, type: 'email' }
    : { phone: identifier, token, type: 'sms' };

  const { data, error } = await client.auth.verifyOtp(payload);
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
 * Consistently wipes all local data and stores.
 */
export async function signOut(): Promise<void> {
  const client = getClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (err) {
      console.warn('[AuthService] Supabase signOut failed:', err);
    }
  }

  try {
    const { clearAllStores } = await import('../store/StoreUtils');
    await clearAllStores();
  } catch (err) {
    console.warn('[AuthService] clearAllStores failed during signOut:', err);
  }
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

    const errData = await response.json().catch(() => ({}));
    return { user: null, error: errData.message || 'Invalid government credentials' };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    const isAbort = err instanceof Error && err.name === 'AbortError';
    const msg = isAbort ? 'Connection timed out' : 'Government gateway unavailable';
    return { user: null, error: msg };
  }
}

import { getClient } from './supabase';
import { Config } from '../config';
import { uid, normalizePhone } from '../utils';
import { User as AppUser } from '../types';
import { Session } from '@supabase/supabase-js';
import { SecurePersist } from '../store/SecurePersist';

const DEV_OTP_EXPIRATION_MS = 5 * 60 * 1000;
const DEV_OTP_STORAGE_PREFIX = 'dev_otp_';

function getDevOtpKey(phone: string) {
  return `${DEV_OTP_STORAGE_PREFIX}${phone.replace(/\D/g, '')}`;
}

async function saveDevOtp(phone: string, otp: string): Promise<void> {
  const payload = {
    otp,
    expires_at: new Date(Date.now() + DEV_OTP_EXPIRATION_MS).toISOString(),
  };
  await SecurePersist.setItem(getDevOtpKey(phone), JSON.stringify(payload));
}

async function loadDevOtp(phone: string): Promise<{ otp: string; expires_at: string } | null> {
  const raw = await SecurePersist.getItem(getDevOtpKey(phone));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { otp: string; expires_at: string };
  } catch {
    return null;
  }
}

async function clearDevOtp(phone: string): Promise<void> {
  await SecurePersist.deleteItem(getDevOtpKey(phone));
}

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
export async function sendOtp(
  phone: string,
  metadata: Record<string, string | number | boolean> | null = null
): Promise<AuthResponse> {
  // Validate phone number format
  const phoneRegex = /^\+251[79]\d{8}$/;
  if (!phoneRegex.test(phone)) {
    return { error: 'invalid-phone-format', success: false };
  }

  const client = getClient();
  if (!client) return { error: 'no-credentials', success: false };

  // DEV-ONLY: Simulated OTP for development/emulator testing.
  // __DEV__ is a compile-time constant stripped from production bundles.
  if (__DEV__) {
    const normalizedPhone = normalizePhone(phone);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await saveDevOtp(normalizedPhone, otp);
    console.log(`[CityLink Dev] Simulated OTP for ${phone}: ${otp}`);
    return { error: null, success: true, devOtp: otp };
  } else {
    // In production, we don't mock. If this code runs, we must proceed to real SMS provider.
    // If the below SMS call fails, it must naturally fail. No fallback mock is permitted.
  }

  const payload: {
    phone: string;
    channel: 'sms';
    options?: { data: Record<string, string | number | boolean> };
  } = { phone, channel: 'sms' };
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
  // Validate inputs
  const phoneRegex = /^\+251[79]\d{8}$/;
  if (!phoneRegex.test(phone)) {
    return { user: null, error: 'invalid-phone-format' };
  }
  const tokenRegex = /^\d{6}$/;
  if (!tokenRegex.test(token)) {
    return { user: null, error: 'invalid-token-format' };
  }

  const client = getClient();
  if (!client) return { user: null, error: 'no-credentials' };

  // DEV-ONLY: Simulated verification for emulator testing.
  if (__DEV__) {
    console.log(`[CityLink Dev] Simulated OTP verification for ${phone}`);
    const normalizedPhone = normalizePhone(phone);
    const otpInfo = await loadDevOtp(normalizedPhone);
    if (!otpInfo) {
      return { user: null, error: 'otp_not_sent' };
    }
    if (new Date() > new Date(otpInfo.expires_at)) {
      await clearDevOtp(normalizedPhone);
      return { user: null, error: 'otp_expired' };
    }
    if (token !== otpInfo.otp) {
      return { user: null, error: 'invalid-token' };
    }

    await clearDevOtp(normalizedPhone);

    const alt = normalizedPhone.startsWith('+251') ? '0' + normalizedPhone.slice(4) : normalizedPhone;
    const { data } = await client
      .from('profiles')
      .select('id')
      .in('phone', [normalizedPhone, alt, phone])
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
          .rpc('verify_gov_admin_dev', { p_badge_id: badgeId, p_sec_pin: secPin })
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
    }

    const errData = await response.json().catch(() => ({}));
    return { user: null, error: errData.message || 'Invalid government credentials' };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (__DEV__ && client) {
      console.warn('[CityLink Auth] Network error — falling back to dev DB');
      try {
        const { data, error } = await client
          .rpc('verify_gov_admin_dev', { p_badge_id: badgeId, p_sec_pin: secPin })
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
    }

    const msg =
      err.name === 'AbortError' ? 'Connection timed out' : 'Government gateway unavailable';
    return { user: null, error: msg };
  }
}

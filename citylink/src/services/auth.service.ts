import { getClient } from './supabase';
import { Config } from '../config';
import { uid } from '../utils';
import { ViewStyle, TextStyle } from 'react-native';

// Re-export auth-adjacent helpers so screens can import from one place
export { checkPhoneExists } from './profile.service';

/**
 * sendOtp — sends a 6-digit code to the user's phone.
 * Supports OTP bypass in development mode.
 */
export async function sendOtp(phone: string, metadata: any = null) {
  const client = getClient();
  if (!client || Config.otpBypass) {
    // OTP bypass: return simulated OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    console.log(`[CityLink Dev] OTP Bypass active for ${phone}. Simulated OTP: ${otp}`);
    return { error: null, devOtp: otp };
  }

  const payload: any = { phone, channel: 'sms' };
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
export async function verifyOtp(phone: string, token: string) {
  const client = getClient();
  if (!client || Config.otpBypass) {
    // In bypass mode just return a mock user with a valid UUID format
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
export async function getSession() {
  const client = getClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session || null;
}

/**
 * signOut — logs out the current user.
 */
export async function signOut() {
  const client = getClient();
  if (client) await client.auth.signOut();
}

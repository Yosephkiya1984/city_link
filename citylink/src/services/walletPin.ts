import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const storageKey = (userId: string): string => `cl_wallet_pin_v1_${userId}`;

/**
 * SHA-256 hash of the PIN (hex). Never store the raw PIN.
 */
export async function hashWalletPin(plain: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, plain, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

/** 4–6 digit numeric PIN (Goal §2). */
export function isValidPinFormat(plain: string): boolean {
  return typeof plain === 'string' && /^\d{4,6}$/.test(plain);
}

export async function hasWalletPin(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const h = await SecureStore.getItemAsync(storageKey(userId));
    return !!h;
  } catch {
    return false;
  }
}

export async function verifyWalletPin(userId: string, plain: string): Promise<boolean> {
  if (!userId || !isValidPinFormat(plain)) return false;
  try {
    const stored = await SecureStore.getItemAsync(storageKey(userId));
    if (!stored) return false;
    const h = await hashWalletPin(plain);
    return h === stored;
  } catch {
    return false;
  }
}

export async function setWalletPin(userId: string, plain: string): Promise<{ ok: boolean; error?: string }> {
  if (!userId) return { ok: false, error: 'missing_user' };
  if (!isValidPinFormat(plain)) return { ok: false, error: 'invalid_format' };
  try {
    const h = await hashWalletPin(plain);
    await SecureStore.setItemAsync(storageKey(userId), h);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function changeWalletPin(userId: string, currentPlain: string, newPlain: string): Promise<{ ok: boolean; error?: string }> {
  const ok = await verifyWalletPin(userId, currentPlain);
  if (!ok) return { ok: false, error: 'wrong_current' };
  return setWalletPin(userId, newPlain);
}

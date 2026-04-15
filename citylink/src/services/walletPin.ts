import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const storageKey = (userId: string): string => `cl_wallet_pin_v2_${userId}`;
const SALT_ITERATIONS = 10000;
const GLOBAL_SALT = 'citylink_secure_salt_2024';

/**
 * PBKDF2-style hardened hash.
 * 4–6 digit PINs are vulnerable to brute-force; stretching makes it much harder.
 */
export async function hashWalletPin(plain: string, userId: string): Promise<string> {
  let hash = `${plain}:${userId}:${GLOBAL_SALT}`;
  for (let i = 0; i < SALT_ITERATIONS; i++) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hash, {
      encoding: Crypto.CryptoEncoding.HEX,
    });
  }
  return hash;
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
    const h = await hashWalletPin(plain, userId);
    return h === stored;
  } catch {
    return false;
  }
}

export async function setWalletPin(userId: string, plain: string): Promise<{ ok: boolean; error?: string }> {
  if (!userId) return { ok: false, error: 'missing_user' };
  if (!isValidPinFormat(plain)) return { ok: false, error: 'invalid_format' };
  try {
    const h = await hashWalletPin(plain, userId);
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

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const storageKey = (userId) => `cl_wallet_pin_v1_${userId}`;

/**
 * SHA-256 hash of the PIN (hex). Never store the raw PIN.
 */
export async function hashWalletPin(plain) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, plain, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

/** 4–6 digit numeric PIN (Goal §2). */
export function isValidPinFormat(plain) {
  return typeof plain === 'string' && /^\d{4,6}$/.test(plain);
}

export async function hasWalletPin(userId) {
  if (!userId) return false;
  try {
    const h = await SecureStore.getItemAsync(storageKey(userId));
    return !!h;
  } catch {
    return false;
  }
}

export async function verifyWalletPin(userId, plain) {
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

export async function setWalletPin(userId, plain) {
  if (!userId) return { ok: false, error: 'missing_user' };
  if (!isValidPinFormat(plain)) return { ok: false, error: 'invalid_format' };
  try {
    const h = await hashWalletPin(plain);
    await SecureStore.setItemAsync(storageKey(userId), h);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function changeWalletPin(userId, currentPlain, newPlain) {
  const ok = await verifyWalletPin(userId, currentPlain);
  if (!ok) return { ok: false, error: 'wrong_current' };
  return setWalletPin(userId, newPlain);
}

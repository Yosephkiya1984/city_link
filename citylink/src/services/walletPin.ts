import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import QuickCrypto from 'react-native-quick-crypto';

const V1_PREFIX = 'cl_wallet_pin_v1_'; // Legacy (Custom SHA-256 loop, Global Salt)
const V2_PREFIX = 'cl_wallet_pin_v2_'; // Intermediate (Custom SHA-256 loop, Per-user Salt) -- Now deprecated
const V3_PREFIX = 'cl_wallet_pin_v3_'; // Modern (PBKDF2-HMAC-SHA256, Per-user Salt)

const SALT_ITERATIONS_MODERN = 600000; // OWASP recommendation for PBKDF2
const SALT_ITERATIONS_LEGACY = 10000;
const GLOBAL_SALT_V1 = 'citylink_secure_salt_2024';

const getV1Key = (userId: string) => `${V1_PREFIX}${userId}`;
const getV2Key = (userId: string) => `${V2_PREFIX}${userId}`;
const getV3Key = (userId: string) => `${V3_PREFIX}${userId}`;

/** Generates a 16-byte random salt as a hex string. */
async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Legacy "PBKDF2-style" hash (actually custom iterative SHA-256 stretch).
 * This is maintained for migration support only.
 */
async function hashLegacy(plain: string, userId: string, salt: string): Promise<string> {
  let hash = `${plain}:${userId}:${salt}`;
  for (let i = 0; i < SALT_ITERATIONS_LEGACY; i++) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hash, {
      encoding: Crypto.CryptoEncoding.HEX,
    });
  }
  return hash;
}

/**
 * Modern PBKDF2-HMAC-SHA256 hash using native native implementation.
 * Performed asynchronously to avoid UI blocking.
 */
export async function hashWalletPin(plain: string, userId: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Combine password and userId for the password input to PBKDF2
    const password = `${plain}:${userId}`;
    
    QuickCrypto.pbkdf2(
      password,
      salt,
      SALT_ITERATIONS_MODERN,
      32, // keylen
      'sha256',
      (err, derivedKey) => {
        if (err) {
          reject(err);
        } else if (derivedKey) {
          resolve(derivedKey.toString('hex'));
        } else {
          reject(new Error('Derived key is undefined'));
        }
      }
    );
  });
}

/** 4–6 digit numeric PIN. */
export function isValidPinFormat(plain: string): boolean {
  return typeof plain === 'string' && /^\d{4,6}$/.test(plain);
}

/**
 * Constant-time comparison to prevent timing attacks on hashes.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Check if user has a PIN in any supported storage version. */
export async function hasWalletPin(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const v3 = await SecureStore.getItemAsync(getV3Key(userId));
    if (v3) return true;
    const v2 = await SecureStore.getItemAsync(getV2Key(userId));
    if (v2) return true;
    const v1 = await SecureStore.getItemAsync(getV1Key(userId));
    return !!v1;
  } catch {
    return false;
  }
}

/** 
 * Migration path to V3 security.
 */
async function migrateToV3(userId: string, plain: string): Promise<void> {
  try {
    const salt = await generateSalt();
    const hash = await hashWalletPin(plain, userId, salt);
    // Store as hash:salt
    await SecureStore.setItemAsync(getV3Key(userId), `${hash}:${salt}`);
    
    // Cleanup old versions
    await SecureStore.deleteItemAsync(getV1Key(userId));
    await SecureStore.deleteItemAsync(getV2Key(userId));
    
    console.log('[WalletPin] Security migration to V3 (PBKDF2) completed.');
  } catch (err) {
    console.error('[WalletPin] Migration to V3 failed:', err);
  }
}

export async function verifyWalletPin(userId: string, plain: string): Promise<boolean> {
  if (!userId || !isValidPinFormat(plain)) return false;
  try {
    // 1. Try V3 (Modern: Native PBKDF2)
    const storedV3 = await SecureStore.getItemAsync(getV3Key(userId));
    if (storedV3 && storedV3.includes(':')) {
      const [hash, salt] = storedV3.split(':');
      const h = await hashWalletPin(plain, userId, salt);
      return timingSafeEqual(h, hash);
    }

    // 2. Try V2 (Intermediate: Custom Loop + Per-user Salt)
    const storedV2 = await SecureStore.getItemAsync(getV2Key(userId));
    if (storedV2 && storedV2.includes(':')) {
      const [hash, salt] = storedV2.split(':');
      const h = await hashLegacy(plain, userId, salt);
      if (timingSafeEqual(h, hash)) {
        await migrateToV3(userId, plain);
        return true;
      }
    }

    // 3. Try V1 (Legacy: Custom Loop + Global Salt)
    const storedV1 = await SecureStore.getItemAsync(getV1Key(userId));
    if (storedV1) {
      const h = await hashLegacy(plain, userId, GLOBAL_SALT_V1);
      if (timingSafeEqual(h, storedV1)) {
        await migrateToV3(userId, plain);
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export async function setWalletPin(userId: string, plain: string): Promise<{ ok: boolean; error?: string }> {
  if (!userId) return { ok: false, error: 'missing_user' };
  if (!isValidPinFormat(plain)) return { ok: false, error: 'invalid_format' };
  try {
    const salt = await generateSalt();
    const hash = await hashWalletPin(plain, userId, salt);
    // Always use V3 for new pins
    await SecureStore.setItemAsync(getV3Key(userId), `${hash}:${salt}`);
    
    // Cleanup old versions if they existed
    await SecureStore.deleteItemAsync(getV1Key(userId));
    await SecureStore.deleteItemAsync(getV2Key(userId));
    
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

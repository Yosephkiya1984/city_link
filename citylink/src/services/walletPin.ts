import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';
import { supaQuery } from './supabase';

const V1_PREFIX = 'cl_wallet_pin_v1_'; // Legacy (Custom SHA-256 loop, Global Salt)
const V2_PREFIX = 'cl_wallet_pin_v2_'; // Intermediate (Custom SHA-256 loop, Per-user Salt) -- Now deprecated
const V3_PREFIX = 'cl_wallet_pin_v3_'; // Modern (PBKDF2-HMAC-SHA256, Per-user Salt)

const SALT_ITERATIONS_MODERN = 600000; // OWASP recommendation for PBKDF2
const SALT_ITERATIONS_LEGACY = 10000;
const GLOBAL_SALT_V1 = 'citylink_secure_salt_2024';
const SYNC_PENDING_KEY = 'cl_wallet_pin_needs_sync';

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
 * Modern PBKDF2-HMAC-SHA256 hash using CryptoJS (Expo Go compatible).
 * Performed with 600,000 iterations for world-class security.
 */
export async function hashWalletPin(plain: string, userId: string, salt: string): Promise<string> {
  const password = `${plain}:${userId}`;

  // 🛡️ World-Class Security: Primary PBKDF2 implementation using pure JS
  // This ensures 100% compatibility with Expo Go while maintaining high security.
  const derived = CryptoJS.PBKDF2(password, salt, {
    keySize: 32 / 4, // 256 bits
    iterations: SALT_ITERATIONS_MODERN,
    hasher: CryptoJS.algo.SHA256,
  });

  return derived.toString(CryptoJS.enc.Hex);
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
    const currentHash = await getCurrentPinHash(userId);
    const salt = await generateSalt();
    const hash = await hashWalletPin(plain, userId, salt);
    // Store as hash:salt
    await SecureStore.setItemAsync(getV3Key(userId), `${hash}:${salt}`);

    // SYNC TO DB (Bulletproof Hardening)
    await syncPinHashToDB(userId, hash, currentHash);

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
      const matched = timingSafeEqual(h, hash);

      if (matched) {
        // If matched but we have a pending sync, try it now
        const needsSync = await SecureStore.getItemAsync(SYNC_PENDING_KEY);
        if (needsSync === userId) {
          syncPinHashToDB(userId, hash);
        }
      }
      return matched;
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

/**
 * verifyWalletPinAndGetHash - Verifies and returns the hash for server-side binding.
 */
export async function verifyWalletPinAndGetHash(
  userId: string,
  plain: string
): Promise<{ ok: boolean; hash?: string }> {
  const ok = await verifyWalletPin(userId, plain);
  if (!ok) return { ok: false };
  const hash = await getCurrentPinHash(userId);
  return { ok: true, hash: hash || undefined };
}

export async function setWalletPin(
  userId: string,
  plain: string
): Promise<{ ok: boolean; error?: string }> {
  if (!userId) return { ok: false, error: 'missing_user' };
  if (!isValidPinFormat(plain)) return { ok: false, error: 'invalid_format' };
  try {
    const currentHash = await getCurrentPinHash(userId);
    const salt = await generateSalt();
    const hash = await hashWalletPin(plain, userId, salt);
    // Always use V3 for new pins
    await SecureStore.setItemAsync(getV3Key(userId), `${hash}:${salt}`);

    // SYNC TO DB (Bulletproof Hardening)
    await syncPinHashToDB(userId, hash, currentHash);

    // Cleanup old versions if they existed
    await SecureStore.deleteItemAsync(getV1Key(userId));
    await SecureStore.deleteItemAsync(getV2Key(userId));

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/**
 * getCurrentPinHash - Returns the hash part of the stored V3 PIN for server-side verification.
 */
export async function getCurrentPinHash(userId: string): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(getV3Key(userId));
  if (stored && stored.includes(':')) {
    return stored.split(':')[0];
  }
  return null;
}

/**
 * syncPinHashToDB - Ensures the server has the hash for verification.
 */
/**
 * syncPinHashToDB - Ensures the server has the hash for verification.
 * Uses the secure_update_pin_hash RPC to prevent unauthorized hash overwrites.
 */
async function syncPinHashToDB(userId: string, hash: string, oldHash: string | null = null) {
  try {
    const res = await supaQuery<{ success: boolean; error?: string }>((c) =>
      c.rpc('secure_update_pin_hash', {
        p_new_hash: hash,
        p_old_hash: oldHash,
      })
    );

    if (res.data?.success) {
      await SecureStore.deleteItemAsync(SYNC_PENDING_KEY);
    } else {
      throw new Error(res.data?.error || res.error || 'PIN sync failed');
    }
  } catch (err) {
    console.warn('[WalletPin] DB sync failed (offline?), marked for retry.', err);
    await SecureStore.setItemAsync(SYNC_PENDING_KEY, userId);
  }
}

/**
 * ensureFullSync - Manual trigger to clear pending syncs (e.g. on app start)
 */
export async function ensureFullSync(userId: string) {
  const pending = await SecureStore.getItemAsync(SYNC_PENDING_KEY);
  if (pending === userId) {
    const hash = await getCurrentPinHash(userId);
    if (hash) await syncPinHashToDB(userId, hash);
  }
}

export async function changeWalletPin(
  userId: string,
  currentPlain: string,
  newPlain: string
): Promise<{ ok: boolean; error?: string }> {
  const currentHash = await getCurrentPinHash(userId);
  const ok = await verifyWalletPin(userId, currentPlain);
  if (!ok) return { ok: false, error: 'wrong_current' };

  // Generate new pin locally
  const salt = await generateSalt();
  const newHash = await hashWalletPin(newPlain, userId, salt);

  // Update local storage
  await SecureStore.setItemAsync(getV3Key(userId), `${newHash}:${salt}`);

  // Sync to DB with old hash verification
  await syncPinHashToDB(userId, newHash, currentHash);

  // Cleanup old versions
  await SecureStore.deleteItemAsync(getV1Key(userId));
  await SecureStore.deleteItemAsync(getV2Key(userId));

  return { ok: true };
}

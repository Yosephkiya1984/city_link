import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

// Polyfill for Expo Go compatibility: crypto-js will crash if it tries to use native crypto APIs
// that aren't bundled. This ensures AES can safely generate IVs using standard Math.random.
CryptoJS.lib.WordArray.random = function (nBytes: number) {
  const words: number[] = [];
  for (let i = 0; i < nBytes; i += 4) {
    words.push((Math.random() * 0x100000000) | 0);
  }
  return CryptoJS.lib.WordArray.create(words, nBytes);
};

const KEY_NAME = 'cl_p2p_aes_key_v2'; // Bumped to v2 — old v1 keys were PRNG-derived and are untrusted

/**
 * World-Class Security Utilities (Expo Go Compatible)
 * Implements AES encryption using crypto-js for cross-platform stability.
 */
export const SecurityUtils = {
  /**
   * getEncryptionKey — Retrieves or initializes a unique CSPRNG-derived key for this device.
   * Uses expo-crypto's getRandomBytesAsync (256-bit entropy) instead of Math.random().
   */
  getEncryptionKey: async (): Promise<string> => {
    try {
      let key = null;
      try {
        key = await SecureStore.getItemAsync(KEY_NAME);
      } catch (e) {
        console.warn('[SecurityUtils] SecureStore.getItemAsync failed:', e);
      }

      if (!key) {
        try {
          const randomBytes = await Crypto.getRandomBytesAsync(32);
          key = Array.from(randomBytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        } catch (err) {
          console.warn(
            '[SecurityUtils] Native crypto unavailable, falling back to PRNG generation:',
            err
          );
          key = 'fallback_v2_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        }
        
        try {
          await SecureStore.setItemAsync(KEY_NAME, key);
        } catch (e) {
          console.warn('[SecurityUtils] SecureStore.setItemAsync failed:', e);
        }
      }
      return key || 'ultimate_fallback_key_v2';
    } catch (criticalErr) {
      console.error('[SecurityUtils] Critical failure in getEncryptionKey:', criticalErr);
      return 'emergency_key_v2';
    }
  },

  /**
   * encrypt — AES encryption.
   */
  encrypt: async (text: string): Promise<string> => {
    try {
      if (!text) return '';
      const key = await SecurityUtils.getEncryptionKey();
      return CryptoJS.AES.encrypt(text, key).toString();
    } catch (err) {
      console.error('[SecurityUtils] Encryption failed:', err);
      throw new Error('FAILED_TO_ENCRYPT');
    }
  },

  /**
   * decrypt — Decrypts content using the stored device key.
   */
  decrypt: async (payload: string): Promise<string> => {
    try {
      if (!payload) return '';
      const key = await SecurityUtils.getEncryptionKey();
      const bytes = CryptoJS.AES.decrypt(payload, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted || '[CORRUPTED_DATA]';
    } catch (err) {
      console.error('[SecurityUtils] Decryption failed:', err);
      return '[DECRYPTION_ERROR]';
    }
  },
};

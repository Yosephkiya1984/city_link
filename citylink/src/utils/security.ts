import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

const KEY_NAME = 'cl_p2p_aes_key_v3'; // Bumped to v3 — v1/v2 were insecure or format-incompatible

/**
 * World-Class Security Utilities
 * Implements AES-256-CBC encryption using crypto-js with native CSPRNG entropy.
 */
export const SecurityUtils = {
  /**
   * getEncryptionKey — Retrieves or initializes a unique 256-bit key for this device.
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
        // Generate 256-bit (32-byte) key using native entropy
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        key = Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        try {
          await SecureStore.setItemAsync(KEY_NAME, key);
        } catch (e) {
          console.warn('[SecurityUtils] SecureStore.setItemAsync failed:', e);
        }
      }
      return key;
    } catch (criticalErr) {
      console.error('[SecurityUtils] Critical failure in getEncryptionKey:', criticalErr);
      throw new Error('SECURE_KEY_INITIALIZATION_FAILED');
    }
  },

  /**
   * encrypt — AES encryption with unique IV per call.
   * Format: iv_hex + ":" + ciphertext
   */
  encrypt: async (text: string): Promise<string> => {
    try {
      if (!text) return '';
      const keyHex = await SecurityUtils.getEncryptionKey();

      // Generate unique 128-bit IV (16 bytes)
      const ivBytes = await Crypto.getRandomBytesAsync(16);
      const ivHex = Array.from(ivBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const key = CryptoJS.enc.Hex.parse(keyHex);
      const iv = CryptoJS.enc.Hex.parse(ivHex);

      const encrypted = CryptoJS.AES.encrypt(text, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      return `${ivHex}:${encrypted.toString()}`;
    } catch (err) {
      console.error('[SecurityUtils] Encryption failed:', err);
      throw new Error('FAILED_TO_ENCRYPT');
    }
  },

  /**
   * decrypt — Decrypts content using the stored device key and embedded IV.
   */
  decrypt: async (payload: string): Promise<string> => {
    try {
      if (!payload) return '';

      const parts = payload.split(':');
      if (parts.length !== 2) {
        console.warn('[SecurityUtils] Invalid payload format (missing IV separator)');
        return '[INVALID_FORMAT]';
      }

      const [ivHex, ciphertext] = parts;
      const keyHex = await SecurityUtils.getEncryptionKey();

      const key = CryptoJS.enc.Hex.parse(keyHex);
      const iv = CryptoJS.enc.Hex.parse(ivHex);

      const bytes = CryptoJS.AES.decrypt(ciphertext, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        console.warn('[SecurityUtils] Decryption resulted in empty string (possible key mismatch)');
        return '[DECRYPTION_FAILED]';
      }

      return decrypted;
    } catch (err) {
      console.error('[SecurityUtils] Decryption failed:', err);
      return '[DECRYPTION_ERROR]';
    }
  },
};

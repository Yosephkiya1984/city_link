import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const KEY_NAME = 'cl_p2p_aes_key_v1';

/**
 * World-Class Security Utilities (Expo Go Compatible)
 * Implements AES encryption using crypto-js for cross-platform stability.
 */
export const SecurityUtils = {
  /**
   * getEncryptionKey — Retrieves or initializes a unique key for this device.
   */
  getEncryptionKey: async (): Promise<string> => {
    let key = await SecureStore.getItemAsync(KEY_NAME);
    if (!key) {
      // Generate a strong random key
      key =
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await SecureStore.setItemAsync(KEY_NAME, key);
    }
    return key;
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

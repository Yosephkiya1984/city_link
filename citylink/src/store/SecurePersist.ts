import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { User, Transaction, ParkingSession } from '../types/domain_types';
import { SecurityUtils } from '../utils/security';

/**
 * SecureStoreAdapter — dedicated for individual sensitive values.
 * Uses expo-secure-store for user identity and balance,
 * AsyncStorage for generic cache entries.
 */
export const SecurePersist = {
  saveUser: async (user: User | null): Promise<void> => {
    if (!user) {
      await SecureStore.deleteItemAsync('citylink-current-user');
      return;
    }
    await SecureStore.setItemAsync('citylink-current-user', JSON.stringify(user));
  },
  loadUser: async (): Promise<User | null> => {
    try {
      const res = await SecureStore.getItemAsync('citylink-current-user');
      return res ? JSON.parse(res) : null;
    } catch (err) {
      console.error('[SecurePersist] Failed to parse stored user:', err);
      return null;
    }
  },
  saveBalance: async (balance: number): Promise<void> => {
    await SecureStore.setItemAsync('citylink-wallet-balance', String(balance));
  },
  loadBalance: async (): Promise<number> => {
    const res = await SecureStore.getItemAsync('citylink-wallet-balance');
    return res ? parseFloat(res) : 0;
  },
  // Generic key-value storage — uses SecureStore for small values (≤2KB),
  // falls back to AsyncStorage for larger payloads with a dev warning.
  setItem: async (key: string, value: string): Promise<void> => {
    const fullKey = `citylink-${key}`;
    if (value.length <= 2048) {
      await SecureStore.setItemAsync(fullKey, value);
    } else {
      if (__DEV__) {
        console.warn(
          `[SecurePersist] Value for "${key}" exceeds 2KB (${value.length}B). Using AsyncStorage fallback with encryption.`
        );
      }
      const encrypted = await SecurityUtils.encrypt(value);
      await AsyncStorage.setItem(fullKey, encrypted);
    }
  },
  getItem: async (key: string): Promise<string | null> => {
    const fullKey = `citylink-${key}`;
    // Try SecureStore first, then AsyncStorage fallback
    try {
      const secure = await SecureStore.getItemAsync(fullKey);
      if (secure !== null) return secure;
    } catch {
      /* SecureStore miss, try AsyncStorage */
    }
    const raw = await AsyncStorage.getItem(fullKey);
    if (raw) {
      const decrypted = await SecurityUtils.decrypt(raw);
      if (decrypted && !['[DECRYPTION_ERROR]', '[CORRUPTED_DATA]', '[DECRYPTION_FAILED]', '[INVALID_FORMAT]'].includes(decrypted)) {
        return decrypted;
      }
      // If decryption fails, the data is likely corrupted or key mismatch — clear it
      console.warn(`[SecurePersist] Decryption failed for key "${key}", clearing...`);
      await SecurePersist.deleteItem(key);
      return null;
    }
    return null;
  },

  deleteItem: async (key: string): Promise<void> => {
    const fullKey = `citylink-${key}`;
    try {
      await SecureStore.deleteItemAsync(fullKey);
    } catch {
      /* ignore */
    }
    await AsyncStorage.removeItem(fullKey);
  },

  // Secure KYC Storage
  saveKYC: async (data: Record<string, unknown> | null): Promise<void> => {
    if (!data) {
      await SecureStore.deleteItemAsync('citylink-kyc-data');
      return;
    }
    await SecureStore.setItemAsync('citylink-kyc-data', JSON.stringify(data));
  },
  loadKYC: async (): Promise<Record<string, unknown> | null> => {
    try {
      const res = await SecureStore.getItemAsync('citylink-kyc-data');
      return res ? JSON.parse(res) : null;
    } catch (err) {
      console.error('[SecurePersist] Failed to parse stored KYC data:', err);
      return null;
    }
  },
  saveKYCStatus: async (status: string): Promise<void> => {
    await SecureStore.setItemAsync('citylink-kyc-status', status);
  },
  loadKYCStatus: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync('citylink-kyc-status');
  },
  clearKYC: async (): Promise<void> => {
    await SecureStore.deleteItemAsync('citylink-kyc-data');
    await SecureStore.deleteItemAsync('citylink-kyc-status');
  },

  // 🛡️ Transaction History Persistence
  saveTransactions: async (txs: Transaction[]): Promise<void> => {
    // Large list, use AsyncStorage
    const raw = JSON.stringify(txs.slice(0, 50));
    const encrypted = await SecurityUtils.encrypt(raw);
    await AsyncStorage.setItem('citylink-wallet-transactions', encrypted);
  },
  loadTransactions: async (): Promise<Transaction[]> => {
    try {
      const res = await AsyncStorage.getItem('citylink-wallet-transactions');
      if (!res) return [];

      const decrypted = await SecurityUtils.decrypt(res);
      if (decrypted && decrypted !== '[DECRYPTION_ERROR]' && decrypted !== '[CORRUPTED_DATA]') {
        return JSON.parse(decrypted);
      }
      // Fallback if not encrypted yet, or clear if corrupted
      if (decrypted === '[DECRYPTION_ERROR]') {
        await AsyncStorage.removeItem('citylink-wallet-transactions');
        return [];
      }
      return JSON.parse(res);
    } catch {
      return [];
    }
  },

  // 🛡️ Active Parking Persistence
  saveActiveParking: async (session: ParkingSession | null): Promise<void> => {
    if (!session) {
      await SecureStore.deleteItemAsync('citylink-active-parking');
      return;
    }
    await SecureStore.setItemAsync('citylink-active-parking', JSON.stringify(session));
  },
  loadActiveParking: async (): Promise<ParkingSession | null> => {
    try {
      const res = await SecureStore.getItemAsync('citylink-active-parking');
      return res ? JSON.parse(res) : null;
    } catch {
      return null;
    }
  },

  // 🛡️ Offline Orders Persistence
  saveOfflineOrders: async (orders: any[]): Promise<void> => {
    const raw = JSON.stringify(orders);
    const encrypted = await SecurityUtils.encrypt(raw);
    await AsyncStorage.setItem('citylink-offline-orders', encrypted);
  },
  loadOfflineOrders: async (): Promise<any[]> => {
    try {
      const res = await AsyncStorage.getItem('citylink-offline-orders');
      if (!res) return [];

      const decrypted = await SecurityUtils.decrypt(res);
      if (decrypted && decrypted !== '[DECRYPTION_ERROR]' && decrypted !== '[CORRUPTED_DATA]') {
        return JSON.parse(decrypted);
      }
      return [];
    } catch {
      return [];
    }
  },

  // 🛡️ Offline Actions Persistence (Queue for OfflineSyncService)
  saveOfflineActions: async (actions: any[]): Promise<void> => {
    const raw = JSON.stringify(actions);
    const encrypted = await SecurityUtils.encrypt(raw);
    await AsyncStorage.setItem('citylink-offline-actions', encrypted);
  },
  loadOfflineActions: async (): Promise<any[]> => {
    try {
      const res = await AsyncStorage.getItem('citylink-offline-actions');
      if (!res) return [];

      const decrypted = await SecurityUtils.decrypt(res);
      if (decrypted && decrypted !== '[DECRYPTION_ERROR]' && decrypted !== '[CORRUPTED_DATA]') {
        return JSON.parse(decrypted);
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * clearAll — Hard wipe of all CityLink persistent data.
   */
  clearAll: async (): Promise<void> => {
    // 1. Delete known items from SecureStore
    const secureKeys = [
      'citylink-current-user',
      'citylink-wallet-balance',
      'citylink-kyc-data',
      'citylink-kyc-status',
      'citylink-active-parking',
      'citylink-offline-actions',
    ];
    for (const key of secureKeys) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        /* ignore */
      }
    }

    // 2. Clear AsyncStorage entries
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) => k.startsWith('citylink-') || k.includes('wallet-cache'));
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  },
};

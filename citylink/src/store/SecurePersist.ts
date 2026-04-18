import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { User, Transaction, ParkingSession } from '../types/domain_types';

/**
 * SecureStoreAdapter — dedicated for individual sensitive values.
 * Uses expo-secure-store for user identity and balance,
 * AsyncStorage for generic cache entries.
 */
export const SecurePersist = {
  saveUser: async (user: User | null): Promise<void> => {
    if (!user) {
      await SecureStore.deleteItemAsync('cl_current_user');
      return;
    }
    await SecureStore.setItemAsync('cl_current_user', JSON.stringify(user));
  },
  loadUser: async (): Promise<User | null> => {
    try {
      const res = await SecureStore.getItemAsync('cl_current_user');
      return res ? JSON.parse(res) : null;
    } catch (err) {
      console.error('[SecurePersist] Failed to parse stored user:', err);
      return null;
    }
  },
  saveBalance: async (balance: number): Promise<void> => {
    await SecureStore.setItemAsync('cl_wallet_balance', String(balance));
  },
  loadBalance: async (): Promise<number> => {
    const res = await SecureStore.getItemAsync('cl_wallet_balance');
    return res ? parseFloat(res) : 0;
  },
  // Generic key-value storage — uses SecureStore for small values (≤2KB),
  // falls back to AsyncStorage for larger payloads with a dev warning.
  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length <= 2048) {
      await SecureStore.setItemAsync(`cl_${key}`, value);
    } else {
      if (__DEV__) {
        console.warn(
          `[SecurePersist] Value for "${key}" exceeds 2KB (${value.length}B). Using AsyncStorage fallback.`
        );
      }
      await AsyncStorage.setItem(key, value);
    }
  },
  getItem: async (key: string): Promise<string | null> => {
    // Try SecureStore first, then AsyncStorage fallback
    try {
      const secure = await SecureStore.getItemAsync(`cl_${key}`);
      if (secure !== null) return secure;
    } catch {
      /* SecureStore miss, try AsyncStorage */
    }
    return await AsyncStorage.getItem(key);
  },

  // Secure KYC Storage
  saveKYC: async (data: Record<string, unknown> | null): Promise<void> => {
    if (!data) {
      await SecureStore.deleteItemAsync('cl_kyc_data');
      return;
    }
    await SecureStore.setItemAsync('cl_kyc_data', JSON.stringify(data));
  },
  loadKYC: async (): Promise<Record<string, unknown> | null> => {
    try {
      const res = await SecureStore.getItemAsync('cl_kyc_data');
      return res ? JSON.parse(res) : null;
    } catch (err) {
      console.error('[SecurePersist] Failed to parse stored KYC data:', err);
      return null;
    }
  },
  saveKYCStatus: async (status: string): Promise<void> => {
    await SecureStore.setItemAsync('cl_kyc_status', status);
  },
  loadKYCStatus: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync('cl_kyc_status');
  },
  clearKYC: async (): Promise<void> => {
    await SecureStore.deleteItemAsync('cl_kyc_data');
    await SecureStore.deleteItemAsync('cl_kyc_status');
  },

  // 🛡️ Transaction History Persistence
  saveTransactions: async (txs: Transaction[]): Promise<void> => {
    // Large list, use AsyncStorage
    await AsyncStorage.setItem('cl_wallet_transactions', JSON.stringify(txs.slice(0, 50)));
  },
  loadTransactions: async (): Promise<Transaction[]> => {
    try {
      const res = await AsyncStorage.getItem('cl_wallet_transactions');
      return res ? JSON.parse(res) : [];
    } catch {
      return [];
    }
  },

  // 🛡️ Active Parking Persistence
  saveActiveParking: async (session: ParkingSession | null): Promise<void> => {
    if (!session) {
      await SecureStore.deleteItemAsync('cl_active_parking');
      return;
    }
    await SecureStore.setItemAsync('cl_active_parking', JSON.stringify(session));
  },
  loadActiveParking: async (): Promise<ParkingSession | null> => {
    try {
      const res = await SecureStore.getItemAsync('cl_active_parking');
      return res ? JSON.parse(res) : null;
    } catch {
      return null;
    }
  },
};

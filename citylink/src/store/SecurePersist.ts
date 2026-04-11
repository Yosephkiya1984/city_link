import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * SecureStoreAdapter — dedicated for individual sensitive values.
 * Uses expo-secure-store for user identity and balance,
 * AsyncStorage for generic cache entries.
 */
export const SecurePersist = {
  saveUser: async (user: any) => {
    if (!user) {
      await SecureStore.deleteItemAsync('cl_current_user');
      return;
    }
    await SecureStore.setItemAsync('cl_current_user', JSON.stringify(user));
  },
  loadUser: async () => {
    const res = await SecureStore.getItemAsync('cl_current_user');
    return res ? JSON.parse(res) : null;
  },
  saveBalance: async (balance: number) => {
    await SecureStore.setItemAsync('cl_wallet_balance', String(balance));
  },
  loadBalance: async () => {
    const res = await SecureStore.getItemAsync('cl_wallet_balance');
    return res ? parseFloat(res) : 0;
  },
  // Generic key-value storage (used by wallet cache, etc.)
  setItem: async (key: string, value: string) => {
    await AsyncStorage.setItem(key, value);
  },
  getItem: async (key: string) => {
    return await AsyncStorage.getItem(key);
  },

  // Secure KYC Storage
  saveKYC: async (data: any) => {
    if (!data) {
      await SecureStore.deleteItemAsync('cl_kyc_data');
      return;
    }
    await SecureStore.setItemAsync('cl_kyc_data', JSON.stringify(data));
  },
  loadKYC: async () => {
    const res = await SecureStore.getItemAsync('cl_kyc_data');
    return res ? JSON.parse(res) : null;
  },
  saveKYCStatus: async (status: string) => {
    await SecureStore.setItemAsync('cl_kyc_status', status);
  },
  loadKYCStatus: async () => {
    return await SecureStore.getItemAsync('cl_kyc_status');
  },
  clearKYC: async () => {
    await SecureStore.deleteItemAsync('cl_kyc_data');
    await SecureStore.deleteItemAsync('cl_kyc_status');
  },
};

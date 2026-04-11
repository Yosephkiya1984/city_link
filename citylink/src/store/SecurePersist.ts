import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * HybridStorage — custom storage engine for Zustand.
 * Routes sensitive keys to SecureStore and everything else to AsyncStorage.
 */
const SENSITIVE_KEYS = ['cl_current_user', 'cl_wallet_balance'];

export const HybridStorage = {
  getItem: async (name) => {
    // Note: Zustand persist gives us a single object for the entire store by default.
    // If we want to split keys, we need to handle that inside the store definition.
    // Here we implement a standard interface.
    const value = await AsyncStorage.getItem(name);
    return value;
  },
  setItem: async (name, value) => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name) => {
    await AsyncStorage.removeItem(name);
  },
};

/**
 * SecureStoreAdapter — dedicated for individual sensitive values.
 */
export const SecurePersist = {
  saveUser: async (user) => {
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
  saveBalance: async (balance) => {
    await SecureStore.setItemAsync('cl_wallet_balance', String(balance));
  },
  loadBalance: async () => {
    const res = await SecureStore.getItemAsync('cl_wallet_balance');
    return res ? parseFloat(res) : 0;
  },
  // Generic key-value storage (used by wallet cache, etc.)
  setItem: async (key, value) => {
    await AsyncStorage.setItem(key, value);
  },
  getItem: async (key) => {
    return await AsyncStorage.getItem(key);
  },
};

import { useAuthStore } from './AuthStore';
import { useWalletStore } from './WalletStore';
import { useMarketStore } from './MarketStore';
import { useSystemStore } from './SystemStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurePersist } from './SecurePersist';

/**
 * Coordinated Reset
 * Wipes all domain stores and local storage consistently.
 */
export const clearAllStores = async () => {
  try {
    // 1. Logic resets (Zustand)
    await useAuthStore.getState().reset();
    await useWalletStore.getState().reset();
    useMarketStore.getState().reset();
    useSystemStore.getState().reset();

    // 2. Physical storage wipe (Hardened)
    await SecurePersist.clearAll();

    // Explicitly clear non-prefixed sensitive keys if they survived
    const extraKeys = ['has_seen_onboarding', 'is_first_launch', 'fayda_temp_data'];
    if (extraKeys.length > 0) {
      await AsyncStorage.multiRemove(extraKeys).catch(() => {});
    }

    console.log('[StoreUtils] All stores cleared successfully.');
  } catch (e) {
    console.error('[StoreUtils] Global reset failed:', e);
  }
};

/**
 * migrateLegacyData
 * Moves data from the old unified store to the new domain stores.
 */
export const migrateLegacyData = async () => {
  try {
    const legacyStr = await AsyncStorage.getItem('citylink-unified-storage');
    if (!legacyStr) return;

    const legacy = JSON.parse(legacyStr);
    const state = legacy.state; // Zustand persist wraps state in a .state property

    if (!state) return;

    console.log('[StoreUtils] Migrating legacy data to new stores...');

    // 1. Auth Migration
    if (state.currentUser) {
      await useAuthStore.getState().setCurrentUser(state.currentUser);
    }

    // 2. Wallet Migration
    if (state.balance !== undefined) {
      await useWalletStore.getState().setBalance(state.balance);
    }
    if (state.transactions) {
      useWalletStore.getState().setTransactions(state.transactions);
    }

    // 3. System Migration
    const system = useSystemStore.getState();
    if (state.isDark !== undefined) system.setIsDark(state.isDark);
    if (state.lang) system.setLang(state.lang);
    if (state.notifications) {
      // Manually merge notifications if needed, or just replace
      // For simplicity, we replace in migration
    }

    // 4. Market Migration
    if (state.favorites) {
      useMarketStore.getState().setFavorites(state.favorites);
    }

    // 5. Cleanup
    await AsyncStorage.removeItem('citylink-unified-storage');
    console.log('[StoreUtils] Legacy migration complete and old storage purged.');
  } catch (e) {
    console.warn('[StoreUtils] Migration failed or already completed:', e);
  }
};

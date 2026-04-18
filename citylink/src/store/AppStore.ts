import { useAuthStore } from './AuthStore';
import { useWalletStore } from './WalletStore';
import { useMarketStore } from './MarketStore';
import { useSystemStore } from './SystemStore';

/**
 * Global store utilities.
 *
 * Direct domain hooks are preferred for performance:
 * - useAuthStore: User session, authentication, verification
 * - useWalletStore: Balance, transactions, active parking
 * - useMarketStore: Marketplace products and favorites
 * - useSystemStore: Theme, language, notifications, toasts, chat
 */

/**
 * resetAllStores
 * Clears all domain-specific stores. Useful for sign-out or session reset.
 */
export const resetAllStores = async () => {
  await Promise.all([useAuthStore.getState().reset(), useWalletStore.getState().reset()]);
  useMarketStore.getState().reset();
  useSystemStore.getState().reset();
};

// Re-export domain stores for unified entry point
export { useAuthStore, useWalletStore, useMarketStore, useSystemStore };

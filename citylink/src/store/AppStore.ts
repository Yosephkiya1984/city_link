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

// Re-export domain stores for unified entry point
export { useAuthStore, useWalletStore, useMarketStore, useSystemStore };

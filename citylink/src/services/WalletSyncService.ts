import { useAuthStore } from '../store/AuthStore';
import { useWalletStore } from '../store/WalletStore';
import { WalletApi } from '../modules/wallet';

/**
 * WalletSyncService
 * Orchestrates the synchronization of wallet data with the server.
 * Handles throttling, session-based triggers, and error recovery.
 */
class WalletSyncService {
  private isSyncing = false;
  private lastSyncTime = 0;
  private syncThrottleMs = 15000; // 15 seconds minimum between auto-syncs

  /**
   * sync — Trigger a manual or automatic sync.
   * @param force — If true, bypasses the throttle.
   */
  async sync(force = false) {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return;

    // Check throttle
    const now = Date.now();
    if (!force && now - this.lastSyncTime < this.syncThrottleMs) {
      return;
    }

    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      console.log('[WalletSync] Starting synchronization...');
      const data = await WalletApi.fetchWalletData(userId);
      
      if (data) {
        const { setBalance, setTransactions } = useWalletStore.getState();
        setBalance(data.balance);
        setTransactions(data.transactions);
        this.lastSyncTime = Date.now();
        console.log('[WalletSync] Success.');
      }
    } catch (error) {
      console.error('[WalletSync] Critical sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * initialize — Set up listeners for session changes.
   */
  initialize() {
    // 1. Listen for authentication changes
    useAuthStore.subscribe(
      (state) => state.currentUser?.id,
      (userId) => {
        if (userId) {
          console.log('[WalletSync] Session detected, triggering initial sync.');
          this.sync(true);
        }
      }
    );

    // 2. Initial sync if user is already logged in
    const currentId = useAuthStore.getState().currentUser?.id;
    if (currentId) {
      this.sync(true);
    }
  }
}

export const walletSyncService = new WalletSyncService();

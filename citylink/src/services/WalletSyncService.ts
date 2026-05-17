import { useAuthStore } from '../store/AuthStore';
import { useWalletStore } from '../store/WalletStore';

/**
 * WalletSyncService
 * Orchestrates the synchronization of wallet data with the server.
 * Handles throttling, session-based triggers, and error recovery.
 *
 * Delegates to WalletStore.syncWithServer() which covers:
 *   1. Wallet balance
 *   2. Recent transactions
 *   3. Active parking session (clears it if valet has closed the session)
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

      // Delegate to WalletStore.syncWithServer — single source of truth.
      // This syncs balance, transactions, AND active parking session.
      // If the valet closed the session, syncWithServer clears activeParking
      // which stops the timer on the citizen's screen automatically.
      await useWalletStore.getState().syncWithServer();

      this.lastSyncTime = Date.now();
      console.log('[WalletSync] Success.');
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
          console.log('[WalletSync] Session detected, triggering initial sync with 1500ms delay...');
          // 🛡️ AUTH RACE FIX: Trigger two syncs to guarantee visibility after login transients
          setTimeout(() => this.sync(true), 1500);
          setTimeout(() => this.sync(false), 5000); // Silent background catch-all
        }
      }
    );

    // 2. Initial sync if user is already logged in
    const currentId = useAuthStore.getState().currentUser?.id;
    if (currentId) {
      // 🛡️ Also wait during initial boot-up sync
      setTimeout(() => this.sync(true), 1500);
    }
  }
}

export const walletSyncService = new WalletSyncService();

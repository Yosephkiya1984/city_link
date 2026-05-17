import { create } from 'zustand';
import { SecurePersist } from './SecurePersist';
import { Transaction, ParkingSession } from '../types/domain_types';
import { User } from '../types/domain_types';

export interface WalletState {
  balance: number;
  frozenBalance: number;
  transactions: Transaction[];
  activeParking: ParkingSession | null;
  setBalance: (val: number) => Promise<void>;
  setFrozenBalance: (val: number) => Promise<void>;
  setTransactions: (txs: Transaction[]) => Promise<void>;
  addTransaction: (tx: Transaction) => Promise<void>;
  setActiveParking: (session: ParkingSession | null) => Promise<void>;
  hydrateWallet: (userId?: string) => Promise<void>;
  syncWithServer: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: 0,
  frozenBalance: 0,
  transactions: [],
  activeParking: null,

  setBalance: async (val) => {
    set({ balance: val });
    await SecurePersist.saveBalance(val);
  },

  setFrozenBalance: async (val) => {
    set({ frozenBalance: val });
  },

  setTransactions: async (txs) => {
    set({ transactions: txs });
    await SecurePersist.saveTransactions(txs);
  },

  addTransaction: async (tx) => {
    // Compute next state outside set() so we can await the persist call.
    const current = useWalletStore.getState().transactions;
    const next = [tx, ...current].slice(0, 50);
    set({ transactions: next });
    // 🛡️ FIX: Await the persist and surface errors — previously fire-and-forget.
    // Failure here means the offline cache is stale, NOT that money is lost (server is source of truth).
    try {
      await SecurePersist.saveTransactions(next);
    } catch (err) {
      console.error('[WalletStore] addTransaction: failed to persist transaction cache:', err);
    }
  },

  setActiveParking: async (session) => {
    set({ activeParking: session });
    await SecurePersist.saveActiveParking(session);
  },

  hydrateWallet: async (userId) => {
    // 🛡️ FIX: Validate that cached data belongs to the requesting user.
    // Without this, a new login on a shared device briefly shows the previous user's balance.
    if (userId) {
      const cachedUser: User | null = await SecurePersist.loadUser();
      if (cachedUser && cachedUser.id !== userId) {
        // Different user — discard stale cache immediately rather than displaying it.
        console.warn('[WalletStore] hydrateWallet: userId mismatch, clearing stale wallet cache.');
        set({ balance: 0, transactions: [], activeParking: null });
        await Promise.all([
          SecurePersist.saveBalance(0),
          SecurePersist.saveTransactions([]),
          SecurePersist.saveActiveParking(null),
        ]);
        // Still sync from server so the correct user's data loads
        await useWalletStore.getState().syncWithServer();
        return;
      }
    }

    // 1. Load disk cache first for instant UI (fast path)
    const [balance, transactions, activeParking] = await Promise.all([
      SecurePersist.loadBalance(),
      SecurePersist.loadTransactions(),
      SecurePersist.loadActiveParking(),
    ]);
    set({ balance, transactions, activeParking });

    // 2. Always follow up with a server sync to correct stale/missing data.
    // CRITICAL: This restores the active parking session (including PIN) after
    // logout, because logout wipes SecurePersist but the DB session stays active.
    await useWalletStore.getState().syncWithServer();
  },

  syncWithServer: async () => {
    const { getClient } = await import('../services/supabase');
    const supabase = getClient();
    if (!supabase) return;

    // 🛡️ RESILIENCE FIX: Instead of strictly relying on supabase.auth.getUser() 
    // Robust user resolution: try Supabase first to confirm authenticated context
    const authResponse = await supabase.auth.getUser();
    const authUser = authResponse.data?.user;
    
    // Fallback to AuthStore if Supabase is mid-refresh (e.g. immediately after login)
    let user = authUser;
    if (!user) {
      const authStoreUser = (await import('./AuthStore')).useAuthStore.getState().currentUser;
      if (authStoreUser) {
        user = { id: authStoreUser.id } as any;
      }
    }

    if (!user) {
      console.warn('[WalletStore] syncWithServer aborted: No user detected in Supabase or AuthStore.');
      return;
    }

    // ── 1. Sync wallet balance ────────────────────────────────────────────────
    const { data, error } = await supabase
      .from('wallets')
      .select('id, balance, frozen_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data && !error) {
      useWalletStore.getState().setBalance(data.balance);
      useWalletStore.getState().setFrozenBalance(data.frozen_balance || 0);

      // ── 2. Sync recent transactions (refunds/settlements appear instantly) ──
      // This ensures the wallet history shows the escrow refund credit right
      // after the valet closes the session — no logout required.
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', data.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txData) {
        useWalletStore.getState().setTransactions(txData as any[]);
      }
    }

    // ── 3. Sync Active Parking Session ────────────────────────────────────────
    // Only active/reserved sessions count. If DB has none → clear local cache.
    // This is the authoritative check: if the valet closed it, DB has no active
    // session, so activeParking becomes null → timer stops.
    const { data: sessions, error: sessErr } = await supabase
      .from('parking_sessions')
      .select('*, parking_lots(name, rate_per_hour)')
      .eq('user_id', user.id)
      .or('status.ilike.active,status.ilike.ACTIVE,status.ilike.RESERVED')
      .order('start_time', { ascending: false })
      .limit(1);

    if (sessErr) {
      console.error('[WalletStore] syncWithServer: Failed to fetch parking sessions:', sessErr.message, sessErr.details);
    }

    const session = sessions?.[0];

    if (session && !sessErr) {
      const mappedSession = {
        ...session,
        lot_name: (session.parking_lots as any)?.name || 'Parking Lot',
        rate_per_hour: (session.parking_lots as any)?.rate_per_hour || 15,
      };
      useWalletStore.getState().setActiveParking(mappedSession);
    } else if (!sessErr && authUser) {
      // 🛡️ CRITICAL: Only clear local state if we are CERTAIN we have a 
      // valid, authenticated Supabase session and it returned 0 rows.
      // If authUser is null (fallback used), the 0 rows might be due to 
      // RLS blocking an unauthenticated request during a token refresh.
      if (useWalletStore.getState().activeParking) {
        console.log('[WalletStore] No active session found on server. Clearing local state.');
        useWalletStore.getState().setActiveParking(null);
      }
    } else if (!sessErr && !authUser) {
      console.log('[WalletStore] Fallback user used for sync. Skipping state wipe to prevent race condition.');
    }
  },

  reset: async () => {
    set({ balance: 0, transactions: [], activeParking: null });
    await Promise.all([
      SecurePersist.saveBalance(0),
      SecurePersist.saveTransactions([]),
      SecurePersist.saveActiveParking(null),
    ]);
  },
}));

/** 🛡️ CTO Lias - satisfying App.tsx dynamic import dependency */
export const hostWalletHydration = async (userId: string) => {
  return useWalletStore.getState().hydrateWallet(userId);
};

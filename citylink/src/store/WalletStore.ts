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
        return;
      }
    }
    const [balance, transactions, activeParking] = await Promise.all([
      SecurePersist.loadBalance(),
      SecurePersist.loadTransactions(),
      SecurePersist.loadActiveParking(),
    ]);
    set({ balance, transactions, activeParking });
  },

  syncWithServer: async () => {
    const { getClient } = await import('../services/supabase');
    const supabase = getClient();
    if (!supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('wallets')
      .select('balance, frozen_balance')
      .eq('user_id', user.id)
      .single();

    if (data && !error) {
      useWalletStore.getState().setBalance(data.balance);
      useWalletStore.getState().setFrozenBalance(data.frozen_balance || 0);
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

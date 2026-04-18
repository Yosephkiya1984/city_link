import { create } from 'zustand';
import { SecurePersist } from './SecurePersist';
import { Transaction, ParkingSession } from '../types/domain_types';

export interface WalletState {
  balance: number;
  transactions: Transaction[];
  activeParking: ParkingSession | null;
  setBalance: (val: number) => Promise<void>;
  setTransactions: (txs: Transaction[]) => Promise<void>;
  addTransaction: (tx: Transaction) => Promise<void>;
  setActiveParking: (session: ParkingSession | null) => Promise<void>;
  hydrateWallet: (userId?: string) => Promise<void>;
  reset: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: 0,
  transactions: [],
  activeParking: null,

  setBalance: async (val) => {
    set({ balance: val });
    await SecurePersist.saveBalance(val);
  },

  setTransactions: async (txs) => {
    set({ transactions: txs });
    await SecurePersist.saveTransactions(txs);
  },

  addTransaction: async (tx) => {
    set((s) => {
      const next = [tx, ...s.transactions].slice(0, 50);
      SecurePersist.saveTransactions(next); // This returns a promise, but we update state immediately
      return { transactions: next };
    });
  },

  setActiveParking: async (session) => {
    set({ activeParking: session });
    await SecurePersist.saveActiveParking(session);
  },

  hydrateWallet: async (userId) => {
    // If userId provided, we could verify it matches SecurePersist,
    // but for now we follow the "Source of Truth" in SecurePersist.
    const [balance, transactions, activeParking] = await Promise.all([
      SecurePersist.loadBalance(),
      SecurePersist.loadTransactions(),
      SecurePersist.loadActiveParking(),
    ]);
    set({ balance, transactions, activeParking });
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

import { create } from 'zustand';
import { SecurePersist } from './SecurePersist';
import { Transaction, ParkingSession } from '../types';

interface WalletState {
  balance: number;
  transactions: Transaction[];
  isRefreshing: boolean;
  
  // Actions
  setBalance: (val: number) => Promise<void>;
  setTransactions: (txs: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  activeParking: ParkingSession | null;
  setActiveParking: (session: ParkingSession | null) => void;
  hydrate: (userId: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: 0,
  transactions: [],
  isRefreshing: false,

  setBalance: async (val: number) => {
    set({ balance: val });
    // Note: SecurePersist might need the userId, but the existing implementation used a generic key.
    // We'll keep it as is for backward compatibility or improve it in hydrate.
    await SecurePersist.saveBalance(val);
  },

  setTransactions: (txs) => set({ transactions: txs }),
  
  addTransaction: (tx) => 
    set((s) => ({ transactions: [tx, ...s.transactions].slice(0, 50) })),

  activeParking: null,
  setActiveParking: (session) => set({ activeParking: session }),

  hydrate: async (userId: string) => {
    if (!userId) return;
    const balance = await SecurePersist.loadBalance();
    // In wallet.service, we also load from cache_wallet_cache_{userId}
    // We'll sync with that logic later if needed.
    set({ balance });
  },
}));

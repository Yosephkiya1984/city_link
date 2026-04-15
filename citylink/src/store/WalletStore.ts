import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, ParkingSession } from '../types';
import { SecurePersist } from './SecurePersist';

export interface WalletState {
  balance: number;
  transactions: Transaction[];
  activeParking: ParkingSession | null;
  setBalance: (val: number) => Promise<void>;
  setTransactions: (txs: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  setActiveParking: (session: ParkingSession | null) => void;
  hydrateWallet: (userId: string) => Promise<void>;
  reset: () => Promise<void>;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      balance: 0,
      transactions: [],
      activeParking: null,

      setBalance: async (val) => {
        set({ balance: val });
        await SecurePersist.saveBalance(val);
      },

      setTransactions: (txs) => set({ transactions: txs }),
      addTransaction: (tx) => set((s) => ({ transactions: [tx, ...s.transactions].slice(0, 50) })),
      setActiveParking: (session) => set({ activeParking: session }),

      hydrateWallet: async (userId) => {
        if (!userId) return;
        const balance = await SecurePersist.loadBalance();
        set({ balance });
      },

      reset: async () => {
        set({ balance: 0, transactions: [], activeParking: null });
        await SecurePersist.saveBalance(0);
      },
    }),
    {
      name: 'citylink-wallet-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

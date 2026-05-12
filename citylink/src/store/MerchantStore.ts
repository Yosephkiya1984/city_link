import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MerchantState {
  inventory: any[];
  orders: any[];
  walletTransactions: any[];
  salesHistory: any;
  lastUpdated: string | null;
  
  setInventory: (items: any[]) => void;
  setOrders: (orders: any[]) => void;
  setWalletTransactions: (txs: any[]) => void;
  setSalesHistory: (history: any) => void;
  setLastUpdated: (timestamp: string) => void;
  reset: () => void;
}

export const useMerchantStore = create<MerchantState>()(
  persist(
    (set) => ({
      inventory: [],
      orders: [],
      walletTransactions: [],
      salesHistory: { curve: [], raw: [], labels: [] },
      lastUpdated: null,

      setInventory: (inventory) => set({ inventory }),
      setOrders: (orders) => set({ orders }),
      setWalletTransactions: (walletTransactions) => set({ walletTransactions }),
      setSalesHistory: (salesHistory) => set({ salesHistory }),
      setLastUpdated: (lastUpdated) => set({ lastUpdated }),
      
      reset: () => set({ 
        inventory: [], 
        orders: [], 
        walletTransactions: [], 
        salesHistory: { curve: [], raw: [], labels: [] },
        lastUpdated: null 
      }),
    }),
    {
      name: 'citylink-merchant-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

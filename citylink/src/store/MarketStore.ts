import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';

export interface MarketState {
  products: Product[];
  favorites: string[];
  setProducts: (items: Product[]) => void;
  setFavorites: (favs: string[]) => void;
  reset: () => void;
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set) => ({
      products: [],
      favorites: [],

      setProducts: (products) => set({ products }),
      setFavorites: (favorites) => set({ favorites }),

      reset: () => set({ products: [], favorites: [] }),
    }),
    {
      name: 'citylink-market-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

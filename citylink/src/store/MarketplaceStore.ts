import { create } from 'zustand';
import { Product } from '../types';

/**
 * MarketplaceStore
 * Dedicated store for shop listings, favorites, and marketplace filters.
 */

interface MarketplaceState {
  products: Product[];
  setProducts: (items: Product[]) => void;
  
  selProdCat: string;
  setSelProdCat: (cat: string) => void;
  
  favorites: string[]; // List of product IDs
  setFavorites: (favs: string[]) => void;
  toggleFavorite: (productId: string) => void;
  
  isFetching: boolean;
  setIsFetching: (val: boolean) => void;

  reset: () => void;
}

export const useMarketplaceStore = create<MarketplaceState>((set) => ({
  products: [],
  setProducts: (products) => set({ products }),
  
  selProdCat: 'All',
  setSelProdCat: (selProdCat) => set({ selProdCat }),
  
  favorites: [],
  setFavorites: (favorites) => set({ favorites }),
  
  toggleFavorite: (productId) => set((state) => {
    const isFav = state.favorites.includes(productId);
    const newFavs = isFav 
      ? state.favorites.filter(id => id !== productId)
      : [...state.favorites, productId];
    return { favorites: newFavs };
  }),

  isFetching: false,
  setIsFetching: (isFetching) => set({ isFetching }),

  reset: () => set({ 
    products: [], 
    selProdCat: 'All', 
    favorites: [], 
    isFetching: false 
  }),
}));

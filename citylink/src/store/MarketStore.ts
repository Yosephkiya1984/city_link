import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';

export interface CartItem {
  product: Product;
  quantity: number;
  addedAt: string;
}

export interface MarketState {
  products: Product[];
  favorites: string[];
  cartItems: CartItem[];
  setProducts: (items: Product[]) => void;
  setFavorites: (favs: string[]) => void;
  // Cart methods
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotalItems: () => number;
  getCartTotalPrice: () => number;
  getCartItemsByMerchant: () => Record<string, CartItem[]>;
  isInCart: (productId: string) => boolean;
  getCartItemQuantity: (productId: string) => number;
  reset: () => void;
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      products: [],
      favorites: [],
      cartItems: [],

      setProducts: (products) => set({ products }),
      setFavorites: (favorites) => set({ favorites }),

      addToCart: (product: Product, quantity = 1) => {
        const { cartItems } = get();
        const existingIndex = cartItems.findIndex(item => item.product.id === product.id);

        if (existingIndex >= 0) {
          const updatedItems = [...cartItems];
          updatedItems[existingIndex].quantity += quantity;
          set({ cartItems: updatedItems });
        } else {
          const newItem: CartItem = {
            product,
            quantity,
            addedAt: new Date().toISOString(),
          };
          set({ cartItems: [...cartItems, newItem] });
        }
      },

      removeFromCart: (productId: string) => {
        const { cartItems } = get();
        set({ cartItems: cartItems.filter(item => item.product.id !== productId) });
      },

      updateCartQuantity: (productId: string, quantity: number) => {
        const { cartItems } = get();
        if (quantity <= 0) {
          set({ cartItems: cartItems.filter(item => item.product.id !== productId) });
        } else {
          const updatedItems = cartItems.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
          );
          set({ cartItems: updatedItems });
        }
      },

      clearCart: () => set({ cartItems: [] }),

      getCartTotalItems: () => {
        const { cartItems } = get();
        return cartItems.reduce((total, item) => total + item.quantity, 0);
      },

      getCartTotalPrice: () => {
        const { cartItems } = get();
        return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
      },

      getCartItemsByMerchant: () => {
        const { cartItems } = get();
        return cartItems.reduce((acc, item) => {
          const merchantId = item.product.merchant_id;
          if (!acc[merchantId]) {
            acc[merchantId] = [];
          }
          acc[merchantId].push(item);
          return acc;
        }, {} as Record<string, CartItem[]>);
      },

      isInCart: (productId: string) => {
        const { cartItems } = get();
        return cartItems.some(item => item.product.id === productId);
      },

      getCartItemQuantity: (productId: string) => {
        const { cartItems } = get();
        const item = cartItems.find(item => item.product.id === productId);
        return item ? item.quantity : 0;
      },

      reset: () => set({ products: [], favorites: [], cartItems: [] }),
    }),
    {
      name: 'citylink-market-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

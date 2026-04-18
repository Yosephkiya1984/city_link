import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';

export interface CartItem {
  product: Product;
  quantity: number;
  addedAt: string;
}

export interface CartState {
  items: CartItem[];
  // Add item to cart
  addItem: (product: Product, quantity?: number) => void;
  // Remove item from cart
  removeItem: (productId: string) => void;
  // Update quantity of an item
  updateQuantity: (productId: string, quantity: number) => void;
  // Clear entire cart
  clearCart: () => void;
  // Get total items count
  getTotalItems: () => number;
  // Get total price
  getTotalPrice: () => number;
  // Get items grouped by merchant
  getItemsByMerchant: () => Record<string, CartItem[]>;
  // Check if product is in cart
  isInCart: (productId: string) => boolean;
  // Get item quantity
  getItemQuantity: (productId: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product, quantity = 1) => {
        const { items } = get();
        const existingIndex = items.findIndex(item => item.product.id === product.id);

        if (existingIndex >= 0) {
          // Update quantity if item exists
          const updatedItems = [...items];
          updatedItems[existingIndex].quantity += quantity;
          set({ items: updatedItems });
        } else {
          // Add new item
          const newItem: CartItem = {
            product,
            quantity,
            addedAt: new Date().toISOString(),
          };
          set({ items: [...items, newItem] });
        }
      },

      removeItem: (productId: string) => {
        const { items } = get();
        set({ items: items.filter(item => item.product.id !== productId) });
      },

      updateQuantity: (productId: string, quantity: number) => {
        const { items } = get();
        if (quantity <= 0) {
          // Remove if quantity is 0 or less
          set({ items: items.filter(item => item.product.id !== productId) });
        } else {
          const updatedItems = items.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
          );
          set({ items: updatedItems });
        }
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        const { items } = get();
        return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
      },

      getItemsByMerchant: () => {
        const { items } = get();
        return items.reduce((acc, item) => {
          const merchantId = item.product.merchant_id;
          if (!acc[merchantId]) {
            acc[merchantId] = [];
          }
          acc[merchantId].push(item);
          return acc;
        }, {} as Record<string, CartItem[]>);
      },

      isInCart: (productId: string) => {
        const { items } = get();
        return items.some(item => item.product.id === productId);
      },

      getItemQuantity: (productId: string) => {
        const { items } = get();
        const item = items.find(item => item.product.id === productId);
        return item ? item.quantity : 0;
      },
    }),
    {
      name: 'citylink-cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist items, not computed values
      partialize: (state) => ({ items: state.items }),
    }
  )
);
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';
import { Product } from '../types';

const MARKET_ENCRYPTION_KEY_NAME = 'citylink-market-encryption-key';
let cachedEncryptionKey: string | null = null;
let initializing: Promise<string> | null = null;

async function getEncryptionKey(): Promise<string> {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  if (initializing) {
    return initializing;
  }

  initializing = (async () => {
    try {
      const storedKey = await SecureStore.getItemAsync(MARKET_ENCRYPTION_KEY_NAME);
      if (storedKey) {
        cachedEncryptionKey = storedKey;
        return storedKey;
      }

      const generatedKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64);
      await SecureStore.setItemAsync(MARKET_ENCRYPTION_KEY_NAME, generatedKey);
      cachedEncryptionKey = generatedKey;
      return generatedKey;
    } catch (error) {
      console.error('Failed to load market encryption key:', error);
      throw new Error('MARKET_ENCRYPTION_KEY_UNAVAILABLE');
    }
  })();

  try {
    return await initializing;
  } finally {
    initializing = null;
  }
}

interface CartItem {
  product: Product;
  quantity: number;
  addedAt: string;
}

// Custom storage with encryption
const encryptedStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const encrypted = await AsyncStorage.getItem(name);
      if (!encrypted) return null;

      const key = await getEncryptionKey();

      try {
        const bytes = CryptoJS.AES.decrypt(encrypted, key);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);

        if (!decrypted) {
          // If decryption fails, clear corrupted data
          await AsyncStorage.removeItem(name);
          return null;
        }

        return decrypted;
      } catch (decryptError) {
        console.error('Decryption integrity failure:', decryptError);
        await AsyncStorage.removeItem(name);
        return null;
      }
    } catch (error) {
      console.error('Failed to get encrypted data or key:', error);
      // Do not remove data on key retrieval or other transient errors
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const key = await getEncryptionKey();
      const encrypted = CryptoJS.AES.encrypt(value, key).toString();
      await AsyncStorage.setItem(name, encrypted);
    } catch (error) {
      console.error('Failed to encrypt market store data:', error);
      throw error;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

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

        // Validate product data to prevent manipulation
        if (!product.id || product.price == null || product.price < 0) {
          console.error('Invalid product data for cart');
          return;
        }

        // Prevent adding items with zero or negative stock
        if (product.stock !== undefined && product.stock <= 0) {
          console.error('Cannot add out-of-stock item to cart');
          return;
        }

        const existingIndex = cartItems.findIndex((item) => item.product.id === product.id);
        const desiredQuantity = quantity <= 0 ? 1 : quantity;
        const cappedQuantity = Math.min(desiredQuantity, 99);
        const clamped = desiredQuantity !== cappedQuantity;

        if (existingIndex >= 0) {
          const newQuantity = Math.min(cartItems[existingIndex].quantity + desiredQuantity, 99);
          if (newQuantity !== cartItems[existingIndex].quantity + desiredQuantity) {
            console.warn('Cart item quantity capped to maximum of 99 for product', product.id);
          }
          const updatedItems = [...cartItems];
          updatedItems[existingIndex].quantity = newQuantity;
          set({ cartItems: updatedItems });
        } else {
          if (clamped) {
            console.warn('Cart item quantity capped to maximum of 99 for product', product.id);
          }
          const newItem: CartItem = {
            product,
            quantity: cappedQuantity,
            addedAt: new Date().toISOString(),
          };
          set({ cartItems: [...cartItems, newItem] });
        }
      },

      removeFromCart: (productId: string) => {
        const { cartItems } = get();
        set({ cartItems: cartItems.filter((item) => item.product.id !== productId) });
      },

      updateCartQuantity: (productId: string, quantity: number) => {
        const { cartItems } = get();

        // Validate quantity
        if (quantity < 0 || quantity > 99) {
          console.error('Invalid quantity');
          return;
        }

        if (quantity <= 0) {
          set({ cartItems: cartItems.filter((item) => item.product.id !== productId) });
        } else {
          const updatedItems = cartItems.map((item) =>
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
        return cartItems.reduce((total, item) => {
          // Validate price to prevent manipulation
          const price = Math.max(0, item.product.price || 0);
          return total + price * item.quantity;
        }, 0);
      },

      getCartItemsByMerchant: () => {
        const { cartItems } = get();
        return cartItems.reduce(
          (acc, item) => {
            const merchantId = item.product.merchant_id;
            if (!acc[merchantId]) {
              acc[merchantId] = [];
            }
            acc[merchantId].push(item);
            return acc;
          },
          {} as Record<string, CartItem[]>
        );
      },

      isInCart: (productId: string) => {
        const { cartItems } = get();
        return cartItems.some((item) => item.product.id === productId);
      },

      getCartItemQuantity: (productId: string) => {
        const { cartItems } = get();
        const item = cartItems.find((item) => item.product.id === productId);
        return item ? item.quantity : 0;
      },

      reset: () => set({ products: [], favorites: [], cartItems: [] }),
    }),
    {
      name: 'citylink-market-storage',
      storage: createJSONStorage(() => encryptedStorage),
      // Only persist cart data, not products/favorites (they can be refetched)
      partialize: (state) => ({
        cartItems: state.cartItems,
      }),
    }
  )
);

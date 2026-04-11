import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurePersist } from './SecurePersist';
import { AppState, User } from '../types';

// ── Utility ───────────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ── Store Definition ──────────────────────────────────────────────────────────

const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Persistent State (Non-Sensitive) ──
      isDark: true,
      notifications: [],
      transactions: [],
      
      // ── Runtime State (Ephemeral / Manually Persisted) ──
      currentUser: null,
      balance: 0,
      toasts: [],
      products: [],
      selProdCat: 'All',
      favorites: [],
      settings: {},
      lang: 'en',
      chatHistory: [],
      foodOrders: [],
      marketplaceListings: [],
      ekubGroups: [],
      theme: 'dark',

      // ── Core Actions ──
      setIsDark: (val) => set({ isDark: val, theme: val ? 'dark' : 'light' }),
      toggleTheme: () => set((s) => ({ isDark: !s.isDark, theme: !s.isDark ? 'dark' : 'light' })),
      
      setCurrentUser: async (user) => {
        set({ currentUser: user });
        await SecurePersist.saveUser(user);
      },
      
      setBalance: async (val) => {
        set({ balance: val });
        await SecurePersist.saveBalance(val);
      },
 
      setTransactions: (txs) => set({ transactions: txs }),
      addTransaction: (tx) => set((s) => ({ transactions: [tx, ...s.transactions].slice(0, 50) })),
      setNotifications: (notifs) => set({ notifications: notifs }),
      
      showToast: (message, type = 'info') => {
        const id = uid();
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 3500);
      },

      addNotification: (notif) => set((s) => ({ 
        notifications: [notif, ...s.notifications] 
      })),
      
      markNotifRead: (id) => set((s) => ({
        notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n)
      })),
      
      clearNotifications: () => set({ notifications: [] }),

      setProducts: (items) => set({ products: items }),
      setSelProdCat: (cat) => set({ selProdCat: cat }),
      setFavorites: (favs) => set({ favorites: favs }),
      setSettings: (settings) => set({ settings }),
      setLang: (lang) => set({ lang }),
      setTheme: (theme: 'light' | 'dark') => set({ theme, isDark: theme === 'dark' }),
      setChatHistory: (chatHistory) => set({ chatHistory }),
      setFoodOrders: (foodOrders) => set({ foodOrders }),
      setMarketplaceListings: (marketplaceListings) => set({ marketplaceListings }),
      setEkubGroups: (ekubGroups) => set({ ekubGroups }),

      reset: async () => {
        try {
          const { signOut } = require('../services/auth.service');
          await signOut();
        } catch (e) {
          console.warn('[AppStore] signOut failed:', e);
        }
        set({
          currentUser: null,
          balance: 0,
          transactions: [],
          notifications: [],
          toasts: [],
          products: [],
          selProdCat: 'All',
        });
        await SecurePersist.saveUser(null);
        await SecurePersist.saveBalance(0);
      },

      // ── Hydration Helper ──
      hydrateSession: async () => {
        const user = await SecurePersist.loadUser();
        const balance = await SecurePersist.loadBalance();
        set({ currentUser: user, balance });
      }
    }),
    {
      name: 'cl-storage-classic',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: any) => ({ 
        isDark: state.isDark, 
        notifications: state.notifications, 
        transactions: state.transactions 
      }),
    }
  )
);

// ── Backward Compatibility ───────────────────────────────────────────────────

/**
 * useAppStore — Zustand-based store hook.
 */
export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(selector);
}

/**
 * useAppStore.getState() — Static getter for service files.
 */
useAppStore.getState = () => useStore.getState();

/**
 * AppStoreProvider — Legacy pass-through to avoid breaking App.js.
 */
export function AppStoreProvider({ children }) {
  return children;
}

// ── Legacy Session Helpers (Proxy to SecurePersist) ───────────────────────────
export const loadSession = () => SecurePersist.loadUser();
export const saveSession = (user) => SecurePersist.saveUser(user);
export const clearSession = () => SecurePersist.saveUser(null);

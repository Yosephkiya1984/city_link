import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReactNode } from 'react';
import { SecurePersist } from './SecurePersist';
import { AppState, User, Product } from '../types';

// ── Utility ───────────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ── Store Definition ──────────────────────────────────────────────────────────

const useStore = create<AppState>()(
  persist(
    (set, _get) => ({
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
      unreadCount: 0,
      activeParking: null,
      tonightFilter: 'All',

      // ── Core Actions ──
      setIsDark: (val: boolean) => set({ isDark: val, theme: val ? 'dark' : 'light' }),
      toggleTheme: () => set((s) => ({ isDark: !s.isDark, theme: !s.isDark ? 'dark' : 'light' })),

      setCurrentUser: async (user: User | null) => {
        set({ currentUser: user });
        await SecurePersist.saveUser(user);
      },

      setBalance: async (val: number) => {
        set({ balance: val });
        await SecurePersist.saveBalance(val);
      },

      setTransactions: (txs: any[]) => set({ transactions: txs }),
      addTransaction: (tx: any) =>
        set((s) => ({ transactions: [tx, ...s.transactions].slice(0, 50) })),
      setNotifications: (notifs: any[]) => set({ notifications: notifs }),

      showToast: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        const id = uid();
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 3500);
      },

      addNotification: (notif: any) =>
        set((s) => ({
          notifications: [notif, ...s.notifications],
        })),

      markNotifRead: (id: string) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),

      clearNotifications: () => set({ notifications: [] }),

      setProducts: (items: Product[]) => set({ products: items }),
      setSelProdCat: (cat: string) => set({ selProdCat: cat }),
      setFavorites: (favs: string[]) => set({ favorites: favs }),
      setSettings: (settings: any) => set({ settings }),
      setLang: (lang: string) => set({ lang }),
      setTheme: (theme: 'light' | 'dark') => set({ theme, isDark: theme === 'dark' }),
      setChatHistory: (chatHistory: any[]) => set({ chatHistory }),
      setFoodOrders: (foodOrders: any[]) => set({ foodOrders }),
      setMarketplaceListings: (marketplaceListings: any[]) => set({ marketplaceListings }),
      setEkubGroups: (ekubGroups: any[]) => set({ ekubGroups }),
      setActiveParking: (activeParking: any) => set({ activeParking }),
      setTonightFilter: (tonightFilter: string) => set({ tonightFilter }),
      setUnreadCount: (unreadCount: number) => set({ unreadCount }),

      reset: async () => {
        try {
          const { signOut } = await import('../services/auth.service');
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
      },
    }),
    {
      name: 'cl-storage-classic',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: AppState) => ({
        isDark: state.isDark,
        notifications: state.notifications,
        transactions: state.transactions,
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
export function AppStoreProvider({ children }: { children: ReactNode }) {
  return children;
}

// ── Legacy Session Helpers (Proxy to SecurePersist) ───────────────────────────
export const loadSession = () => SecurePersist.loadUser();
export const saveSession = (user: User | null) => SecurePersist.saveUser(user);
export const clearSession = () => SecurePersist.saveUser(null);

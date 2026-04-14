import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  User, Transaction, Notification, ParkingSession, Product, 
  Toast, ChatMessage, AuthState, WalletState, SystemState, MarketplaceState 
} from '../types';
import { SecurePersist } from './SecurePersist';

// --- Slices ---

interface AuthSlice {
  currentUser: User | null;
  isAuthenticated: boolean;
  isVerified: boolean;
  setCurrentUser: (user: User | null) => Promise<void>;
  hydrateSession: () => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => Promise<void>;
}

const createAuthSlice: StateCreator<UnifiedState, [], [], AuthSlice> = (set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isVerified: false,

  setCurrentUser: async (user) => {
    const isVerified = !!(user?.fayda_verified || user?.kyc_status === 'VERIFIED');
    set({ currentUser: user, isAuthenticated: !!user, isVerified });
    await SecurePersist.saveUser(user);
    if (user) await get().hydrateWallet(user.id);
  },

  hydrateSession: async () => {
    const user = await SecurePersist.loadUser();
    const isVerified = !!(user?.fayda_verified || user?.kyc_status === 'VERIFIED');
    set({ currentUser: user, isAuthenticated: !!user, isVerified });
    if (user) await get().hydrateWallet(user.id);
  },

  signOut: async () => {
    try {
      const { signOut } = await import('../services/auth.service');
      await signOut();
    } catch (e) {
      console.warn('[UnifiedStore] signOut failed:', e);
    }
    set({ currentUser: null, isAuthenticated: false, isVerified: false, balance: 0, transactions: [] });
    await SecurePersist.saveUser(null);
  },

  reset: async () => {
    set({ 
      currentUser: null, 
      isAuthenticated: false, 
      isVerified: false, 
      balance: 0, 
      transactions: [], 
      notifications: [], 
      unreadCount: 0,
      activeParking: null
    });
    await SecurePersist.saveUser(null);
    await SecurePersist.saveBalance(0);
  },
});

interface WalletSlice {
  balance: number;
  transactions: Transaction[];
  activeParking: ParkingSession | null;
  setBalance: (val: number) => Promise<void>;
  setTransactions: (txs: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  setActiveParking: (session: ParkingSession | null) => void;
  hydrateWallet: (userId: string) => Promise<void>;
}

const createWalletSlice: StateCreator<UnifiedState, [], [], WalletSlice> = (set) => ({
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
});

interface SystemSlice {
  isDark: boolean;
  lang: string;
  toasts: Toast[];
  notifications: Notification[];
  unreadCount: number;
  chatHistory: ChatMessage[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setIsDark: (val: boolean) => void;
  setLang: (lang: string) => void;
  showToast: (message: string, type?: Toast['type']) => void;
  addNotification: (notif: Notification) => void;
  markNotifRead: (id: string) => void;
  clearNotifications: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
}

const createSystemSlice: StateCreator<UnifiedState, [], [], SystemSlice> = (set) => ({
  isDark: true,
  lang: 'en',
  toasts: [],
  notifications: [],
  unreadCount: 0,
  chatHistory: [],
  theme: 'dark',

  toggleTheme: () => set((s) => ({ isDark: !s.isDark, theme: !s.isDark ? 'dark' : 'light' })),
  setIsDark: (isDark) => set({ isDark, theme: isDark ? 'dark' : 'light' }),
  setLang: (lang) => set({ lang }),

  showToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    const timerId = setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
    // Use the toast's ID as a property of the store instance if needed (ignored in simple store without refs)
  },

  addNotification: (notif) => set((s) => ({ 
    notifications: [notif, ...s.notifications],
    unreadCount: s.unreadCount + 1
  })),

  markNotifRead: (id) => set((s) => {
    const targetNotif = s.notifications.find(n => n.id === id);
    if (!targetNotif || targetNotif.read) return s;

    const notifications = s.notifications.map((n) => 
      n.id === id ? { ...n, read: true, is_read: true } : n
    );
    return { notifications, unreadCount: Math.max(0, s.unreadCount - 1) };
  }),

  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
  addChatMessage: (msg) => set((s) => ({ chatHistory: [...s.chatHistory, msg].slice(-50) })),
  clearChat: () => set({ chatHistory: [] }),
});

interface MarketSlice {
  products: Product[];
  favorites: string[];
  setProducts: (items: Product[]) => void;
  setFavorites: (favs: string[]) => void;
}

const createMarketSlice: StateCreator<UnifiedState, [], [], MarketSlice> = (set) => ({
  products: [],
  favorites: [],
  setProducts: (products) => set({ products }),
  setFavorites: (favorites) => set({ favorites }),
});

type UnifiedState = AuthSlice & WalletSlice & SystemSlice & MarketSlice;

// --- Unified Store Setup ---
export const useAppStore = create<UnifiedState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createWalletSlice(...a),
      ...createSystemSlice(...a),
      ...createMarketSlice(...a),
    }),
    {
      name: 'citylink-unified-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1, // Store schema version for persistence migrations
      partialize: (state) => ({
        // Only persist these keys
        currentUser: state.currentUser,
        isDark: state.isDark,
        theme: state.theme,
        lang: state.lang,
        balance: state.balance,
        transactions: state.transactions,
        chatHistory: state.chatHistory,
        favorites: state.favorites,
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Future migrations logic goes here
        }
        return persistedState;
      },
    }
  )
);

// Helper for service files (non-hook access)
export const getAppState = () => useAppStore.getState();

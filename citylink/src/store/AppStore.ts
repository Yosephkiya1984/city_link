import { create } from 'zustand';
import { useAuthStore } from './AuthStore';
import { useWalletStore } from './WalletStore';
import { useSystemStore } from './SystemStore';
import { useMarketplaceStore } from './MarketplaceStore';
import { User, Product, Transaction, Notification, Toast, AppState } from '../types';

// The AppStore now acts as a coordinator between specialized stores.
export const useAppStore = <T = AppState>(selector?: (state: AppState) => T): T => {
  const auth = useAuthStore();
  const wallet = useWalletStore();
  const system = useSystemStore();
  const market = useMarketplaceStore();

  const bridgeState: AppState = {
    currentUser: auth.currentUser,
    setCurrentUser: auth.setCurrentUser,
    balance: wallet.balance,
    setBalance: wallet.setBalance,
    transactions: wallet.transactions,
    setTransactions: wallet.setTransactions,
    addTransaction: wallet.addTransaction,
    activeParking: wallet.activeParking,
    setActiveParking: (session) => wallet.setActiveParking(session),
    isDark: system.isDark,
    setIsDark: (val) => system.setIsDark(val),
    toggleTheme: system.toggleTheme,
    theme: system.isDark ? 'dark' : 'light',
    toasts: system.toasts,
    showToast: system.showToast,
    notifications: system.notifications,
    setNotifications: system.setNotifications,
    unreadCount: system.unreadCount,
    addChatMessage: system.addChatMessage,
    clearChat: system.clearChat,
    lang: system.lang,
    setLang: system.setLang,
    markNotifRead: system.markNotifRead,
    addNotification: system.addNotification,
    clearNotifications: system.clearNotifications,

    products: market.products,
    setProducts: market.setProducts,
    selProdCat: market.selProdCat,
    setSelProdCat: market.setSelProdCat,
    favorites: market.favorites,
    setFavorites: market.setFavorites,
    settings: {}, // Initial empty settings
    setSettings: (settings) => { console.warn('[AppStore] setSettings is not yet implemented.'); },

    hydrateSession: async () => {
      await auth.hydrate();
      const freshUser = useAuthStore.getState().currentUser;
      if (freshUser) {
        await wallet.hydrate(freshUser.id);
      }
    },
    reset: async () => {
      await auth.signOut();
      wallet.setBalance(0);
      wallet.setTransactions([]);
      market.reset();
    },
    chatHistory: system.chatHistory,
  };

  return selector ? selector(bridgeState) : (bridgeState as unknown as T);
};

// Static access for service files
useAppStore.getState = (): AppState => {
  const auth = useAuthStore.getState();
  const wallet = useWalletStore.getState();
  const system = useSystemStore.getState();
  const market = useMarketplaceStore.getState();

  return {
    currentUser: auth.currentUser,
    setCurrentUser: auth.setCurrentUser,
    balance: wallet.balance,
    setBalance: wallet.setBalance,
    transactions: wallet.transactions,
    setTransactions: wallet.setTransactions,
    addTransaction: wallet.addTransaction,
    activeParking: wallet.activeParking,
    setActiveParking: (session) => wallet.setActiveParking(session),
    isDark: system.isDark,
    setIsDark: (val) => system.setIsDark(val),
    toggleTheme: system.toggleTheme,
    theme: system.isDark ? 'dark' : 'light',
    toasts: system.toasts,
    showToast: system.showToast,
    notifications: system.notifications,
    setNotifications: system.setNotifications,
    unreadCount: system.unreadCount,
    addChatMessage: system.addChatMessage,
    clearChat: system.clearChat,
    lang: system.lang,
    setLang: system.setLang,
    markNotifRead: system.markNotifRead,
    addNotification: system.addNotification,
    clearNotifications: system.clearNotifications,

    products: market.products,
    setProducts: market.setProducts,
    selProdCat: market.selProdCat,
    setSelProdCat: market.setSelProdCat,
    favorites: market.favorites,
    setFavorites: market.setFavorites,
    settings: {},
    setSettings: (settings) => { console.warn('[AppStore] setSettings is not yet implemented.'); },

    hydrateSession: async () => {
      await auth.hydrate();
      const freshUser = useAuthStore.getState().currentUser;
      if (freshUser) {
        await wallet.hydrate(freshUser.id);
      }
    },
    reset: async () => {
      await auth.signOut();
      wallet.setBalance(0);
      wallet.setTransactions([]);
      market.reset();
    },
    chatHistory: system.chatHistory,
  };
};

export const AppStoreProvider = ({ children }: any) => children;


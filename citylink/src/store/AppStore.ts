import { create } from 'zustand';
import { useAuthStore } from './AuthStore';
import { useWalletStore } from './WalletStore';
import { useSystemStore } from './SystemStore';
import { User, Product } from '../types';

/**
 * AppState (Legacy / Bridge)
 * This store now acts as a coordinator between specialized stores to avoid
 * breaking existing imports across the codebase.
 */
export interface AppState {
  // Bridge to AuthStore
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  // Bridge to WalletStore
  balance: number;
  setBalance: (val: number) => void;
  transactions: any[];
  setTransactions: (txs: any[]) => void;
  addTransaction: (tx: any) => void;

  // Bridge to SystemStore
  isDark: boolean;
  setIsDark: (val: boolean) => void;
  toggleTheme: () => void;
  theme: 'light' | 'dark';
  toasts: any[];
  showToast: (msg: string, type?: any) => void;
  notifications: any[];
  unreadCount: number;

  // Still local to AppStore (To be migrated in next chunk)
  products: Product[];
  setProducts: (items: Product[]) => void;
  selProdCat: string;
  setSelProdCat: (cat: string) => void;
  favorites: string[];
  setFavorites: (favs: string[]) => void;
  
  // Helpers
  hydrateSession: () => Promise<void>;
  reset: () => Promise<void>;
}

// We use a "Derived Store" pattern for the bridge
export const useAppStore = <T,>(selector: (state: AppState) => T): T => {
  const auth = useAuthStore();
  const wallet = useWalletStore();
  const system = useSystemStore();
  
  // Local state for non-migrated items (using a hidden internal store)
  const local = useInternalStore();

  const bridgeState: AppState = {
    currentUser: auth.currentUser,
    setCurrentUser: auth.setCurrentUser,
    balance: wallet.balance,
    setBalance: wallet.setBalance,
    transactions: wallet.transactions,
    setTransactions: wallet.setTransactions,
    addTransaction: wallet.addTransaction,
    isDark: system.isDark,
    setIsDark: (val) => system.setLang(system.lang), // Dummy for theme
    toggleTheme: system.toggleTheme,
    theme: system.isDark ? 'dark' : 'light',
    toasts: system.toasts,
    showToast: system.showToast,
    notifications: system.notifications,
    unreadCount: system.unreadCount,
    
    products: local.products,
    setProducts: local.setProducts,
    selProdCat: local.selProdCat,
    setSelProdCat: local.setSelProdCat,
    favorites: local.favorites,
    setFavorites: local.setFavorites,

    hydrateSession: async () => {
      await auth.hydrate();
      if (auth.currentUser) {
        await wallet.hydrate(auth.currentUser.id);
      }
    },
    reset: async () => {
      await auth.signOut();
      wallet.setBalance(0);
      wallet.setTransactions([]);
    }
  };

  return selector(bridgeState);
};

// Internal store for remaining legacy data
const useInternalStore = create<any>((set) => ({
  products: [],
  setProducts: (products: any) => set({ products }),
  selProdCat: 'All',
  setSelProdCat: (selProdCat: any) => set({ selProdCat }),
  favorites: [],
  setFavorites: (favorites: any) => set({ favorites }),
}));

// Static access for service files
useAppStore.getState = () => {
  const auth = useAuthStore.getState();
  const wallet = useWalletStore.getState();
  const system = useSystemStore.getState();
  const local = useInternalStore.getState();

  return {
    currentUser: auth.currentUser,
    balance: wallet.balance,
    isDark: system.isDark,
    products: local.products,
    // Add other fields as needed for services
  } as any;
};

export const AppStoreProvider = ({ children }: any) => children;


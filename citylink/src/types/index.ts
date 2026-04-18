export * from './domain_types';

import {
  User,
  UserRole,
  KYCStatus,
  Transaction,
  Notification,
  ParkingSession,
  Product,
  AuthState,
  WalletState,
  SystemState,
  MarketplaceState,
  ChatMessage,
  Toast,
} from './domain_types';

/**
 * Root App State
 * Combines all feature-specific states for the global useStore.
 */
export interface AppState extends AuthState, WalletState, SystemState, MarketplaceState {
  // Theme & UI state
  isDark: boolean;
  theme: 'light' | 'dark';
  lang: string;
  toasts: Toast[];

  // Content & Activity
  notifications: Notification[];
  unreadCount: number;
  transactions: Transaction[];
  activeParking: ParkingSession | null;
  products: Product[];
  favorites: string[];
  selProdCat: string;
  chatHistory: ChatMessage[];

  // Auth state
  currentUser: User | null;
  balance: number;

  // Actions
  setIsDark: (val: boolean) => void;
  toggleTheme: () => void;
  setLang: (lang: string) => void;
  showToast: (message: string, type?: Toast['type']) => void;

  setNotifications: (notifs: Notification[]) => void;
  addNotification: (notif: Notification) => void;
  markNotifRead: (id: string) => void;
  clearNotifications: () => void;

  setCurrentUser: (user: User | null) => void;
  setBalance: (val: number) => void;
  setTransactions: (txs: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;

  setProducts: (items: Product[]) => void;
  setSelProdCat: (cat: string) => void;
  setFavorites: (favs: string[]) => void;

  setActiveParking: (session: ParkingSession | null) => void;

  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;

  hydrateSession: () => Promise<void>;
  reset: () => Promise<void>;

  // System
  settings: Record<string, unknown>;
  setSettings: (settings: Record<string, unknown>) => void;
}

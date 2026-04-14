import { 
  Transaction, Notification, MerchantDetails, FoodOrderItem, Wallet, P2PTransfer,
  ParkingLot, ParkingSpot, ParkingSession, Product, FoodItem, PropertyListing,
  EkubCircle, EkubMember, EkubContribution, EkubDraw, EkubVouch,
  MarketplaceOrder, Escrow, Dispute, MerchantMetrics, DeliveryAgent,
  DeliveryDispatch, AgentTelemetry, Restaurant, MenuItem, FoodOrder, PropertyEnquiry,
  FaydaKycData, KYCStatus, UserRole, VehicleType, AgentStatus, EkubGroup
} from './domain_types';

export type { 
  Transaction, Notification, MerchantDetails, FoodOrderItem, Wallet, P2PTransfer,
  ParkingLot, ParkingSpot, ParkingSession, Product, FoodItem, PropertyListing,
  EkubCircle, EkubMember, EkubContribution, EkubDraw, EkubVouch,
  MarketplaceOrder, Escrow, Dispute, MerchantMetrics, DeliveryAgent,
  DeliveryDispatch, AgentTelemetry, Restaurant, MenuItem, FoodOrder, PropertyEnquiry,
  FaydaKycData, KYCStatus, UserRole, VehicleType, AgentStatus, EkubGroup
};

export interface User {
  id: string;
  full_name?: string;
  business_name?: string;
  merchant_name?: string;
  role?: UserRole;
  fayda_verified?: boolean;
  kyc_status?: KYCStatus | string;
  status?: string; // Handle status from joins
  merchant_type?: string;
  merchant_status?: string;
  tin?: string;
  subcity?: string;
  woreda?: string;
  phone?: string;
  avatar_url?: string;
  region?: string;
  created_at?: string;
  credit_score?: number;
  credit_tier?: string;
  credit_updated_at?: string;
  license_no?: string;
  trade_license?: string;
  welcome_bonus_paid?: boolean;
  merchant_details?: MerchantDetails;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isVerified: boolean;
}

export interface WalletState {
  balance: number;
  transactions: Transaction[];
  activeParking: ParkingSession | null;
}

export interface SystemState {
  isDark: boolean;
  lang: string;
  toasts: Toast[];
  notifications: Notification[];
  unreadCount: number;
  chatHistory: ChatMessage[];
}

export interface MarketplaceState {
  products: Product[];
  favorites: string[];
}

export interface AppState extends AuthState, WalletState, SystemState, MarketplaceState {
  isDark: boolean;
  notifications: Notification[];
  transactions: Transaction[];
  currentUser: User | null;
  balance: number;
  toasts: Toast[];
  products: Product[];
  selProdCat: string;
  unreadCount: number;
  activeParking: ParkingSession | null;
  setActiveParking: (session: ParkingSession | null) => void;
  setIsDark: (val: boolean) => void;
  toggleTheme: () => void;
  setCurrentUser: (user: User | null) => void;
  setBalance: (val: number) => void;
  setTransactions: (txs: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  setNotifications: (notifs: Notification[]) => void;
  showToast: (message: string, type?: Toast['type']) => void;
  addNotification: (notif: Notification) => void;
  markNotifRead: (id: string) => void;
  clearNotifications: () => void;
  setProducts: (items: Product[]) => void;
  setSelProdCat: (cat: string) => void;
  favorites: string[];
  settings: Record<string, unknown>;
  lang: string;
  setFavorites: (favs: string[]) => void;
  setSettings: (settings: Record<string, unknown>) => void;
  setLang: (lang: string) => void;
  theme: 'light' | 'dark';
  chatHistory: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  hydrateSession: () => Promise<void>;
  reset: () => Promise<void>;
}

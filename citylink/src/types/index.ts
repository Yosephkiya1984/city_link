export interface User {
  id: string;
  full_name?: string;
  business_name?: string;
  merchant_name?: string;
  role?: 'citizen' | 'merchant' | 'delivery_agent' | 'admin';
  fayda_verified?: boolean;
  kyc_status?: string;
  merchant_type?: string;
  merchant_status?: string;
  tin?: string;
  subcity?: string;
  woreda?: string;
  phone?: string;
  avatar_url?: string;
  region?: string;
  credit_score?: number;
  credit_tier?: string;
  credit_updated_at?: string;
}

export interface Product {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  images_json?: string[];
  stock: number;
  status: 'active' | 'removed' | 'pending';
  condition?: string;
  merchant_id: string;
  created_at?: string;
  updated_at?: string;
  business_name?: string;
  merchant_name?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  available?: boolean;
  category?: string;
  image_url?: string;
  restaurant_id?: string;
}

export interface PropertyListing {
  id: string;
  agent_id: string;
  title: string;
  description?: string;
  category: string;
  price: number;
  location: string;
  status: 'ACTIVE' | 'NEGOTIATING' | 'AGREED' | 'COMPLETED' | 'REMOVED';
  images_json?: string[];
  created_at?: string;
}

export interface ParkingSession {
  id: string;
  citizen_id: string;
  lot_id: string;
  lot_name?: string;
  plate_number: string;
  started_at: string;
  ended_at?: string;
  amount_charged?: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface AppState {
  isDark: boolean;
  notifications: any[];
  transactions: any[];
  currentUser: User | null;
  balance: number;
  toasts: any[];
  products: Product[];
  selProdCat: string;
  unreadCount: number;
  activeParking: any;
  setIsDark: (val: boolean) => void;
  toggleTheme: () => void;
  setCurrentUser: (user: User | null) => Promise<void>;
  setBalance: (val: number) => Promise<void>;
  setTransactions: (txs: any[]) => void;
  addTransaction: (tx: any) => void;
  setNotifications: (notifs: any[]) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  addNotification: (notif: any) => void;
  markNotifRead: (id: string) => void;
  clearNotifications: () => void;
  setProducts: (items: Product[]) => void;
  setSelProdCat: (cat: string) => void;
  favorites: string[];
  settings: any;
  lang: string;
  setFavorites: (favs: string[]) => void;
  setSettings: (settings: any) => void;
  setLang: (lang: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  chatHistory: any[];
  foodOrders: any[];
  marketplaceListings: any[];
  ekubGroups: any[];
  theme: 'light' | 'dark';
  setChatHistory: (history: any[]) => void;
  setFoodOrders: (orders: any[]) => void;
  setMarketplaceListings: (listings: any[]) => void;
  setEkubGroups: (groups: any[]) => void;
  setActiveParking: (session: any) => void;
  setUnreadCount: (count: number) => void;
  reset: () => Promise<void>;
  hydrateSession: () => Promise<void>;
}

export interface EkubCircle {
  id: string;
  organiser_id: string;
  name: string;
  contribution_amount: number;
  frequency: 'Weekly' | 'Bi-weekly' | 'Monthly';
  max_members: number;
  current_round: number;
  status: 'FORMING' | 'ACTIVE' | 'ESCROW_LOCKED' | 'COMPLETE';
  pot_balance: number;
  rules?: string;
  visibility: 'public' | 'invite-only';
  created_at: string;
  updated_at: string;
}

export interface EkubMember {
  id: string;
  ekub_id: string;
  user_id: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  is_organiser: boolean;
  has_won: boolean;
  missed_rounds: number;
  penalty_balance: number;
  application_reason?: string;
  joined_at: string;
  user?: User;
}

export interface EkubContribution {
  id: string;
  ekub_id: string;
  user_id: string;
  round_number: number;
  amount: number;
  base_amount: number;
  penalty_amount: number;
  paid_at: string;
}

export interface EkubDraw {
  id: string;
  ekub_id: string;
  round_number: number;
  status: 'AWAITING_CONSENT' | 'NEEDS_VOUCHING' | 'PENDING_RELEASE' | 'RELEASED' | 'DISPUTED' | 'VOIDED';
  winner_id: string;
  winner_name: string;
  pot_amount: number;
  seed_hash: string;
  consent_signed: boolean;
  consent_signed_at?: string;
  admin_override?: boolean;
  created_at: string;
  released_at?: string;
}

export interface EkubVouch {
  id: string;
  draw_id: string;
  ekub_id: string;
  voucher_id: string;
  voucher_name: string;
  is_approved: boolean;
  reason?: string;
  vouched_at: string;
}

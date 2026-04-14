import { Transaction } from './domain_types';

export type { Transaction };

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
  license_no?: string;
  merchant_details?: any;
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
  poster_id: string;
  title: string;
  description?: string;
  category: string;
  price: number;
  location: string;
  status: 'ACTIVE' | 'NEGOTIATING' | 'AGREED' | 'FAILED';
  deal_status?: string;
  broker?: string;
  images: string[];  // jsonb[] in DB
  images_json?: string[];  // @deprecated — use `images`
  video_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ParkingSession {
  id: string;
  user_id: string;
  lot_id: string;
  merchant_id?: string;
  spot_number: string;
  plate?: string;
  pin?: string;
  reservation_id?: string;
  start_time: string;
  end_time?: string;
  calculated_cost?: number;
  hold_amount?: number;
  status: string;  // DB allows: RESERVED, completed, payment_failed, refund_failed, etc.
  citizen_confirmed_exit?: boolean;
  merchant_confirmed_exit?: boolean;
  refund_failed?: boolean;
  refund_error?: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;  // DB is unconstrained text; common values: 'info', 'success', 'warning', 'error', 'push'
  read: boolean;  // DB column name
  is_read?: boolean;  // @deprecated — frontend alias, mapped in DataEngine/realtime
  data?: Record<string, unknown>;  // DB column name (jsonb)
  metadata?: Record<string, unknown>;  // @deprecated — frontend alias
  created_at: string;
  updated_at?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export interface AppState {
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

export interface User {
  id: string;
  full_name?: string;
  business_name?: string;
  merchant_name?: string;
  role?: 'citizen' | 'merchant' | 'delivery_agent' | 'station' | 'inspector' | 'admin' | 'minister';
  fayda_verified?: boolean;
  kyc_status?: string;
  subcity?: string;
  woreda?: string;
  phone?: string;
  avatar_url?: string;
  cv?: {
    title?: string;
    summary?: string;
    skills?: string[];
    experience?: any[];
    education?: any[];
    portfolio_url?: string;
    linkedin_url?: string;
    github_url?: string;
    expected_salary?: string;
    job_type?: string;
    availability?: string;
    remote_work?: boolean;
  };
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
  tonightFilter: string;
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
  setTonightFilter: (filter: string) => void;
  setUnreadCount: (count: number) => void;
  reset: () => Promise<void>;
  hydrateSession: () => Promise<void>;
}

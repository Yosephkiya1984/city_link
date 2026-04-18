/**
 * CityLink Domain Models
 * Strict types for core super-app entities.
 */

export type UserRole =
  | 'citizen'
  | 'merchant'
  | 'delivery_agent'
  | 'station'
  | 'inspector'
  | 'admin'
  | 'minister';

export type VehicleType = 'bicycle' | 'motorcycle' | 'car' | 'van' | 'truck' | 'tuktuk' | 'foot';

export type AgentStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';

export type KYCStatus =
  | 'NOT_STARTED'
  | 'INITIATED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SUSPENDED';

export interface OfflineP2PTransfer {
  id: string;
  sender_id: string;
  recipient_phone_encrypted: string;
  recipient_phone_hash: string;
  amount: number;
  note_encrypted: string | null;
  note_hash: string | null;
  status: 'pending' | 'claimed' | 'synced';
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  /** @deprecated Use `read` instead. Kept for backward compatibility with existing code. */
  is_read?: boolean;
  data?: Record<string, unknown>;
  /** @deprecated Use `data` instead */
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  user_id?: string;
  amount: number;
  type: 'credit' | 'debit';
  category:
    | 'transfer'
    | 'marketplace'
    | 'utility'
    | 'fine'
    | 'topup'
    | 'withdrawal'
    | 'escrow'
    | string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  idempotency_key?: string;
  created_at: string;
  late?: boolean; // Required for credit scoring
}

export interface FinancialSummary {
  balance: number;
  total_spent: number;
  total_received: number;
  transaction_count: number;
}

export interface KYCProfile {
  fayda_id: string;
  full_name: string;
  status: KYCStatus;
  verified_at?: string;
  photo_url?: string;
}

export interface FaydaKycData {
  [key: string]: unknown; // Broaden index signature for national ID extensions
  // fayda_id is required; other fields are based on Fayda National ID standard.
  fayda_id: string;
  full_name: string;
  date_of_birth: string;
  gender: 'M' | 'F';
  region: string;
  sub_city?: string;
  woreda?: string;
  house_number?: string;
  phone: string;
  email?: string;
  photo?: string;
  fingerprint_hash?: string;
  iris_hash?: string;
  verification_status: string;
  issued_date?: string | null;
  expiry_date?: string | null;
  national_id?: string;
  passport_number?: string | null;
  blood_group?: string;
  emergency_contact?: string;
  occupation?: string;
  employer?: string;
  marital_status?: string;
  education_level?: string;
  verified_at?: string;
  verification_method?: string;
  api_ready?: boolean;
}

export interface MerchantDetails {
  business_name?: string;
  merchant_name?: string;
  business_address?: string;
  license_expiry?: string;
  tax_id?: string;
  tin?: string;
  license_no?: string;
  subcity?: string;
  address?: string;
  storefront_image?: string;
  categories?: string[];
  bank_name?: string;
  account_number?: string;
  operating_hours?: Record<string, string>;
  merchant_type?: string;
  merchant_status?: string;
}

export interface User {
  id: string;
  full_name?: string;
  role?: UserRole;
  phone?: string;
  email?: string;
  fayda_verified?: boolean;
  kyc_status?: KYCStatus | string;
  subcity?: string;
  woreda?: string;
  created_at?: string;
  credit_score?: number;
  credit_updated_at?: string;
  welcome_bonus_paid?: boolean;
  onboarded?: boolean;
  pin_hash?: string;
  avatar_url?: string;
  merchant_details?: MerchantDetails;

  // 🏛️ Legacy/Flattened compatibility fields
  business_name?: string;
  merchant_name?: string;
  merchant_type?: string;
  tin?: string;
  license_no?: string;
  trade_license?: string;
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

export interface FoodOrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
  notes?: string;
}

export interface P2PTransfer {
  id: string;
  sender_id: string;
  recipient_id: string;
  recipient_phone: string;
  amount: number;
  status: 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
  note?: string;
  idempotency_key?: string;
  created_at: string;
  claimed_at?: string;
}

export interface ParkingLot {
  id: string;
  merchant_id: string;
  name: string;
  address: string;
  base_rate?: number;
  hourly_rate?: number;
  capacity?: number;
  total_spots?: number;
  available_spots: number;
  created_at?: string;
  parking_spots?: ParkingSpot[];
}

export interface ParkingSpot {
  id: string;
  lot_id: string;
  spot_number: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
}

export interface ParkingSession {
  id: string;
  user_id: string;
  merchant_id: string;
  lot_id: string;
  spot_id?: string;
  spot_number: string;
  plate?: string;
  pin?: string;
  reservation_id?: string;
  start_time: string;
  end_time?: string;
  status: string;
  calculated_cost?: number;
  hold_amount?: number;
  new_balance?: number;
  fayda_entry_id?: string;
  citizen_confirmed_exit?: boolean;
  merchant_confirmed_exit?: boolean;
  refund_failed?: boolean;
  refund_error?: string | Record<string, unknown>;
  created_at: string;
}

export interface Product {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  /** @deprecated Use `image_url` instead. Kept for backward compatibility. */
  image?: string;
  images_json?: string[];
  stock: number;
  max_stock?: number;
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
  images: string[];
  images_json?: string[];
  video_url?: string;
  created_at?: string;
  updated_at?: string;
  negotiations?: { merchant: string; offer: number }[]; // Join mapping
}

export interface EkubCircle {
  id: string;
  organiser_id: string;
  name: string;
  contribution_amount: number;
  frequency: 'Weekly' | 'Bi-weekly' | 'Monthly';
  max_members: number;
  current_round: number;
  status: 'FORMING' | 'ACTIVE' | 'PAUSED' | 'COMPLETE';
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
  profile?: { full_name: string; phone: string }; // Mapping for Supabase joins
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
  status:
    | 'AWAITING_CONSENT'
    | 'NEEDS_VOUCHING'
    | 'PENDING_RELEASE'
    | 'RELEASED'
    | 'DISPUTED'
    | 'VOIDED';
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

export interface MarketplaceOrder {
  id: string;
  buyer_id: string;
  merchant_id: string;
  product_id: string;
  product_name?: string;
  qty: number;
  total: number;
  status:
    | 'PAID'
    | 'DISPATCHING'
    | 'AGENT_ASSIGNED'
    | 'SHIPPED'
    | 'IN_TRANSIT'
    | 'AWAITING_PIN'
    | 'COMPLETED'
    | 'DISPUTED'
    | 'CANCELLED'
    | 'REJECTED_BY_BUYER';
  delivery_pin?: string;
  pickup_pin?: string;
  agent_fee?: number;
  platform_fee?: number;
  shipping_address?: string;
  merchant_confirmed_pickup?: boolean;
  agent_confirmed_pickup?: boolean;
  created_at: string;
  updated_at: string;
  buyer?: { full_name?: string; phone?: string } | { full_name?: string; phone?: string }[];
  merchant?:
    | { business_name?: string; merchant_name?: string }
    | { business_name?: string; merchant_name?: string }[];
}

export interface Escrow {
  id: string;
  order_id: string;
  amount: number;
  status: 'LOCKED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
  released_at?: string;
  created_at: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  buyer_id: string;
  merchant_id: string;
  product_name: string;
  amount: number;
  reason: string;
  description: string;
  stage: 'before_pin' | 'after_pin';
  status: 'OPEN' | 'CLOSED';
  raised_at: string;
}

export interface MerchantMetrics {
  totalRevenue: number;
  activeOrders: number;
  totalProducts: number;
  lowStock: number;
}

export interface MerchantSalesHistory {
  curve: number[];
  raw: number[];
  labels: string[];
}

export interface DeliveryAgent {
  id: string;
  user_id?: string; // Standardize link to profile
  vehicle_type: VehicleType;
  plate_number?: string;
  license_number: string;
  is_online: boolean;
  agent_status: AgentStatus;
  total_deliveries: number;
  rating: number;
  current_lat?: number;
  current_lng?: number;
  current_location?: { lat: number; lng: number }; // Frontend compatibility
  location_updated_at?: string;
  created_at: string;
  updated_at?: string;
  profile?: { full_name: string; phone: string };
  distanceKm?: number;
}

export interface DeliveryDispatch {
  id: string;
  order_id: string;
  agent_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  expires_at: string;
  responded_at?: string;
  created_at: string;
  order?: MarketplaceOrder;
}

export interface AgentTelemetry {
  id: string;
  agent_id: string;
  order_id?: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  created_at: string;
}

export interface Restaurant {
  id: string;
  merchant_id: string;
  name: string;
  category: string;
  is_open: boolean;
  rating?: number;
  image_url?: string;
  address?: string;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  merchant_id?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category: string;
  available: boolean;
}

export interface FoodOrder {
  id: string;
  citizen_id: string;
  merchant_id: string;
  restaurant_id: string;
  restaurant_name: string;
  items: FoodOrderItem[];
  total: number;
  status: 'NEW' | 'PREPARING' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  delivery_pin?: string;
  created_at: string;
}

export interface PropertyEnquiry {
  id: string;
  listing_id: string;
  agent_id: string;
  citizen_id: string;
  message: string;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'LOST';
  created_at: string;
}

export interface EkubGroup extends EkubCircle {}

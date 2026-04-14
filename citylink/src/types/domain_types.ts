/**
 * CityLink Domain Models
 * Strict types for core super-app entities.
 */

export type UserRole = 'citizen' | 'merchant' | 'delivery_agent' | 'station' | 'inspector' | 'admin' | 'minister';

export type KYCStatus = 'NOT_STARTED' | 'INITIATED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'SUSPENDED';

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  user_id?: string;
  amount: number;
  type: 'credit' | 'debit';
  category: 'transfer' | 'marketplace' | 'utility' | 'fine' | 'topup' | 'withdrawal' | 'escrow' | string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  reference_id?: string;
  idempotency_key?: string;
  created_at: string;
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

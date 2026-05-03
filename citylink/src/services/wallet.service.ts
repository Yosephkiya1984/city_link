import { supaQuery } from './supabase';
import { uid } from '../utils';
import { Transaction as DomainTransaction } from '../types/domain_types';
import { WalletApi } from '../modules/wallet';

/**
 * Wallet Service (Legacy Wrapper)
 * Delegates to modular WalletApi for domain-driven architecture.
 */

export const generateIdempotencyKey = WalletApi.generateIdempotencyKey.bind(WalletApi);
export const fetchWallet = WalletApi.fetchWallet.bind(WalletApi);
export const fetchWalletData = WalletApi.fetchWalletData.bind(WalletApi);
export const processTopup = WalletApi.processTopup.bind(WalletApi);
export const ensureWallet = WalletApi.ensureWallet.bind(WalletApi);
export const claimWelcomeBonus = WalletApi.claimWelcomeBonus.bind(WalletApi);
export const queueP2PTransfer = WalletApi.queueP2PTransfer.bind(WalletApi);

/**
 * fetchTransactions — returns recent transactions for a wallet.
 */
export async function fetchTransactions(walletId: string, limit = 20) {
  return supaQuery<DomainTransaction[]>((c) =>
    c
      .from('transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .limit(limit)
  );
}

/**
 * rpcDebitWallet — atomic server-side debit.
 */
export async function rpcDebitWallet(
  userId: string,
  amount: number,
  description: string,
  category = 'general',
  idempotencyKey: string | null = null
): Promise<{
  data: { ok: boolean; new_balance: number; error?: string } | null;
  error: string | null;
}> {
  return supaQuery<{ ok: boolean; new_balance: number; error?: string }>((c) =>
    c.rpc('debit_wallet_atomic', {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
      p_category: category,
      p_idempotency_key: idempotencyKey || uid(),
    })
  );
}

/**
 * rpcCreditWallet — atomic server-side credit.
 */
export async function rpcCreditWallet(
  userId: string,
  amount: number,
  description: string,
  category = 'general',
  idempotencyKey: string | null = null
): Promise<{
  data: { ok: boolean; new_balance: number; error?: string } | null;
  error: string | null;
}> {
  return supaQuery<{ ok: boolean; new_balance: number; error?: string }>((c) =>
    c.rpc('credit_wallet_atomic', {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
      p_category: category,
      p_idempotency_key: idempotencyKey || uid(),
    })
  );
}

/**
 * fetchSpendingInsights — Optimized query for Analytics.
 */
export async function fetchSpendingInsights(
  userId: string,
  days: number = 30
): Promise<{
  data: Pick<DomainTransaction, 'category' | 'amount' | 'created_at' | 'type'>[] | null;
  error: string | null;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: wallet } = await fetchWallet(userId);
  if (!wallet) return { data: null, error: 'no-wallet' };

  return supaQuery<Pick<DomainTransaction, 'category' | 'amount' | 'created_at' | 'type'>[]>((c) =>
    c
      .from('transactions')
      .select('category, amount, created_at, type')
      .eq('wallet_id', wallet.id)
      .eq('type', 'debit')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })
  );
}

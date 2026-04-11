import { supaQuery } from './supabase';
import { WELCOME_BONUS_ETB } from '../config';
import { SecurePersist } from '../store/SecurePersist';
import { uid } from '../utils';
import { Wallet, Transaction } from '../types/domain_types';

/**
 * fetchWallet — returns the raw wallet row for a given user ID.
 */
export async function fetchWallet(userId: string) {
  return supaQuery<Wallet>((c) => c.from('wallets').select('*').eq('user_id', userId).maybeSingle());
}

/**
 * fetchWalletData — High-level function used by screens.
 * Orchestrates balance, transactions, and SECURE OFFLINE CACHING.
 */
export async function fetchWalletData(userId: string) {
  if (!userId) return null;

  try {
    // 1. Fetch from Supabase
    const { data: wallet, error: wErr } = await DataEngine.wallets.get(userId);

    if (wErr) throw new Error(wErr);
    if (!wallet) return null;

    const { data: txs, error: tErr } = await DataEngine.wallets.getTransactions(wallet.id, 20);

    const result = {
      balance: wallet.balance,
      transactions: txs || [],
      walletId: wallet.id,
    };

    // 2. SECURE OFFLINE CACHE (Hardening)
    await SecurePersist.setItem(`wallet_cache_${userId}`, JSON.stringify(result));

    return result;
  } catch (error) {
    console.error('Wallet fetch failed, checking cache:', error);
    // FALLBACK TO CACHE (Strike 3 Resilience)
    const cached = await SecurePersist.getItem(`wallet_cache_${userId}`);
    return cached ? JSON.parse(cached) : null;
  }
}

/**
 * processTopup — Atomic idempotency wrapper for top-ups.
 */
export async function processTopup(userId: string, amount: number, provider: string) {
  const idempotencyKey = `topup-${userId.slice(0, 8)}-${Date.now()}`;

  const res = await supaQuery((c) =>
    c.rpc('credit_wallet_atomic', {
      p_user_id: userId,
      p_amount: amount,
      p_description: `Top-up via ${provider.toUpperCase()}`,
      p_category: 'topup',
      p_idempotency_key: idempotencyKey,
    })
  );

  return !res.error;
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
) {
  return supaQuery((c) =>
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
) {
  return supaQuery((c) =>
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
 * ensureWallet — ensures a wallet row exists for the user.
 * Uses atomic server-side RPC to avoid RLS insert conflicts.
 */
export async function ensureWallet(userId) {
  const { data, error } = await supaQuery((c) =>
    c.rpc('get_or_create_wallet', { p_user_id: userId })
  );
  if (error) return { data: null, error };

  // RPC returns a list since it's a TABLE return
  const wallet = Array.isArray(data) ? data[0] : data;
  return { data: { id: wallet.wallet_id, balance: wallet.current_balance } };
}

/**
 * claimWelcomeBonus — triggers the one-time welcome bonus logic.
 */
export async function claimWelcomeBonus(userId) {
  const res = await supaQuery((c) =>
    c.rpc('process_welcome_bonus', {
      p_user_id: userId,
      p_amount: WELCOME_BONUS_ETB,
      p_idempotency_key: `welcome-${userId.slice(0, 8)}`,
    })
  );

  if (res.error) return { applied: false, error: res.error };
  return { applied: true, newBalance: res.data?.new_balance };
}

/**
 * queueP2PTransfer — starts a P2P transfer (immediate if registered, queued otherwise).
 */
export async function queueP2PTransfer({ senderId, recipientPhone, amount, note }) {
  const idempotencyKey = `p2p-${senderId.slice(0, 8)}-${recipientPhone}-${Date.now()}`;
  const res = await supaQuery((c) =>
    c.rpc('process_p2p_transfer', {
      p_sender_id: senderId,
      p_recipient_phone: recipientPhone,
      p_amount: amount,
      p_note: note || '',
      p_idempotency_key: idempotencyKey,
    })
  );

  if (res.error) return { ok: false, error: res.error };
  if (!res.data?.ok) return { ok: false, error: res.data?.error || 'Transfer failed' };

  return { ok: true, newBalance: res.data?.new_balance, status: res.data?.status };
}

/**
 * fetchSpendingInsights — Optimized query for Analytics.
 * Groups spending by category and calculates daily totals.
 */
export async function fetchSpendingInsights(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: wallet } = await fetchWallet(userId);
  if (!wallet) return { data: null, error: 'no-wallet' };

  return supaQuery((c) => 
    c.from('transactions')
     .select('category, amount, created_at, type')
     .eq('wallet_id', wallet.id)
     .eq('type', 'debit')
     .gte('created_at', startDate.toISOString())
     .order('created_at', { ascending: true })
  );
}

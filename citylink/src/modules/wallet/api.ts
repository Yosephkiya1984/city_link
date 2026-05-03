import { supaQuery } from '../../services/supabase';
import { WELCOME_BONUS_ETB } from '../../config';
import { SecurePersist } from '../../store/SecurePersist';
import { uid } from '../../utils';
import { Wallet, Transaction } from '../../types';

/**
 * Wallet Domain API
 * Orchestrates financial operations, balance synchronization, and secure caching.
 */
export const WalletApi = {
  /**
   * generateIdempotencyKey — returns a stable key for a specific transaction context.
   * Standardizes key format: context:userId:amount:timestamp_bucket
   */
  generateIdempotencyKey(
    context: string,
    userId: string,
    amount: number,
    entropy?: string
  ): string {
    const bucket = Math.floor(Date.now() / 600000); // 10 minute stability window
    return `${context}:${userId.slice(0, 8)}:${amount}:${bucket}${entropy ? `:${entropy}` : ''}`;
  },

  /**
   * fetchWallet — returns the raw wallet row for a given user ID.
   */
  async fetchWallet(userId: string) {
    return supaQuery<Wallet>((c) =>
      c.from('wallets').select('*').eq('user_id', userId).maybeSingle()
    );
  },

  /**
   * ensureWallet — ensures a wallet row exists for the user.
   */
  async ensureWallet(
    userId: string
  ): Promise<{ data: { id: string; balance: number } | null; error?: string | null }> {
    const { data, error } = await supaQuery<{ wallet_id: string; current_balance: number }[]>((c) =>
      c.rpc('get_or_create_wallet', { p_user_id: userId })
    );
    if (error) return { data: null, error };

    const wallet = Array.isArray(data) ? data[0] : (data as any);
    if (!wallet) return { data: null, error: 'Failed to find/create wallet' };

    return { data: { id: wallet.wallet_id, balance: wallet.current_balance } };
  },

  /**
   * fetchWalletData — High-level function used by screens.
   * Orchestrates balance, transactions, and SECURE OFFLINE CACHING.
   */
  async fetchWalletData(
    userId: string
  ): Promise<{ balance: number; transactions: Transaction[]; walletId: string } | null> {
    if (!userId) return null;

    try {
      const { data: walletData, error: wErr } = await this.fetchWallet(userId);
      if (wErr) throw new Error(wErr);

      let wallet: any = walletData;
      if (!wallet) {
        const { data: newWallet, error: ensureErr } = await this.ensureWallet(userId);
        if (ensureErr) throw new Error(ensureErr);
        wallet = newWallet;
      }

      if (!wallet) return null;

      const { data: txs } = await supaQuery<Transaction[]>((c) =>
        c
          .from('transactions')
          .select('*')
          .eq('wallet_id', wallet.id)
          .order('created_at', { ascending: false })
          .limit(20)
      );

      const result = {
        balance: wallet.balance,
        transactions: txs || [],
        walletId: wallet.id,
      };

      await SecurePersist.setItem(`wallet-cache-${userId}`, JSON.stringify(result));
      return result;
    } catch (err: any) {
      const cached = await SecurePersist.getItem(`wallet-cache-${userId}`);
      if (cached) return JSON.parse(cached);
      return null;
    }
  },

  /**
   * processTopup — Atomic idempotency wrapper for top-ups.
   */
  async processTopup(
    userId: string,
    amount: number,
    provider: string,
    externalRef?: string
  ): Promise<boolean> {
    const idempotencyKey =
      externalRef || this.generateIdempotencyKey('topup', userId, amount, provider);
    const res = await supaQuery<{ ok: boolean }>((c) =>
      c.rpc('credit_wallet_atomic', {
        p_user_id: userId,
        p_amount: amount,
        p_description: `Top-up via ${provider.toUpperCase()}`,
        p_category: 'topup',
        p_idempotency_key: idempotencyKey,
      })
    );
    return !res.error && res.data?.ok === true;
  },

  /**
   * claimWelcomeBonus — triggers the one-time welcome bonus logic.
   */
  async claimWelcomeBonus(
    userId: string
  ): Promise<{ applied: boolean; newBalance?: number; error?: string | null }> {
    const res = await supaQuery<{ ok: boolean; new_balance: number; error?: string }>((c) =>
      c.rpc('process_welcome_bonus', {
        p_user_id: userId,
        p_amount: WELCOME_BONUS_ETB,
      })
    );

    if (res.error) return { applied: false, error: res.error };
    return { applied: res.data?.ok || false, newBalance: res.data?.new_balance };
  },

  /**
   * queueP2PTransfer — starts a P2P transfer.
   */
  async queueP2PTransfer({
    senderId,
    recipientPhone,
    amount,
    note,
    idempotencyKey,
  }: {
    senderId: string;
    recipientPhone: string;
    amount: number;
    note?: string;
    idempotencyKey?: string;
  }): Promise<{ ok: boolean; newBalance?: number; status?: string; error?: string | null }> {
    const finalKey =
      idempotencyKey ||
      this.generateIdempotencyKey(
        'p2p',
        senderId,
        amount,
        `${recipientPhone}:${uid().slice(0, 4)}`
      );

    const res = await supaQuery<{
      ok: boolean;
      new_balance: number;
      status: string;
      error?: string;
    }>((c) =>
      c.rpc('process_p2p_transfer', {
        p_sender_id: senderId,
        p_recipient_phone: recipientPhone,
        p_amount: amount,
        p_note: note || '',
        p_idempotency_key: finalKey,
      })
    );

    if (res.error) return { ok: false, error: res.error };
    if (!res.data?.ok) return { ok: false, error: res.data?.error || 'Transfer failed' };

    return { ok: true, newBalance: res.data?.new_balance, status: res.data?.status };
  },
};

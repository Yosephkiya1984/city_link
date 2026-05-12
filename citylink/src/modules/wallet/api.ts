import NetInfo from '@react-native-community/netinfo';
import { supaQuery } from '../../services/supabase';
import { SecurePersist } from '../../store/SecurePersist';
import { Transaction, Wallet } from '../../types';
import { uid } from '../../utils';
import { OfflineSyncService } from '../../services/OfflineSyncService';

/**
 * Wallet Domain API
 * Orchestrates financial operations, balance synchronization, and secure caching.
 */
export const WalletApi = {
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
   * fetchWalletData — High-level function to fetch balance and transactions.
   * Handles server fetch with secure cache fallback.
   * DOES NOT update global store (separation of concerns).
   */
  async fetchWalletData(
    userId: string
  ): Promise<{ balance: number; transactions: Transaction[]; walletId: string } | null> {
    if (!userId) return null;

    let attempts = 0;
    const maxAttempts = 3;

    // 1. Try server sync (iterative retry)
    while (attempts < maxAttempts) {
      try {
        const { data: walletData, error: wErr } = await WalletApi.fetchWallet(userId);
        if (wErr) throw new Error(wErr);

        let wallet: any = walletData;
        if (!wallet) {
          const { data: newWallet, error: ensureErr } = await WalletApi.ensureWallet(userId);
          if (ensureErr) throw new Error(ensureErr);
          wallet = newWallet;
        }

        if (!wallet) break; // Fallback to cache

        const { data: txs, error: txErr } = await supaQuery<Transaction[]>((c) =>
          c
            .from('transactions')
            .select('*')
            .eq('wallet_id', wallet.id)
            .order('created_at', { ascending: false })
            .limit(20)
        );

        if (txErr) console.warn('[WalletApi] Transaction fetch warning:', txErr);

        const result = {
          balance: wallet.balance,
          transactions: txs || [],
          walletId: wallet.id,
        };

        // Update secure cache for offline mode
        await SecurePersist.setItem(`wallet-cache-${userId}`, JSON.stringify(result));
        return result;
      } catch (err: any) {
        attempts++;
        console.error(`[WalletApi] Sync Attempt ${attempts} failed:`, err.message);
      }
    }

    // 2. Fallback to Secure Cache
    try {
      const cached = await SecurePersist.getItem(`wallet-cache-${userId}`);
      if (cached) {
        console.log('[WalletApi] Using secure cache fallback.');
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('[WalletApi] Cache fallback failed:', e);
    }

    return null;
  },

  /**
   * generateIdempotencyKey — returns a unique key for transaction safety.
   */
  generateIdempotencyKey(): string {
    return uid();
  },

  /**
   * processTopup — atomic top-up via external provider.
   */
  async processTopup(userId: string, amount: number, provider: string = 'telebirr'): Promise<boolean> {
    const { data, error } = await supaQuery<{ ok: boolean }>((c) =>
      c.rpc('process_topup_atomic', {
        p_user_id: userId,
        p_amount: amount,
        p_provider: provider,
        p_idempotency_key: uid(),
      })
    );
    return !!data?.ok && !error;
  },

  /**
   * claimWelcomeBonus — one-time bonus for new users.
   */
  async claimWelcomeBonus(userId: string): Promise<boolean> {
    const { data, error } = await supaQuery<{ ok: boolean }>((c) =>
      c.rpc('claim_welcome_bonus', { p_user_id: userId })
    );
    return !!data?.ok && !error;
  },

  /**
   * queueP2PTransfer — performs a peer-to-peer transfer.
   */
  async queueP2PTransfer(
    senderId: string,
    recipientPhone: string,
    amount: number,
    note: string = '',
    idempotencyKey?: string
  ): Promise<{ ok: boolean; newBalance?: number; status?: string; error?: string }> {
    const iKey = idempotencyKey || uid();
    
    // 1. Try online first
    const { data, error } = await supaQuery<{ ok: boolean; new_balance: number; status: string; error?: string }>((c) =>
      c.rpc('process_p2p_transfer', {
        p_sender_id: senderId,
        p_recipient_phone: recipientPhone,
        p_amount: amount,
        p_note: note,
        p_idempotency_key: iKey,
      })
    );

    if (error || !data) {
      // 2. If network error, queue for offline sync
      const net = await NetInfo.fetch();
      if (!net.isConnected || !net.isInternetReachable) {
        await OfflineSyncService.addAction({
          id: uid(),
          type: 'P2P_TRANSFER',
          payload: { senderId, recipientPhone, amount, note, idempotencyKey: iKey },
          createdAt: new Date().toISOString(),
        });
        return { ok: true, status: 'QUEUED_OFFLINE' };
      }
      return { ok: false, error: error || 'Transfer failed' };
    }

    if (!data.ok) return { ok: false, error: data.error };

    return { ok: true, newBalance: data.new_balance, status: data.status };
  },
};

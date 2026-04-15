import AsyncStorage from '@react-native-async-storage/async-storage';
import { uid } from '../utils';
import { SupabaseClient } from '@supabase/supabase-js';

const KEY = 'cl_pending_p2p_v1';

export interface OfflineP2PTransfer {
  id: string;
  sender_id: string;
  recipient_phone: string;
  amount: number;
  note: string | null;
  status: 'pending' | 'claimed' | 'synced';
  created_at: string;
}

async function readList(): Promise<OfflineP2PTransfer[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeList(list: OfflineP2PTransfer[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

/** Queue a send when Supabase is not configured (offline demo). */
export async function queueLocalPendingSend({ senderId, recipientPhone, amount, note }: { senderId: string, recipientPhone: string, amount: number | string, note?: string }): Promise<void> {
  const list = await readList();
  list.push({
    id: uid(),
    sender_id: senderId,
    recipient_phone: recipientPhone,
    amount: Number(amount),
    note: note || null,
    status: 'pending',
    created_at: new Date().toISOString(),
  });
  await writeList(list);
}

/** Credit total for matching recipient phone and mark rows claimed. */
export async function claimLocalPendingForPhone(phone: string): Promise<{ totalCredited: number, count: number }> {
  const list = await readList();
  const pending = list.filter((r) => r.recipient_phone === phone && r.status === 'pending');
  const total = pending.reduce((s, r) => s + Number(r.amount), 0);
  const claimedIds = new Set(pending.map((p) => p.id));
  const next = list.map((r) => (claimedIds.has(r.id) ? { ...r, status: 'claimed' as const } : r));
  await writeList(next);
  return { totalCredited: total, count: pending.length };
}

/**
 * Attempts to push all locally queued 'pending' transfers to the live database.
 * This should be called when NetInfo detects an online connection.
 */
export async function syncOfflineQueueToSupabase(supabaseClient: SupabaseClient): Promise<{ success: boolean; count: number }> {
  const list = await readList();
  const pending = list.filter((r) => r.status === 'pending');

  if (pending.length === 0 || !supabaseClient) return { success: true, count: 0 };

  let successCount = 0;

  for (const item of pending) {
    // Attempt remote processing via RPC
    const { error } = await supabaseClient.rpc('process_p2p_transfer', {
      p_sender_id: item.sender_id,
      p_recipient_phone: item.recipient_phone,
      p_amount: item.amount,
      p_note: item.note,
      p_idempotency_key: item.id, // Use local ID as idempotency key
    });

    // If successful, mark local as synced
    if (!error) {
      item.status = 'synced';
      successCount++;
    } else {
      if (__DEV__) console.warn('[P2P-Sync] Transfer failed:', error);
    }
  }

  // Save updated local list
  await writeList(list);
  return { success: true, count: successCount };
}

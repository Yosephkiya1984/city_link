import AsyncStorage from '@react-native-async-storage/async-storage';
import { uid } from '../utils';

const KEY = 'cl_pending_p2p_v1';

async function readList() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeList(list) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

/** Queue a send when Supabase is not configured (offline demo). */
export async function queueLocalPendingSend({ senderId, recipientPhone, amount, note }) {
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
export async function claimLocalPendingForPhone(phone) {
  const list = await readList();
  const pending = list.filter((r) => r.recipient_phone === phone && r.status === 'pending');
  const total = pending.reduce((s, r) => s + Number(r.amount), 0);
  const claimedIds = new Set(pending.map((p) => p.id));
  const next = list.map((r) => (claimedIds.has(r.id) ? { ...r, status: 'claimed' } : r));
  await writeList(next);
  return { totalCredited: total, count: pending.length };
}

/**
 * Attempts to push all locally queued 'pending' transfers to the live database.
 * This should be called when NetInfo detects an online connection.
 */
export async function syncOfflineQueueToSupabase(supabaseClient) {
  const list = await readList();
  const pending = list.filter((r) => r.status === 'pending');

  if (pending.length === 0 || !supabaseClient) return { success: true, count: 0 };

  let successCount = 0;

  for (const item of pending) {
    // Attempt remote insertion
    const { error } = await supabaseClient.from('pending_p2p_transfers').insert([
      {
        id: item.id,
        sender_id: item.sender_id,
        recipient_phone: item.recipient_phone,
        amount: item.amount,
        note: item.note,
        status: 'pending', // Let the server handle status resolution over time
      },
    ]);

    // If successful, mark local as synced
    if (!error) {
      item.status = 'synced';
      successCount++;
    }
  }

  // Save updated local list
  await writeList(list);
  return { success: true, count: successCount };
}

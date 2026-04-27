import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import { SecurityUtils } from '../utils/security';
import { OfflineP2PTransfer } from '../types/domain_types';

// 🛡️ SECURITY: Version bump to v2 (Secure) triggers an automatic purge of v1 (Insecure) data.
const KEY = 'cl_pending_p2p_v2_secure';
const CL_SALT = 'citylink_offline_privacy_salt_2024';

async function hashData(data: string | null): Promise<string | null> {
  if (!data) return null;
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${data}:${CL_SALT}`);
}

async function encryptData(data: string): Promise<string> {
  return await SecurityUtils.encrypt(data);
}

async function decryptData(encrypted: string): Promise<string> {
  return await SecurityUtils.decrypt(encrypted);
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

/**
 * Queue a send locally with AES-256 encryption.
 */
export async function queueLocalPendingSend({
  senderId,
  recipientPhone,
  amount,
  note,
}: {
  senderId: string;
  recipientPhone: string;
  amount: number | string;
  note?: string;
}): Promise<void> {
  const list = await readList();

  // 🛡️ World-Class Encryption
  const recipientPhoneEncrypted = await encryptData(recipientPhone);
  const recipientPhoneHash = await hashData(recipientPhone);
  const noteEncrypted = note ? await encryptData(note) : null;
  const noteHash = await hashData(note || null);

  list.push({
    // 🛡️ SECURITY: Use a cryptographically secure UUID for the idempotency key.
    // This value is passed to process_p2p_transfer as p_idempotency_key.
    // Math.random() was previously used — a predictable key risks double-spend / replay attacks.
    id: Crypto.randomUUID(),
    sender_id: senderId,
    recipient_phone_encrypted: recipientPhoneEncrypted,
    recipient_phone_hash: recipientPhoneHash!,
    amount: Number(amount),
    note_encrypted: noteEncrypted,
    note_hash: noteHash,
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  await writeList(list);
}

/**
 * Claim locally queued transfers for a matching phone number.
 */
export async function claimLocalPendingForPhone(
  phone: string
): Promise<{ totalCredited: number; count: number }> {
  const list = await readList();
  const phoneHash = await hashData(phone);

  const pending = list.filter(
    (r) => r.recipient_phone_hash === phoneHash && r.status === 'pending'
  );
  const total = pending.reduce((s, r) => s + Number(r.amount), 0);
  const claimedIds = new Set(pending.map((p) => p.id));

  const next = list.map((r) => (claimedIds.has(r.id) ? { ...r, status: 'claimed' as const } : r));
  await writeList(next);

  return { totalCredited: total, count: pending.length };
}

/**
 * Attempts to push all locally queued 'pending' transfers to the live database.
 */
export async function syncOfflineQueueToSupabase(supabaseClient: SupabaseClient): Promise<{
  success: boolean;
  count: number;
  errors?: { item: OfflineP2PTransfer; error: any }[];
}> {
  const list = await readList();
  const pending = list.filter((r) => r.status === 'pending');

  if (pending.length === 0 || !supabaseClient) return { success: true, count: 0 };

  let success = true;
  let successCount = 0;
  const errors: { item: OfflineP2PTransfer; error: any }[] = [];

  for (const item of pending) {
    try {
      // 🛡️ Secure Decryption
      const recipientPhone = await decryptData(item.recipient_phone_encrypted);
      const note = item.note_encrypted ? await decryptData(item.note_encrypted) : '';

      const { error } = await supabaseClient.rpc('process_p2p_transfer', {
        p_sender_id: item.sender_id,
        p_recipient_phone: recipientPhone,
        p_amount: item.amount,
        p_note: note,
        p_idempotency_key: item.id,
      });

      if (!error) {
        item.status = 'synced';
        successCount++;
      } else {
        success = false;
        errors.push({ item, error: error.message });
      }
    } catch (err) {
      success = false;
      errors.push({ item, error: 'DECRYPTION_FAILED' });
    }
  }

  await writeList(list);
  return { success, count: successCount, errors: errors.length > 0 ? errors : undefined };
}

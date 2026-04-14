/**
 * Real-time Service - Core 6 Supabase Realtime Subscriptions
 * Handles real-time updates for wallet, notifications, P2P, Ekub, and merchant orders.
 */

import React from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getClient } from './supabase';
import { useAppStore } from '../store/AppStore';
import { uid, fmtETB } from '../utils';
import * as Haptics from 'expo-haptics';
import { P2PTransfer, Wallet, Notification } from '../types';

const subscriptions = new Map<string, RealtimeChannel>();

export interface RealtimePayload<T = any> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  new: T;
  old: T;
}

// ── Real-time Hook for React Components ────────────────────────────────────────
export function useRealtimeSubscription<T extends Record<string, any> = any>(
  channelName: string, 
  table: string, 
  filter: string, 
  onPayload: (payload: RealtimePayload<T>) => void, 
  enabled = true
) {
  const currentUser = useAppStore((s) => s.currentUser);

  React.useEffect(() => {
    if (!enabled || !currentUser?.id || !getClient()) return;

    const client = getClient()!;
    const channel = client
      .channel(channelName)
      .on<T>(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload: any) => {
          console.log(`[Realtime] ${table} update:`, payload);
          onPayload?.(payload as unknown as RealtimePayload<T>);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Error subscribing to ${channelName}`);
        }
      });

    subscriptions.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      subscriptions.delete(channelName);
    };
  }, [enabled, currentUser?.id, channelName, table, filter]);
}

// ── Setup Real-time Subscriptions for Current User ───────────────────────────────
export function setupUserRealtime() {
  const store = useAppStore.getState();
  const currentUser = store.currentUser;
  if (!currentUser?.id || !getClient()) return;

  const client = getClient()!;
  const userId = currentUser.id;

  // 1. Wallet balance updates
  const walletChannel = client
    .channel(`wallet-${userId}`)
    .on<Wallet>(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` },
      (payload) => {
        const newBalance = payload.new?.balance;
        if (newBalance !== undefined) {
          store.setBalance(newBalance);
          store.showToast('Wallet updated', 'success');
        }
      }
    )
    .subscribe();

  // 2. In-app Notifications
  const notifChannel = client
    .channel(`notifications-${userId}`)
    .on<Notification>(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => {
        const notif = payload.new;
        if (!notif) return;
        
        // Persist notification to store and show transient toast
        store.addNotification({
          id: notif.id || uid(),
          user_id: notif.user_id || userId,
          title: notif.title || 'Notification',
          message: notif.message || '',
          type: notif.type || 'info',
          read: notif.read || false,
          is_read: notif.is_read || notif.read || false,
          created_at: notif.created_at || new Date().toISOString(),
          data: notif.data,
          metadata: notif.metadata || notif.data,
        });
        store.showToast(`${notif.title || 'Notification'}`, 'info');
      }
    )
    .subscribe();

  // 3. P2P transfers received
  const p2pChannel = client
    .channel(`p2p-${userId}`)
    .on<P2PTransfer>(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'p2p_transfers', filter: `recipient_id=eq.${userId}` },
      (payload) => {
        const transfer = payload.new;
        if (transfer && transfer.status === 'PENDING') {
          store.showToast(`Received ${fmtETB(transfer.amount)} ETB!`, 'success');
          if (transfer.amount <= 1000) {
            claimP2PTransfer(transfer.id);
          }
        }
      }
    )
    .subscribe();

  // 4. Ekub circle updates
  const ekubChannel = client
    .channel(`ekub-${userId}`)
    .on<{ ekub_id: string }>(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ekub_members', filter: `user_id=eq.${userId}` },
      (payload) => {
        const ekubId = (payload.new as any)?.ekub_id || (payload.old as any)?.ekub_id;
        if (ekubId) {
          store.showToast('Ekub circle updated', 'info');
        }
      }
    )
    .subscribe();

  // Store channels for cleanup
  subscriptions.set(`wallet-${userId}`, walletChannel);
  subscriptions.set(`notifications-${userId}`, notifChannel);
  subscriptions.set(`p2p-${userId}`, p2pChannel);
  subscriptions.set(`ekub-${userId}`, ekubChannel);
}

// ── Merchant Real-time Subscriptions ───────────────────────────────────────────────
export function setupMerchantRealtime() {
  const store = useAppStore.getState();
  const currentUser = store.currentUser;
  if (!currentUser?.id || currentUser.role !== 'merchant' || !getClient()) return;

  const client = getClient()!;
  const merchantId = currentUser.id;

  // 1. New marketplace orders
  const ordersChannel = client
    .channel(`merchant-orders-${merchantId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'marketplace_orders', filter: `merchant_id=eq.${merchantId}` },
      () => {
        store.showToast('New order received!', 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    )
    .subscribe();

  // 2. New food orders
  const foodOrdersChannel = client
    .channel(`food-orders-${merchantId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'food_orders', filter: `merchant_id=eq.${merchantId}` },
      () => {
        store.showToast('New food order!', 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    )
    .subscribe();

  subscriptions.set(`merchant-orders-${merchantId}`, ordersChannel);
  subscriptions.set(`food-orders-${merchantId}`, foodOrdersChannel);
}

// ── Claim P2P Transfer ───────────────────────────────────────────────────────────
async function claimP2PTransfer(transferId: string) {
  const client = getClient();
  const store = useAppStore.getState();
  if (!client) return;

  try {
    const { data: result, error } = await client.rpc('process_p2p_claim', {
      p_transfer_id: transferId,
    });

    if (error || !result.ok) {
      throw new Error(result?.error || error?.message || 'Failed to claim transfer');
    }

    // Update local balance from result
    if (result.amount) {
      const currentBalance = store.balance;
      store.setBalance(currentBalance + result.amount);
      store.showToast(`Claimed ${fmtETB(result.amount)} ETB!`, 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } catch (error) {
    console.error('Error claiming P2P transfer:', error);
    store.showToast('Failed to claim transfer', 'error');
  }
}

// ── Cleanup All Subscriptions ───────────────────────────────────────────────────────
export function cleanupRealtime() {
  subscriptions.forEach((channel) => {
    channel.unsubscribe();
  });
  subscriptions.clear();
}

// ── Push Notification Helper ───────────────────────────────────────────────────────
export function sendPushNotification(userId: string, title: string, body: string, data: Record<string, any> = {}) {
  const client = getClient();
  if (!client) return;

  client
    .from('notifications')
    .insert({
      id: uid(),
      user_id: userId,
      title,
      message: body,
      type: 'push',
      data,
      created_at: new Date().toISOString(),
    })
    .then(({ error }) => {
      if (error) {
        console.error('Error sending push notification:', error);
      }
    });
}

export default {
  useRealtimeSubscription,
  setupUserRealtime,
  setupMerchantRealtime,
  cleanupRealtime,
  sendPushNotification,
};

/**
 * Real-time Service - Core 6 Supabase Realtime Subscriptions
 * Handles real-time updates for wallet, notifications, P2P, Ekub, and merchant orders.
 */

import React from 'react';
import { getClient } from './supabase';
import { useAppStore } from '../store/AppStore';
import { uid, fmtETB } from '../utils';

const subscriptions = new Map();

// ── Real-time Hook for React Components ────────────────────────────────────────
export function useRealtimeSubscription(channelName, table, filter, onPayload, enabled = true) {
  const currentUser = useAppStore((s) => s.currentUser);

  React.useEffect(() => {
    if (!enabled || !currentUser?.id || !getClient()) return;

    const client = getClient();
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload) => {
          console.log(`[Realtime] ${table} update:`, payload);
          onPayload?.(payload);
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
  const currentUser = useAppStore.getState().currentUser;
  if (!currentUser?.id || !getClient()) return;

  const client = getClient();
  const userId = currentUser.id;

  // 1. Wallet balance updates
  const walletChannel = client
    .channel(`wallet-${userId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` },
      (payload) => {
        const newBalance = payload.new?.balance;
        if (newBalance !== undefined) {
          useAppStore.getState().setBalance(newBalance);
          useAppStore.getState().showToast('Wallet updated', 'success');
        }
      }
    )
    .subscribe();

  // 2. In-app Notifications
  const notifChannel = client
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => {
        const notif = payload.new;
        useAppStore
          .getState()
          .setNotifications([...useAppStore.getState().notifications, { ...notif, read: false }]);
        useAppStore.getState().showToast(`${notif.icon} ${notif.title}`, 'info');
      }
    )
    .subscribe();

  // 3. P2P transfers received
  const p2pChannel = client
    .channel(`p2p-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'p2p_transfers', filter: `recipient_id=eq.${userId}` },
      (payload) => {
        const transfer = payload.new;
        if (transfer.status === 'PENDING') {
          useAppStore.getState().showToast(`Received ${fmtETB(transfer.amount)} ETB!`, 'success');
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
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ekub_members', filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.new?.ekub_id || payload.old?.ekub_id) {
          useAppStore.getState().showToast('Ekub circle updated', 'info');
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
  const currentUser = useAppStore.getState().currentUser;
  if (!currentUser?.id || currentUser.role !== 'merchant' || !getClient()) return;

  const client = getClient();
  const merchantId = currentUser.id;

  // 1. New marketplace orders
  const ordersChannel = client
    .channel(`merchant-orders-${merchantId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'marketplace_orders', filter: `merchant_id=eq.${merchantId}` },
      () => {
        useAppStore.getState().showToast('New order received!', 'success');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
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
        useAppStore.getState().showToast('New food order!', 'success');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    )
    .subscribe();

  subscriptions.set(`merchant-orders-${merchantId}`, ordersChannel);
  subscriptions.set(`food-orders-${merchantId}`, foodOrdersChannel);
}

// ── Claim P2P Transfer ───────────────────────────────────────────────────────────
async function claimP2PTransfer(transferId: string) {
  const client = getClient();
  if (!client) return;

  try {
    const { data, error } = await client
      .from('p2p_transfers')
      .update({ status: 'CLAIMED', claimed_at: new Date().toISOString() })
      .eq('id', transferId)
      .select()
      .single();

    if (error) throw error;

    const userId = useAppStore.getState().currentUser?.id;
    if (userId) {
      const { data: wallet } = await client
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();
      if (wallet) {
        useAppStore.getState().setBalance(wallet.balance);
      }
    }

    if (data) {
      useAppStore.getState().showToast(`Claimed ${fmtETB(data.amount)} ETB!`, 'success');
    }
  } catch (error) {
    console.error('Error claiming P2P transfer:', error);
    useAppStore.getState().showToast('Failed to claim transfer', 'error');
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
export function sendPushNotification(userId, title, body, data = {}) {
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

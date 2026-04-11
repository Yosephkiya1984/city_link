/**
 * Real-time Service - Comprehensive Supabase Realtime Subscriptions
 * Handles all real-time updates for CityLink app
 */

import React from 'react';
import { getClient } from './supabase';
import { Config } from '../config';
import { useAppStore } from '../store/AppStore';
import { uid, fmtETB } from '../utils';

let subscriptions = new Map();

// ── Real-time Hook for React Components ────────────────────────────────────────
export function useRealtimeSubscription(channelName, table, filter, onPayload, enabled = true) {
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);

  React.useEffect(() => {
    if (!enabled || !currentUser?.id || !getClient()) return;

    const client = getClient();
    const channel = client
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter,
      }, (payload) => {
        console.log(`[Realtime] ${table} update:`, payload);
        onPayload?.(payload);
      })
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
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'wallets',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      const newBalance = payload.new?.balance;
      if (newBalance !== undefined) {
        useAppStore.getState().setBalance(newBalance);
        useAppStore.getState().showToast('Wallet updated 💰', 'success');
      }
    })
    .subscribe();

  // 2. Notifications
  const notifChannel = client
    .channel(`notifications-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      const notif = payload.new;
      useAppStore.getState().setNotifications([
        ...useAppStore.getState().notifications,
        { ...notif, read: false }
      ]);
      useAppStore.getState().showToast(`${notif.icon} ${notif.title}`, 'info');
    })
    .subscribe();

  // 3. Job application status updates
  const jobsChannel = client
    .channel(`jobs-${userId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'job_applications',
      filter: `applicant_id=eq.${userId}`,
    }, (payload) => {
      const newStatus = payload.new?.status;
      if (newStatus) {
        const statusMessages = {
          'REVIEWING': 'Your application is being reviewed 📋',
          'SHORTLISTED': 'You\'ve been shortlisted! ⭐',
          'OFFERED': 'Job offer received! 🎊',
          'REJECTED': 'Application not successful 📭',
        };
        useAppStore.getState().showToast(statusMessages[newStatus] || 'Application updated', 'info');
      }
    })
    .subscribe();

  // 4. P2P transfers received
  const p2pChannel = client
    .channel(`p2p-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'p2p_transfers',
      filter: `recipient_id=eq.${userId}`,
    }, (payload) => {
      const transfer = payload.new;
      if (transfer.status === 'PENDING') {
        useAppStore.getState().showToast(`Received ${fmtETB(transfer.amount)} ETB! 💸`, 'success');
        // Auto-claim for small amounts
        if (transfer.amount <= 1000) {
          claimP2PTransfer(transfer.id);
        }
      }
    })
    .subscribe();

  // 5. Ekub updates for joined circles
  const ekubChannel = client
    .channel(`ekub-${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ekub_members',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      const ekubId = payload.new?.ekub_id || payload.old?.ekub_id;
      if (ekubId) {
        useAppStore.getState().showToast('Ekub circle updated 🤝', 'info');
        // Refresh ekub data
        // This would trigger a refresh of the Ekub screen
      }
    })
    .subscribe();

  // Store channels for cleanup
  subscriptions.set(`wallet-${userId}`, walletChannel);
  subscriptions.set(`notifications-${userId}`, notifChannel);
  subscriptions.set(`jobs-${userId}`, jobsChannel);
  subscriptions.set(`p2p-${userId}`, p2pChannel);
  subscriptions.set(`ekub-${userId}`, ekubChannel);
}

// ── Merchant Real-time Subscriptions ───────────────────────────────────────────────
export function setupMerchantRealtime() {
  const currentUser = useAppStore.getState().currentUser;
  if (!currentUser?.id || currentUser.role !== 'merchant' || !getClient()) return;

  const client = getClient();
  const merchantId = currentUser.id;

  // 1. New orders
  const ordersChannel = client
    .channel(`merchant-orders-${merchantId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'marketplace_orders',
      filter: `merchant_id=eq.${merchantId}`,
    }, (payload) => {
      const order = payload.new;
      useAppStore.getState().showToast('New order received! 🛍️', 'success');
      // Vibrate for attention
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    })
    .subscribe();

  // 2. Food orders
  const foodOrdersChannel = client
    .channel(`food-orders-${merchantId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'food_orders',
      filter: `merchant_id=eq.${merchantId}`,
    }, (payload) => {
      useAppStore.getState().showToast('New food order! 🍽️', 'success');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    })
    .subscribe();

  // 3. Job applications
  const jobAppsChannel = client
    .channel(`job-apps-${merchantId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'job_applications',
      filter: `merchant_id=eq.${merchantId}`,
    }, (payload) => {
      useAppStore.getState().showToast('New job application! 📨', 'success');
    })
    .subscribe();

  subscriptions.set(`merchant-orders-${merchantId}`, ordersChannel);
  subscriptions.set(`food-orders-${merchantId}`, foodOrdersChannel);
  subscriptions.set(`job-apps-${merchantId}`, jobAppsChannel);
}

// ── Claim P2P Transfer ───────────────────────────────────────────────────────────
async function claimP2PTransfer(transferId) {
  const client = getClient();
  if (!client) return;

  try {
    const { data, error } = await client
      .from('p2p_transfers')
      .update({ 
        status: 'CLAIMED',
        claimed_at: new Date().toISOString()
      })
      .eq('id', transferId);

    if (error) throw error;

    // Update wallet balance
    const transfer = data?.[0];
    if (transfer) {
      const currentBalance = useAppStore.getState().balance;
      useAppStore.getState().setBalance(currentBalance + transfer.amount);
      
      useAppStore.getState().showToast(`Claimed ${fmtETB(transfer.amount)} ETB!`, 'success');
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
  // This would integrate with Expo Push Notifications or Firebase Cloud Messaging
  // For now, we'll just create an in-app notification
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

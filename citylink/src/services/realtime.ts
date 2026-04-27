import React from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getClient } from './supabase';
import { useAuthStore } from '../store/AuthStore';
import { useWalletStore } from '../store/WalletStore';
import { useSystemStore } from '../store/SystemStore';
import { uid, fmtETB } from '../utils';
import * as Haptics from 'expo-haptics';
import { P2PTransfer, Wallet, Notification } from '../types';

const subscriptions = new Map<string, RealtimeChannel>();

export function useRealtimeSubscription<T extends Record<string, unknown>>(
  channelName: string,
  table: string,
  filter: string,
  onPayload: (payload: any) => void,
  enabled = true
) {
  const currentUser = useAuthStore((s) => s.currentUser);

  React.useEffect(() => {
    if (!enabled || !currentUser?.id || !getClient()) return;
    if (subscriptions.has(channelName)) return;

    const channel = getClient()!
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter }, onPayload)
      .subscribe();

    subscriptions.set(channelName, channel);
    return () => {
      channel.unsubscribe();
      subscriptions.delete(channelName);
    };
  }, [enabled, currentUser?.id, channelName, table, filter]);
}

export function setupUserRealtime() {
  const currentUser = useAuthStore.getState().currentUser;
  if (!currentUser?.id || !getClient()) return;

  const client = getClient()!;
  const userId = currentUser.id;

  // Idempotency check
  if (subscriptions.has(`wallet-${userId}`)) return;

  // 1. Wallet Balance
  const walletChannel = client
    .channel(`wallet-${userId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` },
      (p) => {
        if (p.new?.balance !== undefined) {
          useWalletStore.getState().setBalance(p.new.balance);
          useSystemStore.getState().showToast('Balance Synchronized', 'success');
        }
      }
    )
    .subscribe();

  // 2. Notifications
  const notifChannel = client
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (p) => {
        const n = p.new;
        useSystemStore.getState().addNotification({
          id: n.id || uid(),
          user_id: userId,
          title: n.title,
          message: n.message,
          type: n.type || 'info',
          read: false,
          is_read: false,
          created_at: new Date().toISOString(),
        });
        useSystemStore.getState().showToast(n.title, 'info');
      }
    )
    .subscribe();

  // 3. P2P (Manual Claim Only)
  const p2pChannel = client
    .channel(`p2p-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'p2p_transfers',
        filter: `recipient_id=eq.${userId}`,
      },
      (p) => {
        if (p.new?.status === 'PENDING') {
          useSystemStore.getState().setPendingP2PClaim(p.new as any);
          useSystemStore.getState().showToast(`💰 P2P Transfer Received`, 'info');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    )
    .subscribe();

  subscriptions.set(`wallet-${userId}`, walletChannel);
  subscriptions.set(`notifications-${userId}`, notifChannel);
  subscriptions.set(`p2p-${userId}`, p2pChannel);
}

export function setupMerchantRealtime() {
  const currentUser = useAuthStore.getState().currentUser;
  if (!currentUser?.id || currentUser.role !== 'merchant' || !getClient()) return;
  const merchantId = currentUser.id;

  if (subscriptions.has(`merchant-orders-${merchantId}`)) return;

  const orderChannel = getClient()!
    .channel(`merchant-orders-${merchantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'marketplace_orders',
        filter: `merchant_id=eq.${merchantId}`,
      },
      () => {
        useSystemStore.getState().showToast('New Store Order!', 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    )
    .subscribe();

  subscriptions.set(`merchant-orders-${merchantId}`, orderChannel);
}

export function setupAgentRealtime() {
  const currentUser = useAuthStore.getState().currentUser;
  const isAgent = currentUser?.role === 'delivery_agent' || currentUser?.role === 'admin';
  if (!currentUser?.id || !isAgent || !getClient()) return;
  const agentId = currentUser.id;

  if (subscriptions.has(`agent-dispatch-${agentId}`)) return;

  const dispatchChannel = getClient()!
    .channel(`agent-dispatch-${agentId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'delivery_dispatches',
        filter: `agent_id=eq.${agentId}`,
      },
      () => {
        useSystemStore.getState().showToast('New Delivery Job Available!', 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    )
    .subscribe();

  subscriptions.set(`agent-dispatch-${agentId}`, dispatchChannel);
}

export async function cleanupRealtime() {
  const channels = Array.from(subscriptions.values());
  await Promise.all(channels.map((c) => c.unsubscribe()));
  subscriptions.clear();
}

export default { setupUserRealtime, setupMerchantRealtime, setupAgentRealtime, cleanupRealtime };

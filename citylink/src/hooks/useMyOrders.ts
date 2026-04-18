import { useState, useRef, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useAuthStore, AuthState } from '../store/AuthStore';
import { useSystemStore, SystemState } from '../store/SystemStore';
import {
  fetchMarketplaceOrdersByBuyer,
  openMarketplaceDispute,
  rpcCancelAndRefundOrder,
  marketplaceService,
} from '../services/marketplace.service';
import { fetchMyFoodOrders } from '../services/food.service';
import { subscribeToTable, unsubscribe } from '../services/supabase';
import { Alert } from 'react-native';

/**
 * useMyOrders — Business logic for MyOrdersScreen.
 * Handles fetching, real-time subscriptions, and action handlers.
 */
export function useMyOrders() {
  const user = useAuthStore((s: AuthState) => s.currentUser);
  const showToast = useSystemStore((s: SystemState) => s.showToast);

  const [mktOrders, setMktOrders] = useState<any[]>([]);
  const [foodOrders, setFoodOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  // Prompt state for dispute
  const [promptConfig, setPromptConfig] = useState<any>(null);
  const [promptInput, setPromptInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [mktRes, foodRes] = await Promise.all([
        fetchMarketplaceOrdersByBuyer(user.id),
        fetchMyFoodOrders(user.id),
      ]);

      setMktOrders((mktRes.data || []).map((o: any) => ({ ...o, type: 'marketplace' })));
      setFoodOrders((foodRes.data || []).map((o: any) => ({ ...o, type: 'food' })));
    } catch (e) {
      console.error('🔧 loadOrders error:', e);
      showToast('Offline? Could not fetch orders.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, showToast]);

  // Real-time syncing
  useEffect(() => {
    if (!user?.id) return;
    loadOrders();

    const mktCh = subscribeToTable(
      `buyer-mkt-${user.id}`,
      'marketplace_orders',
      `buyer_id=eq.${user.id}`,
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          setMktOrders((prev) =>
            prev.map((o) =>
              o.id === payload.new.id ? { ...o, ...payload.new, type: 'marketplace' } : o
            )
          );
        } else if (payload.eventType === 'INSERT') {
          setMktOrders((prev) => [{ ...payload.new, type: 'marketplace' }, ...prev]);
        }
      }
    );

    const foodCh = subscribeToTable(
      `buyer-food-${user.id}`,
      'food_orders',
      `citizen_id=eq.${user.id}`,
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          setFoodOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new, type: 'food' } : o))
          );
        } else if (payload.eventType === 'INSERT') {
          setFoodOrders((prev) => [{ ...payload.new, type: 'food' }, ...prev]);
        }
      }
    );

    return () => {
      unsubscribe(mktCh);
      unsubscribe(foodCh);
    };
  }, [user?.id, loadOrders]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleCancelOrder = (order: any) => {
    Alert.alert('Cancel Order', 'Refund funds to your wallet?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await rpcCancelAndRefundOrder(order.id, 'buyer_cancellation');
            if (res.error) throw res.error;
            showToast('Order cancelled and refunded', 'success');
            // Real-time will handle state update, but we can optimistically filter
            setMktOrders((prev) =>
              prev.map((o) => (o.id === order.id ? { ...o, status: 'CANCELLED' } : o))
            );
          } catch (e) {
            showToast('Cancellation failed', 'error');
          }
        },
      },
    ]);
  };

  const handleRejectDelivery = (order: any) => {
    Alert.alert(
      'Reject Delivery',
      'Are you sure you want to reject this delivery? This will freeze the funds and start a dispute process.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject Order',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await marketplaceService.rejectDelivery(
                order.id,
                user?.id || '',
                'BUYER_REFUSED',
                'Rejected via MyOrders screen'
              );
              if (!res.success) {
                if (res.error === 'daily_rejection_limit_reached') {
                  throw new Error(
                    'You have reached the limit of 3 rejections per day. Please contact support if you have issues with this delivery.'
                  );
                }
                throw new Error(res.error || 'Failed to reject delivery');
              }
              showToast('Delivery rejected. A dispute has been opened automatically.', 'success');
              setMktOrders((prev) =>
                prev.map((o) => (o.id === order.id ? { ...o, status: 'REJECTED_BY_BUYER' } : o))
              );
            } catch (e: any) {
              showToast(e.message || 'Reject failed', 'error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const submitDispute = async () => {
    if (!promptInput.trim()) {
      showToast('Explain the issue', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await openMarketplaceDispute(
        promptConfig.order.id,
        user?.id || '',
        promptInput.trim()
      );
      if (res.ok) {
        showToast('Dispute opened', 'success');
        setMktOrders((prev) =>
          prev.map((o) => (o.id === promptConfig.order.id ? { ...o, status: 'DISPUTED' } : o))
        );
        setPromptConfig(null);
      } else {
        throw new Error('Dispute failed');
      }
    } catch (e) {
      showToast('Failed to open dispute', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const combined = [...mktOrders, ...foodOrders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const activeOrders = combined.filter(
    (o) => !['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(o.status)
  );
  const historyOrders = combined.filter((o) =>
    ['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(o.status)
  );

  return {
    user,
    loading,
    refreshing,
    tab,
    setTab,
    activeOrders,
    historyOrders,
    displayedOrders: tab === 'active' ? activeOrders : historyOrders,
    promptConfig,
    setPromptConfig,
    promptInput,
    setPromptInput,
    submitting,
    handleRefresh,
    handleCancelOrder,
    submitDispute,
    handleRejectDelivery,
  };
}

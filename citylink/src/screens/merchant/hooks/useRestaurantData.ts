import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import { useWalletStore } from '../../../store/WalletStore';
import { getClient, subscribeToTable, unsubscribe } from '../../../services/supabase';
import { fetchRestaurantOrders, fetchRestaurantMenu } from '../../../services/food.service';

export interface RestaurantData {
  orders: any[];
  setOrders: (orders: any[]) => void;
  menu: any[];
  setMenu: (menu: any[]) => void;
  loading: boolean;
  refreshing: boolean;
  setRefreshing: (refreshing: boolean) => void;
  loadData: () => Promise<void>;
}

export function useRestaurantData(): RestaurantData {
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);

    try {
      const [ordersRes, menuRes] = await Promise.all([
        fetchRestaurantOrders(currentUser.id),
        fetchRestaurantMenu(currentUser.id),
      ]);

      if (ordersRes.data) {
        setOrders(
          (ordersRes.data || []).sort(
            (a: any, b: any) =>
              new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          )
        );
      }
      if (menuRes.data) setMenu(menuRes.data);

      // Sync wallet
      const client = getClient();
      if (client) {
        const { data: wallet } = await client
          .from('wallets')
          .select('balance')
          .eq('user_id', currentUser.id)
          .single();

        if (wallet) {
          useWalletStore.getState().setBalance(wallet.balance);
        }
      }
    } catch (error) {
      showToast('Failed to load restaurant data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id, showToast]);

  useEffect(() => {
    if (!currentUser?.id) return;
    loadData();

    const chOrd = subscribeToTable(
      `restaurant-orders-${currentUser.id}`,
      'food_orders',
      `restaurant_id=eq.${currentUser.id}`,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          showToast('🍕 New order received!', 'success');
          loadData();
        } else {
          loadData();
        }
      }
    );

    return () => {
      unsubscribe(chOrd);
    };
  }, [loadData, currentUser?.id, showToast]);

  return {
    orders,
    setOrders,
    menu,
    setMenu,
    loading,
    refreshing,
    setRefreshing,
    loadData,
  };
}

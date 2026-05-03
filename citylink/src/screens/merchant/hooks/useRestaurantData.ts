import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import { useWalletStore } from '../../../store/WalletStore';
import { getClient, subscribeToTable, unsubscribe } from '../../../services/supabase';
import { 
  fetchRestaurantOrders, 
  fetchRestaurantMenu, 
  fetchMerchantRestaurant,
  updateStockQuantity 
} from '../../../services/food.service';
import { fetchRestaurantStock, fetchLowStockAlerts } from '../../../services/marketplace.service';
import * as Haptics from 'expo-haptics';
import {
  HospitalityService,
  EventModel,
  ReservationModel,
  TableModel,
} from '../../../services/hospitality.service';
import { Restaurant } from '../../../types';

export interface RestaurantData {
  orders: any[];
  setOrders: (orders: any[]) => void;
  menu: any[];
  setMenu: (menu: any[]) => void;
  events: EventModel[];
  setEvents: (events: EventModel[]) => void;
  reservations: ReservationModel[];
  setReservations: (reservations: ReservationModel[]) => void;
  tables: TableModel[];
  setTables: (tables: TableModel[]) => void;
  stock: any[];
  setStock: (stock: any[]) => void;
  lowStockAlerts: any[];
  setLowStockAlerts: (alerts: any[]) => void;
  restaurant: Restaurant | null;
  setRestaurant: (restaurant: Restaurant | null) => void;
  staff: any[];
  setStaff: (staff: any[]) => void;
  loading: boolean;
  refreshing: boolean;
  setRefreshing: (refreshing: boolean) => void;
  loadData: () => Promise<void>;
  updateStock: (stockId: string, quantity: number) => Promise<void>;
  updateTablePosition: (tableId: string, x: number, y: number) => Promise<void>;
  addTable: (tableNumber: number, capacity: number, shape: string) => Promise<void>;
  deleteTable: (tableId: string) => Promise<void>;
  assignStaff: (staffProfileId: string, tableId: string) => Promise<void>;
}

export function useRestaurantData(): RestaurantData {
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [reservations, setReservations] = useState<ReservationModel[]>([]);
  const [tables, setTables] = useState<TableModel[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);

    try {
      const results = await Promise.all([
        fetchRestaurantOrders(currentUser.id),
        fetchRestaurantMenu(currentUser.id),
        HospitalityService.getMerchantEvents(currentUser.id).catch(() => []),
        HospitalityService.getMerchantReservations(currentUser.id).catch(() => []),
        HospitalityService.getMerchantTables(currentUser.id).catch(() => []),
        fetchRestaurantStock(currentUser.id).catch(() => ({ data: [] })),
        fetchLowStockAlerts(currentUser.id).catch(() => ({ data: [] })),
        HospitalityService.getMerchantStaff(currentUser.id).catch(() => []),
        fetchMerchantRestaurant(currentUser.id).catch(() => ({ data: null })),
        // Also fetch in-restaurant quick sale orders
        getClient()?.from('restaurant_orders')
          .select('*')
          .eq('merchant_id', currentUser.id)
          .in('status', ['PENDING', 'PREPARING', 'READY'])
          .order('created_at', { ascending: false })
          .limit(50) ?? Promise.resolve({ data: [], error: null }),
      ]);

      const [
        ordersRes, 
        menuRes, 
        eventsRes, 
        resRes, 
        tablesRes, 
        stockRes, 
        alertsRes, 
        staffRes, 
        restaurantRes,
        restaurantOrdersRes,
      ] = results;

      if (ordersRes?.data) {
        // Merge delivery orders + in-restaurant quick sale orders
        const deliveryOrders = ordersRes.data || [];
        const inRestaurantOrders = (restaurantOrdersRes as any)?.data || [];
        // Tag each type so the UI can show different badges
        const taggedInRestaurant = inRestaurantOrders.map((o: any) => ({ ...o, _source: 'restaurant' }));
        const merged = [...taggedInRestaurant, ...deliveryOrders].sort(
          (a: any, b: any) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        setOrders(merged);
      }
      if (menuRes?.data) setMenu(menuRes.data);
      if (eventsRes) setEvents(eventsRes as EventModel[]);
      if (resRes) setReservations(resRes as ReservationModel[]);
      if (tablesRes) setTables(tablesRes as TableModel[]);
      if (stockRes?.data) setStock(stockRes.data);
      if (alertsRes?.data) setLowStockAlerts(alertsRes.data);
      if (staffRes) setStaff(staffRes);
      if (restaurantRes?.data) setRestaurant(restaurantRes.data);
      else if (restaurantRes && !restaurantRes.error) setRestaurant(restaurantRes as any);
      
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
      console.error('Restaurant Load Error:', error);
      showToast('Failed to load hospitality data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id, showToast]);

  const updateStock = async (stockId: string, quantity: number) => {
    try {
      const { error } = await updateStockQuantity(stockId, quantity);
      if (error) throw new Error(error);
      
      // Update local state immediately
      setStock(prev => prev.map(item => 
        item.id === stockId ? { ...item, quantity } : item
      ));
      
      // Refresh alerts
      const alertsRes = await fetchLowStockAlerts(currentUser.id);
      if (alertsRes?.data) setLowStockAlerts(alertsRes.data);
    } catch (err: any) {
      console.error('Failed to update stock:', err.message);
    }
  };

  const updateTablePosition = async (tableId: string, x: number, y: number) => {
    try {
      await HospitalityService.updateTablePosition(tableId, x, y);
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, x_pos: x, y_pos: y } : t));
    } catch (err: any) {
      showToast('Failed to update table position', 'error');
    }
  };

  const addTable = async (tableNumber: number, capacity: number, shape: string) => {
    if (!currentUser?.id) return;
    
    let targetRestaurantId = restaurant?.id;
    
    // If restaurant profile is missing, try to fetch it again or create a minimal one
    if (!targetRestaurantId) {
      try {
        const res = await fetchMerchantRestaurant(currentUser.id);
        if (res?.data?.id) {
          targetRestaurantId = res.data.id;
          setRestaurant(res.data);
        } else {
          showToast('Please set up your restaurant profile first', 'error');
          return;
        }
      } catch (e) {
        showToast('Restaurant profile not found', 'error');
        return;
      }
    }

    try {
      const newTable = await HospitalityService.addTable(currentUser.id, targetRestaurantId, tableNumber, capacity, shape);
      setTables(prev => [...prev, newTable]);
      showToast(`Table ${tableNumber} added`, 'success');
    } catch (err: any) {
      console.error('Add Table Error:', err);
      showToast('Failed to add table: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const deleteTable = async (tableId: string) => {
    try {
      await HospitalityService.deleteTable(tableId);
      setTables(prev => prev.filter(t => t.id !== tableId));
      showToast('Table removed', 'info');
    } catch (err: any) {
      showToast('Failed to remove table', 'error');
    }
  };

  const assignStaff = async (staffProfileId: string, tableId: string) => {
    try {
      await HospitalityService.assignStaffToTable(staffProfileId, tableId);
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, assigned_staff_id: staffProfileId } : t));
      showToast('Staff assigned to table', 'success');
    } catch (err: any) {
      showToast('Failed to assign staff', 'error');
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    loadData();

    // Note: The original 'food_orders' channel exists, but we are using marketplace_orders for delivery.
    // In actual implementation, 'fetchRestaurantOrders' might be pulling from marketplace_orders.
    const chOrd = subscribeToTable(
      `merchant-food-orders-${currentUser.id}`,
      'food_orders',
      `merchant_id=eq.${currentUser.id}`,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          showToast('🛵 New food order received!', 'success');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        loadData();
      }
    );

    const chRes = subscribeToTable(
      `merchant-reservations-${currentUser.id}`,
      'reservations',
      `merchant_id=eq.${currentUser.id}`,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          showToast('🍽️ New table reservation!', 'success');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        loadData();
      }
    );

    const chTickets = subscribeToTable(
      `merchant-tickets-${currentUser.id}`,
      'event_tickets',
      `merchant_id=eq.${currentUser.id}`,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          showToast('🎟️ New ticket sold!', 'info');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        loadData();
      }
    );

    const chEvents = subscribeToTable(
      `merchant-events-${currentUser.id}`,
      'events',
      `merchant_id=eq.${currentUser.id}`,
      () => loadData()
    );

    const chTables = subscribeToTable(
      `merchant-tables-${currentUser.id}`,
      'restaurant_tables',
      `merchant_id=eq.${currentUser.id}`,
      () => loadData()
    );

    const chStock = subscribeToTable(
      `merchant-stock-${currentUser.id}`,
      'restaurant_stock',
      `merchant_id=eq.${currentUser.id}`,
      () => loadData()
    );

    return () => {
      unsubscribe(chOrd);
      unsubscribe(chRes);
      unsubscribe(chTickets);
      unsubscribe(chEvents);
      unsubscribe(chTables);
      unsubscribe(chStock);
    };
  }, [loadData, currentUser?.id, showToast]);

  return {
    orders,
    setOrders,
    menu,
    setMenu,
    events,
    setEvents,
    reservations,
    setReservations,
    tables,
    setTables,
    stock,
    setStock,
    lowStockAlerts,
    setLowStockAlerts,
    restaurant,
    setRestaurant,
    staff,
    setStaff,
    updateStock,
    updateTablePosition,
    addTable,
    deleteTable,
    assignStaff,
    loading,
    refreshing,
    setRefreshing,
    loadData,
  };
}

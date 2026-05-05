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
import { fetchWallet, fetchTransactions } from '../../../services/wallet.service';
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
  waitlist: any[];
  setWaitlist: (waitlist: any[]) => void;
  restaurant: Restaurant | null;
  setRestaurant: (restaurant: Restaurant | null) => void;
  staff: any[];
  setStaff: (staff: any[]) => void;
  loading: boolean;
  refreshing: boolean;
  setRefreshing: (refreshing: boolean) => void;
  transactions: any[];
  setTransactions: (transactions: any[]) => void;
  loadData: () => Promise<void>;
  updateStock: (stockId: string, quantity: number) => Promise<void>;
  updateTablePosition: (tableId: string, x: number, y: number) => Promise<void>;
  addTable: (tableNumber: number, capacity: number, shape: string) => Promise<void>;
  deleteTable: (tableId: string) => Promise<void>;
  assignStaff: (staffProfileId: string, tableId: string) => Promise<void>;
  onWaitlistAction: (id: string, action: 'NOTIFY' | 'SEAT' | 'CANCEL', metadata?: any) => Promise<void>;
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
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
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
        HospitalityService.getWaitlist(currentUser.id).catch(() => []),
        fetchWallet(currentUser.id),
        getClient()?.from('restaurant_orders')
          .select('*')
          .eq('merchant_id', currentUser.id)
          .in('status', ['PENDING', 'PREPARING', 'READY'])
          .order('created_at', { ascending: false })
          .limit(50) ?? Promise.resolve({ data: [], error: null }),
      ]);

      const [
        ordersRes, menuRes, eventsRes, resRes, tablesRes, 
        stockRes, alertsRes, staffRes, restaurantRes, waitlistRes, walletRes, restaurantOrdersRes
      ] = results;

      if (walletRes?.data?.id) {
        const txRes = await fetchTransactions(walletRes.data.id, 50);
        if (txRes.data) setTransactions(txRes.data);
      }

      const deliveryOrders = (ordersRes?.data || []).map((o: any) => ({ ...o, _source: 'delivery' }));
      const inRestaurantOrders = (restaurantOrdersRes as any)?.data || [];
      const taggedInRestaurant = inRestaurantOrders.map((o: any) => ({ ...o, _source: 'restaurant' }));
      
      const merged = [...taggedInRestaurant, ...deliveryOrders].sort(
        (a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setOrders(merged);

      if (menuRes?.data) setMenu(menuRes.data);
      if (eventsRes) setEvents(eventsRes as EventModel[]);
      if (resRes) setReservations(resRes as ReservationModel[]);
      if (tablesRes) setTables(tablesRes as TableModel[]);
      if (stockRes?.data) setStock(stockRes.data);
      if (alertsRes?.data) setLowStockAlerts(alertsRes.data);
      if (staffRes) setStaff(staffRes);
      if (waitlistRes) setWaitlist(waitlistRes);
      if (restaurantRes?.data) setRestaurant(restaurantRes.data);
      
      const client = getClient();
      if (client) {
        const { data: wallet } = await client.from('wallets').select('balance').eq('user_id', currentUser.id).single();
        if (wallet) useWalletStore.getState().setBalance(wallet.balance);
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
      setStock(prev => prev.map(item => item.id === stockId ? { ...item, quantity } : item));
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
    try {
      const newTable = await HospitalityService.addTable(currentUser.id, restaurant?.id || '', tableNumber, capacity, shape);
      setTables(prev => [...prev, newTable]);
      showToast(`Table ${tableNumber} added`, 'success');
    } catch (err: any) {
      showToast('Failed to add table', 'error');
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

  const onWaitlistAction = async (id: string, action: 'NOTIFY' | 'SEAT' | 'CANCEL', metadata?: any) => {
    try {
      let status = 'WAITING';
      if (action === 'NOTIFY') status = 'NOTIFIED';
      if (action === 'SEAT') status = 'SEATED';
      if (action === 'CANCEL') status = 'CANCELLED';
      await HospitalityService.updateWaitlistStatus(id, status, metadata);
      setWaitlist(prev => prev.filter(w => w.id !== id || status === 'NOTIFIED'));
      if (status === 'NOTIFIED') {
        setWaitlist(prev => prev.map(w => w.id === id ? { ...w, status: 'NOTIFIED', notified_at: new Date().toISOString() } : w));
        showToast('Guest notified!', 'success');
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err: any) {
      showToast('Action failed', 'error');
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    loadData();
    const chOrd = subscribeToTable(`merchant-food-orders-${currentUser.id}`, 'food_orders', `merchant_id=eq.${currentUser.id}`, () => loadData());
    const chRestOrd = subscribeToTable(`merchant-rest-orders-${currentUser.id}`, 'restaurant_orders', `merchant_id=eq.${currentUser.id}`, () => loadData());
    const chRes = subscribeToTable(`merchant-reservations-${currentUser.id}`, 'reservations', `merchant_id=eq.${currentUser.id}`, () => loadData());
    const chWait = subscribeToTable(`merchant-waitlist-${currentUser.id}`, 'restaurant_waitlist', `merchant_id=eq.${currentUser.id}`, () => loadData());
    const chTables = subscribeToTable(`merchant-tables-${currentUser.id}`, 'restaurant_tables', `merchant_id=eq.${currentUser.id}`, () => loadData());
    const chStock = subscribeToTable(`merchant-stock-${currentUser.id}`, 'restaurant_stock', `merchant_id=eq.${currentUser.id}`, () => loadData());
    
    return () => {
      unsubscribe(chOrd); unsubscribe(chRestOrd); unsubscribe(chRes); unsubscribe(chWait); unsubscribe(chTables); unsubscribe(chStock);
    };
  }, [loadData, currentUser?.id]);

  return {
    orders, setOrders, menu, setMenu, events, setEvents, reservations, setReservations,
    tables, setTables, stock, setStock, lowStockAlerts, setLowStockAlerts, waitlist, setWaitlist,
    restaurant, setRestaurant, staff, setStaff, transactions, setTransactions, updateStock, updateTablePosition,
    addTable, deleteTable, assignStaff, onWaitlistAction, loading, refreshing, setRefreshing, loadData,
  };
}

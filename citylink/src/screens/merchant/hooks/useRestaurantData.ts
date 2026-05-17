import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { Restaurant, FoodOrder, FoodProduct, StaffProfile, WalletTransaction, MarketplaceInventoryItem, WaitlistEntry } from '../../../types/domain_types';

export type MergedFoodOrder = FoodOrder & { _source?: 'delivery' | 'restaurant' };

export interface RestaurantData {
  orders: MergedFoodOrder[];
  setOrders: (orders: MergedFoodOrder[]) => void;
  menu: FoodProduct[];
  setMenu: (menu: FoodProduct[]) => void;
  events: EventModel[];
  setEvents: (events: EventModel[]) => void;
  reservations: ReservationModel[];
  setReservations: (reservations: ReservationModel[]) => void;
  tables: TableModel[];
  setTables: (tables: TableModel[]) => void;
  stock: MarketplaceInventoryItem[];
  setStock: (stock: MarketplaceInventoryItem[]) => void;
  lowStockAlerts: MarketplaceInventoryItem[];
  setLowStockAlerts: (alerts: MarketplaceInventoryItem[]) => void;
  waitlist: WaitlistEntry[];
  setWaitlist: (waitlist: WaitlistEntry[]) => void;
  restaurant: Restaurant | null;
  setRestaurant: (restaurant: Restaurant | null) => void;
  staff: StaffProfile[];
  setStaff: (staff: StaffProfile[]) => void;
  loading: boolean;
  refreshing: boolean;
  setRefreshing: (refreshing: boolean) => void;
  transactions: WalletTransaction[];
  setTransactions: (transactions: WalletTransaction[]) => void;
  loadData: () => Promise<void>;
  updateStock: (stockId: string, quantity: number) => Promise<void>;
  updateTablePosition: (tableId: string, x: number, y: number) => Promise<void>;
  addTable: (tableNumber: number, capacity: number, shape: string) => Promise<void>;
  deleteTable: (tableId: string) => Promise<void>;
  assignStaff: (staffProfileId: string, tableId: string) => Promise<void>;
  onWaitlistAction: (id: string, action: 'NOTIFY' | 'SEAT' | 'CANCEL', metadata?: Record<string, any>) => Promise<void>;
}

export function useRestaurantData(passedMerchantId?: string): RestaurantData {
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [orders, setOrders] = useState<MergedFoodOrder[]>([]);
  const [menu, setMenu] = useState<FoodProduct[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [reservations, setReservations] = useState<ReservationModel[]>([]);
  const [tables, setTables] = useState<TableModel[]>([]);
  const [stock, setStock] = useState<MarketplaceInventoryItem[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<MarketplaceInventoryItem[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);

    try {
      let targetId = passedMerchantId || currentUser.id;

      if (!passedMerchantId) {
        // 🔍 STAFF PERMISSION CHECK:
        // If the current user is a waiter/staff, we must fetch data using the restaurant owner's ID
        const { data: staffEntry } = await getClient()!
          .from('merchant_staff')
          .select('merchant_id')
          .eq('profile_id', currentUser.id)
          .eq('role', 'waiter') // Filter specifically by 'waiter' role to avoid multi-role collision crashes
          .maybeSingle();
        
        if (staffEntry?.merchant_id) {
          targetId = staffEntry.merchant_id;
        }
      }

      const results = await Promise.all([
        fetchRestaurantOrders(targetId),
        fetchRestaurantMenu(targetId),
        HospitalityService.getMerchantEvents(targetId).catch(() => []),
        HospitalityService.getMerchantReservations(targetId).catch((err) => {
          console.error('[useRestaurantData] ❌ getMerchantReservations failed:', err);
          return [];
        }),
        HospitalityService.getMerchantTables(targetId).catch(() => []),
        fetchRestaurantStock(targetId).catch(() => ({ data: [] })),
        fetchLowStockAlerts(targetId).catch(() => ({ data: [] })),
        HospitalityService.getMerchantStaff(targetId).catch(() => []),
        fetchMerchantRestaurant(targetId).catch(() => ({ data: null })),
        HospitalityService.getWaitlist(targetId).catch(() => []),
        fetchWallet(targetId),
        getClient()?.from('restaurant_orders')
          .select('*')
          .eq('merchant_id', targetId)
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
        if (txRes.data) setTransactions(txRes.data as WalletTransaction[]);
      }

      const deliveryOrders = (ordersRes?.data || []).map((o: FoodOrder) => ({ ...o, _source: 'delivery' as const }));
      // @ts-ignore internal API might return data property
      const marketplaceOrdersData = (restaurantOrdersRes as { data: FoodOrder[] })?.data || [];
      const taggedRestaurant = marketplaceOrdersData.map((o: FoodOrder) => ({ ...o, _source: 'restaurant' as const }));
      
      // 🚨 DATA SEPARATION: 
      // The restaurant dashboard should primarily focus on 'food_orders' (delivery/dine-in).
      // Marketplace orders (from restaurant_orders table) are now isolated.
      const foodOrders = [...deliveryOrders, ...taggedRestaurant].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      
      setOrders(foodOrders);
      // If we had a marketplaceOrders state, we would set it here.
      // For now, we just stop polluting the 'orders' array with marketplace data.

      if (menuRes?.data) setMenu(menuRes.data as FoodProduct[]);
      if (eventsRes) setEvents(eventsRes as EventModel[]);
      if (resRes) setReservations(resRes as ReservationModel[]);
      if (tablesRes) setTables(tablesRes as TableModel[]);
      if (stockRes?.data) setStock(stockRes.data);
      if (alertsRes?.data) setLowStockAlerts(alertsRes.data);
      if (staffRes) setStaff(staffRes as StaffProfile[]);
      if (waitlistRes) setWaitlist(waitlistRes);
      if (restaurantRes?.data) setRestaurant(restaurantRes.data);
      
      const client = getClient();
      if (client) {
        const { data: wallet } = await client.from('wallets').select('balance, frozen_balance').eq('user_id', currentUser.id).maybeSingle();
        if (wallet) {
          useWalletStore.getState().setBalance(wallet.balance);
          
          let realEscrow = wallet.frozen_balance || 0;
          const { data: activeEscrows } = await client.from('escrows')
            .select('amount')
            .eq('merchant_id', currentUser.id)
            .eq('status', 'LOCKED');
          if (activeEscrows) {
            realEscrow = activeEscrows.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          }
          
          useWalletStore.getState().setFrozenBalance(realEscrow);
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

  const updateStock = useCallback(async (stockId: string, quantity: number) => {
    try {
      const { error } = await updateStockQuantity(stockId, quantity);
      if (error) throw new Error(error);
      setStock(prev => prev.map(item => item.id === stockId ? { ...item, quantity } : item));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to update stock:', msg);
    }
  }, []);

  const updateTablePosition = useCallback(async (tableId: string, x: number, y: number) => {
    try {
      await HospitalityService.updateTablePosition(tableId, x, y);
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, x_pos: x, y_pos: y } : t));
    } catch (err) {
      showToast('Failed to update table position', 'error');
    }
  }, [showToast]);

  const addTable = useCallback(async (tableNumber: number, capacity: number, shape: string) => {
    if (!currentUser?.id) return;
    try {
      const newTable = await HospitalityService.addTable(currentUser.id, restaurant?.id || '', tableNumber, capacity, shape);
      setTables(prev => [...prev, newTable]);
      showToast(`Table ${tableNumber} added`, 'success');
    } catch (err) {
      showToast('Failed to add table', 'error');
    }
  }, [currentUser?.id, restaurant?.id, showToast]);

  const deleteTable = useCallback(async (tableId: string) => {
    try {
      await HospitalityService.deleteTable(tableId);
      setTables(prev => prev.filter(t => t.id !== tableId));
      showToast('Table removed', 'info');
    } catch (err) {
      showToast('Failed to remove table', 'error');
    }
  }, [showToast]);

  const assignStaff = useCallback(async (staffProfileId: string, tableId: string) => {
    try {
      await HospitalityService.assignStaffToTable(staffProfileId, tableId);
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, assigned_staff_id: staffProfileId } : t));
      showToast('Staff assigned to table', 'success');
    } catch (err) {
      showToast('Failed to assign staff', 'error');
    }
  }, [showToast]);

  const onWaitlistAction = useCallback(async (id: string, action: 'NOTIFY' | 'SEAT' | 'CANCEL', metadata?: any) => {
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
    } catch (err) {
      showToast('Action failed', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    let active = true;
    const setupSubscriptions = async () => {
      // Resolve target ID for subscriptions
      let targetId = passedMerchantId || currentUser.id;

      if (!passedMerchantId) {
        const { data: staffEntry } = await getClient()!
          .from('merchant_staff')
          .select('merchant_id')
          .eq('profile_id', currentUser.id)
          .eq('role', 'waiter')
          .maybeSingle();
        
        if (staffEntry?.merchant_id) {
          targetId = staffEntry.merchant_id;
        }
      }

      if (!active) return;

      const chOrd = subscribeToTable(`m-orders-${currentUser.id}`, 'food_orders', `merchant_id=eq.${targetId}`, () => loadData());
      const chRestOrd = subscribeToTable(`m-rest-orders-${currentUser.id}`, 'restaurant_orders', `merchant_id=eq.${targetId}`, () => loadData());
      const chRes = subscribeToTable(`m-res-${currentUser.id}`, 'reservations', `merchant_id=eq.${targetId}`, () => loadData());
      const chWait = subscribeToTable(`m-wait-${currentUser.id}`, 'restaurant_waitlist', `merchant_id=eq.${targetId}`, () => loadData());
      const chTables = subscribeToTable(`m-tables-${currentUser.id}`, 'restaurant_tables', `merchant_id=eq.${targetId}`, () => loadData());
      const chStock = subscribeToTable(`m-stock-${currentUser.id}`, 'restaurant_stock', `merchant_id=eq.${targetId}`, () => loadData());

      return () => {
        unsubscribe(chOrd); unsubscribe(chRestOrd); unsubscribe(chRes); unsubscribe(chWait); unsubscribe(chTables); unsubscribe(chStock);
      };
    };

    loadData();
    const cleanupPromise = setupSubscriptions();
    
    return () => {
      active = false;
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [loadData, currentUser?.id, passedMerchantId]);

  return useMemo(() => ({
    orders, setOrders, menu, setMenu, events, setEvents, reservations, setReservations,
    tables, setTables, stock, setStock, lowStockAlerts, setLowStockAlerts, waitlist, setWaitlist,
    restaurant, setRestaurant, staff, setStaff, transactions, setTransactions, updateStock, updateTablePosition,
    addTable, deleteTable, assignStaff, onWaitlistAction, loading, refreshing, setRefreshing, loadData,
  }), [
    orders, menu, events, reservations, tables, stock, lowStockAlerts, waitlist,
    restaurant, staff, transactions, updateStock, updateTablePosition,
    addTable, deleteTable, assignStaff, onWaitlistAction, loading, refreshing, loadData
  ]);
}

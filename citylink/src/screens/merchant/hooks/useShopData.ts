import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../../../store/AppStore';
import { supabase, subscribeToTable, unsubscribe } from '../../../services/supabase';
import {
  marketplaceService,
  fetchMarketplaceOrdersByMerchant,
  fetchMerchantInventory,
} from '../../../services/marketplace.service';
import type { Product, FoodOrder, Notification } from '../../../types/domain_types';

export interface ShopData {
  orders: any[];
  setOrders: (orders: any[]) => void;
  inventory: Product[];
  setInventory: (inventory: Product[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  refreshing: boolean;
  setRefreshing: (refreshing: boolean) => void;
  walletTransactions: any[];
  setWalletTransactions: (txs: any[]) => void;
  salesHistory: {
    curve: number[];
    raw: number[];
    labels: string[];
  };
  setSalesHistory: (history: any) => void;
  openDisputes: any[];
  setOpenDisputes: (disputes: any[]) => void;
  loadData: () => Promise<void>;
}

export function useShopData(): ShopData {
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);

  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState({
    curve: [0, 0, 0, 0, 0, 0, 0],
    raw: [],
    labels: [],
  });
  const [openDisputes, setOpenDisputes] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);

    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', currentUser.id)
      .single();

    const [ordRes, invRes, txRes, salesRes, disputes] = await Promise.all([
      fetchMarketplaceOrdersByMerchant(currentUser.id),
      fetchMerchantInventory(currentUser.id),
      wallet ? marketplaceService.fetchWalletTransactions(wallet.id) : { data: [] },
      marketplaceService.getMerchantSalesHistory(currentUser.id),
      marketplaceService.getMerchantOpenDisputes(currentUser.id),
    ]);

    if (ordRes.data) setOrders(ordRes.data);
    if (invRes.data) setInventory(invRes.data);
    else setInventory([]); // Ensure inventory is never null/undefined in state
    if (txRes?.data) setWalletTransactions(txRes.data);
    if (salesRes) setSalesHistory(salesRes as any);
    if (disputes) setOpenDisputes(disputes);
    if (wallet) useAppStore.getState().setBalance(wallet.balance);

    setLoading(false);
    setRefreshing(false);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    loadData();

    const chOrd = subscribeToTable(
      `merchant-orders-${Date.now()}`,
      'marketplace_orders',
      `merchant_id=eq.${currentUser.id}`,
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          setOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
          );
        } else if (payload.eventType === 'INSERT') {
          setOrders((prev) => [payload.new, ...prev]);
          loadData();
        }
      }
    );

    const chInv = subscribeToTable(
      `merchant-inventory-${Date.now()}`,
      'products',
      `merchant_id=eq.${currentUser.id}`,
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          setInventory((prev) =>
            prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
          );
        } else if (payload.eventType === 'INSERT') {
          setInventory((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setInventory((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
        loadData();
      }
    );

    return () => {
      unsubscribe(chOrd);
      unsubscribe(chInv);
    };
  }, [loadData, currentUser?.id]);

  return {
    orders,
    setOrders,
    inventory,
    setInventory,
    loading,
    setLoading,
    refreshing,
    setRefreshing,
    walletTransactions,
    setWalletTransactions,
    salesHistory,
    setSalesHistory,
    openDisputes,
    setOpenDisputes,
    loadData,
  };
}

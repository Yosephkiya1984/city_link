import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import { useWalletStore } from '../../../store/WalletStore';
import { useMerchantStore } from '../../../store/MerchantStore';
import { getClient, subscribeToTable, unsubscribe } from '../../../services/supabase';
import {
  marketplaceService,
  fetchMarketplaceOrdersByMerchant,
  fetchMerchantInventory,
} from '../../../services/marketplace.service';
import type { Product } from '../../../types/domain_types';

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
  const currentUser = useAuthStore((s) => s.currentUser);
  const mStore = useMerchantStore();
  
  const [loading, setLoading] = useState(mStore.lastUpdated === null);
  const [refreshing, setRefreshing] = useState(false);
  const [openDisputes, setOpenDisputes] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    if (mStore.lastUpdated === null) setLoading(true);

    const client = getClient();
    const { data: wallet } = client
      ? await client.from('wallets').select('id, balance, frozen_balance').eq('user_id', currentUser.id).single()
      : { data: null };

    const [ordRes, invRes, txRes, salesRes, disputes] = await Promise.all([
      fetchMarketplaceOrdersByMerchant(currentUser.id),
      fetchMerchantInventory(currentUser.id),
      wallet ? marketplaceService.fetchWalletTransactions(wallet.id) : { data: [] },
      marketplaceService.getMerchantSalesHistory(currentUser.id),
      marketplaceService.getMerchantOpenDisputes(currentUser.id),
    ]);

    if (ordRes.data) mStore.setOrders(ordRes.data);
    if (invRes.data) mStore.setInventory(invRes.data);
    else mStore.setInventory([]); 

    if (txRes?.data) mStore.setWalletTransactions(txRes.data);
    if (salesRes) mStore.setSalesHistory(salesRes as any);
    if (disputes) setOpenDisputes(disputes);
    
    mStore.setLastUpdated(new Date().toISOString());

    if (wallet && typeof wallet.balance === 'number' && isFinite(wallet.balance)) {
      useWalletStore.getState().setBalance(wallet.balance);
      useWalletStore.getState().setFrozenBalance(wallet.frozen_balance || 0);
    }

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
          mStore.setOrders(
            mStore.orders.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
          );
        } else if (payload.eventType === 'INSERT') {
          mStore.setOrders([payload.new, ...mStore.orders]);
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
          mStore.setInventory(
            mStore.inventory.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
          );
        } else if (payload.eventType === 'INSERT') {
          mStore.setInventory([payload.new, ...mStore.inventory]);
        } else if (payload.eventType === 'DELETE') {
          mStore.setInventory(mStore.inventory.filter((p) => p.id !== payload.old.id));
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
    orders: mStore.orders,
    setOrders: mStore.setOrders,
    inventory: mStore.inventory,
    setInventory: mStore.setInventory,
    loading,
    setLoading,
    refreshing,
    setRefreshing,
    walletTransactions: mStore.walletTransactions,
    setWalletTransactions: mStore.setWalletTransactions,
    salesHistory: mStore.salesHistory,
    setSalesHistory: mStore.setSalesHistory,
    openDisputes,
    setOpenDisputes,
    loadData,
  };
}

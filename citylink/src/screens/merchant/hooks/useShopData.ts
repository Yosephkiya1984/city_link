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
import type { Product, MarketplaceOrder, WalletTransaction, Dispute, MerchantSalesHistory } from '../../../types/domain_types';

export interface ShopData {
  orders: MarketplaceOrder[];
  setOrders: (orders: MarketplaceOrder[]) => void;
  inventory: Product[];
  setInventory: (inventory: Product[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  refreshing: boolean;
  setRefreshing: (refreshing: boolean) => void;
  walletTransactions: WalletTransaction[];
  setWalletTransactions: (txs: WalletTransaction[]) => void;
  salesHistory: MerchantSalesHistory;
  setSalesHistory: (history: MerchantSalesHistory) => void;
  openDisputes: Dispute[];
  setOpenDisputes: (disputes: Dispute[]) => void;
  loadData: () => Promise<void>;
}

export function useShopData(): ShopData {
  const currentUser = useAuthStore((s) => s.currentUser);
  const mStore = useMerchantStore();
  
  const [loading, setLoading] = useState(mStore.lastUpdated === null);
  const [refreshing, setRefreshing] = useState(false);
  const [openDisputes, setOpenDisputes] = useState<Dispute[]>([]);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    if (mStore.lastUpdated === null) setLoading(true);

    const client = getClient();
    const { data: wallet } = client
      ? await client.from('wallets').select('id, balance, frozen_balance').eq('user_id', currentUser.id).maybeSingle()
      : { data: null };

    const [ordRes, invRes, txRes, salesRes, disputes] = await Promise.all([
      fetchMarketplaceOrdersByMerchant(currentUser.id),
      fetchMerchantInventory(currentUser.id),
      wallet ? marketplaceService.fetchWalletTransactions(wallet.id) : { data: [] },
      marketplaceService.getMerchantSalesHistory(currentUser.id),
      marketplaceService.getMerchantOpenDisputes(currentUser.id),
    ]);

    mStore.setOrders((ordRes.data as MarketplaceOrder[]) || []);
    mStore.setInventory((invRes.data as Product[]) || []);

    mStore.setWalletTransactions((txRes?.data as WalletTransaction[]) || []);
    mStore.setSalesHistory(
      (salesRes as MerchantSalesHistory) || { curve: [0, 0, 0, 0, 0, 0, 0], raw: [], labels: [] }
    );
    setOpenDisputes((disputes as Dispute[]) || []);
    
    mStore.setLastUpdated(new Date().toISOString());

    if (wallet && typeof wallet.balance === 'number' && isFinite(wallet.balance)) {
      useWalletStore.getState().setBalance(wallet.balance);
      
      // Calculate true escrow balance from active escrows
      let realEscrow = wallet.frozen_balance || 0;
      if (client) {
        const { data: activeEscrows } = await client.from('escrows')
          .select('amount')
          .eq('merchant_id', currentUser.id)
          .eq('status', 'LOCKED');
        if (activeEscrows) {
          realEscrow = activeEscrows.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        }
      }
      
      useWalletStore.getState().setFrozenBalance(realEscrow);
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
        const latestOrders = useMerchantStore.getState().orders;
        const setOrders = useMerchantStore.getState().setOrders;
        if (payload.eventType === 'UPDATE') {
          setOrders(
            latestOrders.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
          );
        } else if (payload.eventType === 'INSERT') {
          setOrders([payload.new, ...latestOrders]);
          loadData();
        }
      }
    );

    const chInv = subscribeToTable(
      `merchant-inventory-${Date.now()}`,
      'products',
      `merchant_id=eq.${currentUser.id}`,
      (payload) => {
        const latestInv = useMerchantStore.getState().inventory;
        const setInventory = useMerchantStore.getState().setInventory;
        if (payload.eventType === 'UPDATE') {
          setInventory(
            latestInv.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
          );
        } else if (payload.eventType === 'INSERT') {
          setInventory([payload.new, ...latestInv]);
        } else if (payload.eventType === 'DELETE') {
          setInventory(latestInv.filter((p) => p.id !== payload.old.id));
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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { useWalletStore } from '../store/WalletStore';
import { useSystemStore } from '../store/SystemStore';
import { useMarketStore } from '../store/MarketStore';
import { marketplaceService } from '../services/marketplace.service';
import { subscribeToTable, unsubscribe } from '../services/supabase';
import * as Haptics from 'expo-haptics';

export function useMarketplace() {
  const balance = useWalletStore((s) => s.balance);
  const showToast = useSystemStore((s) => s.showToast);
  const currentUser = useAuthStore((s) => s.currentUser);
  const addToCartStore = useMarketStore((s) => s.addToCart);

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState(false);
  const [qty, setQty] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const searchTimer = useRef<any>(null);

  const loadProducts = useCallback(
    async (q = '', cat = 'All') => {
      try {
        let data;
        if (q.trim()) {
          data = await marketplaceService.searchProducts(q);
        } else if (cat !== 'All') {
          data = await marketplaceService.getProductsByCategory(cat);
        } else {
          data = await marketplaceService.getActiveProducts();
        }
        setProducts(data || []);
      } catch (e) {
        showToast('Could not load products', 'error');
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadProducts(search, category);
  }, [category]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadProducts(search, category), 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  useEffect(() => {
    const ch = subscribeToTable('mkt-products-rt', 'products', null, (payload) => {
      if (payload.eventType === 'UPDATE') {
        setProducts((prev) =>
          prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
        );
      } else if (payload.eventType === 'INSERT' && payload.new.status === 'active') {
        setProducts((prev) => [payload.new, ...prev]);
      } else if (payload.eventType === 'DELETE') {
        setProducts((prev) => prev.filter((p) => p.id !== payload.old?.id));
      }
    });
    return () => unsubscribe(ch);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts(search, category);
    setRefreshing(false);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    addToCartStore(selectedProduct, qty);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast('Added to cart!', 'success');
    setSelectedProduct(null);
    setQty(1);
    setDeliveryInstructions('');
  };

  return {
    products,
    loading,
    setLoading,
    refreshing,
    onRefresh,
    buying,
    setBuying,
    qty,
    setQty,
    search,
    setSearch,
    category,
    setCategory,
    selectedProduct,
    setSelectedProduct,
    deliveryInstructions,
    setDeliveryInstructions,
    showSuccess,
    setShowSuccess,
    balance,
    currentUser,
    handleAddToCart,
    featured: products.slice(0, 4),
  };
}

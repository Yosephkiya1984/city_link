import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { useWalletStore } from '../store/WalletStore';
import { useSystemStore } from '../store/SystemStore';
import { useMarketStore } from '../store/MarketStore';
import { marketplaceService } from '../services/marketplace.service';
import { subscribeToTable, unsubscribe } from '../services/supabase';
import { useT } from '../utils/i18n';
import * as Haptics from 'expo-haptics';

export function useMarketplace() {
  const t = useT();
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
  const [category, setCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [estimatedDelivery, setEstimatedDelivery] = useState<number>(0);
  const [loadingFee, setLoadingFee] = useState(false);
  const searchTimer = useRef<any>(null);

  const loadDeliveryFee = useCallback(
    async (merchantId: string) => {
      if (!currentUser || !merchantId) return;
      setLoadingFee(true);
      try {
        const fees = await marketplaceService.calculateDeliveryFees(currentUser.id, [merchantId]);
        if (fees && fees.length > 0) {
          setEstimatedDelivery(Number(fees[0].fee));
        }
      } catch (err) {
        console.error('Failed to load delivery fee:', err);
        setEstimatedDelivery(0); // No fallback to hardcoded value
      } finally {
        setLoadingFee(false);
      }
    },
    [currentUser?.id]
  );

  useEffect(() => {
    if (selectedProduct?.merchant_id) {
      loadDeliveryFee(selectedProduct.merchant_id);
    } else {
      setEstimatedDelivery(0);
    }
  }, [selectedProduct?.id, loadDeliveryFee]);

  const loadProducts = useCallback(
    async (q = '', cat = 'All') => {
      try {
        let data;
        if (q.trim()) {
          data = await marketplaceService.searchProducts(q);
        } else if (cat.toLowerCase() !== 'all') {
          data = await marketplaceService.getProductsByCategory(cat);
        } else {
          data = await marketplaceService.getActiveProducts();
        }
        setProducts(data || []);
      } catch (e) {
        showToast(t('error_loading_products'), 'error');
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
    showToast(t('added_to_cart'), 'success');
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
    estimatedDelivery,
    loadingFee,
    featured: products.slice(0, 4),
  };
}

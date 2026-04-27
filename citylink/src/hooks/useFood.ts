import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { useWalletStore } from '../store/WalletStore';
import { useSystemStore } from '../store/SystemStore';
import * as Haptics from 'expo-haptics';

// Stubs for service calls (assuming these exist in food.service.ts or similar)
// If they don't, I'll define them here or in a service file.

const fetchRestaurants = async () => ({
  data: [
    { id: 'r1', merchant_name: 'Habesha 2000', category: 'traditional' },
    { id: 'r2', merchant_name: 'Tomoca Coffee', category: 'cafe' },
    { id: 'r3', merchant_name: 'Bambis Grocery', category: 'grocery' },
    { id: 'r4', merchant_name: 'Zoma Lounge', category: 'dining' },
  ]
});

const fetchFoodItems = async (restId: string) => ({
  data: [
    { id: 'm1', name: 'Special Kitfo', price: 450, description: 'Prime beef kitsfo with kocho' },
    { id: 'm2', name: 'Beyaynetu', price: 320, description: 'Traditional vegan platter' },
    { id: 'm3', name: 'Macchiato', price: 65, description: 'Signature Tomoca macchiato' },
  ]
});

const placeOrder = async (payload: any) => ({ ok: true, data: { new_balance: 15000 } });

export function useFood() {
  const balance = useWalletStore((s) => s.balance);
  const setBalance = useWalletStore((s) => s.setBalance);
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<'delivery' | 'tonight' | 'grocery' | 'cafe'>('delivery');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRest, setSelectedRest] = useState<any | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<'DELIVERY' | 'RESERVE'>('DELIVERY');

  useEffect(() => {
    async function loadRests() {
      setLoading(true);
      const { data } = await fetchRestaurants();
      if (data) setRestaurants(data);
      setLoading(false);
    }
    loadRests();
  }, []);

  const openRestaurant = useCallback(async (r: any) => {
    setSelectedRest(r);
    setCart({});
    setMode('DELIVERY');
    setMenuLoading(true);
    const { data } = await fetchFoodItems(r.id);
    setMenuItems(data || []);
    setMenuLoading(false);
  }, []);

  const cartTotal = useMemo(() => Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = menuItems.find((m) => m.id === itemId);
    return sum + (Number(item?.price) || 0) * (qty as number);
  }, 0), [cart, menuItems]);

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  const addToCart = useCallback((itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[itemId] > 1) next[itemId]--;
      else delete next[itemId];
      return next;
    });
  }, []);

  return {
    activeTab,
    setActiveTab,
    restaurants,
    loading,
    selectedRest,
    setSelectedRest,
    menuItems,
    menuLoading,
    cart,
    mode,
    setMode,
    cartTotal,
    cartCount,
    addToCart,
    removeFromCart,
    balance,
    setBalance,
    currentUser,
    showToast,
    openRestaurant,
  };
}

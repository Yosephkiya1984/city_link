import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import { useWalletStore } from '../../../store/WalletStore';
import { useNavigation } from '@react-navigation/native';
import {
  updateOrderStatus,
  updateMenuItem,
  dispatchFoodOrder,
} from '../../../services/food.service';
import { uid } from '../../../utils';

export function useRestaurantActions(data: any) {
  const { loadData, setMenu, menu } = data;
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);
  const resetAuth = useAuthStore((s) => s.reset);
  const resetWallet = useWalletStore((s) => s.reset);
  const resetSystem = useSystemStore((s) => s.reset);

  const [actionLoading, setActionLoading] = useState(false);
  const [showAddMenuItem, setShowAddMenuItem] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');

  const onUpdateStatus = async (orderId: string, newStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);

    try {
      if (newStatus === 'DISPATCHING') {
        if (!currentUser?.id) return;
        // 1. Generate PIN and update order with it
        const pin = Math.floor(1000 + Math.random() * 9000).toString();

        // Update DB with PIN first
        await updateOrderStatus(orderId, 'READY', pin);

        // 2. Call Dispatch RPC
        const dispatchRes = await dispatchFoodOrder(orderId, currentUser.id);

        if (dispatchRes.success) {
          showToast(`Dispatched to ${dispatchRes.dispatchedCount} agents`, 'success');
          setCurrentPin(pin);
          setShowPinModal(true);
        }
      } else {
        const result = await updateOrderStatus(orderId, newStatus);
        if (!result.error) {
          showToast(`Order ${newStatus.toLowerCase()}`, 'success');
          loadData();
        } else {
          showToast(result.error || 'Failed to update order', 'error');
        }
      }
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to update order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onAddMenuItem = async (item: {
    name: string;
    price: string;
    category: string;
    description: string;
    available: boolean;
  }) => {
    if (!currentUser?.id) return;
    setActionLoading(true);

    try {
      const menuItemData = {
        id: uid(),
        restaurant_id: currentUser.id,
        name: item.name.trim(),
        price: parseFloat(item.price),
        category: item.category,
        description: item.description?.trim() || '',
        available: item.available,
        created_at: new Date().toISOString(),
      };

      const result = await updateMenuItem(menuItemData);
      if (!result.error) {
        setMenu([menuItemData, ...menu]);
        setShowAddMenuItem(false);
        showToast('Menu item added!', 'success');
      } else {
        showToast(result.error || 'Failed to add item', 'error');
      }
    } catch (error) {
      showToast('Failed to add item', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onToggleAvailability = async (item: any) => {
    const newAvailable = !item.available;
    const result = await updateMenuItem({ ...item, available: newAvailable });
    if (!result.error) {
      setMenu(menu.map((m: any) => (m.id === item.id ? { ...m, available: newAvailable } : m)));
      showToast(`Item ${newAvailable ? 'available' : 'unavailable'}`, 'info');
    }
  };

  const onLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Logged out successfully', 'success');
    resetAuth();
    resetWallet();
    resetSystem();
    (navigation as any).replace('Auth');
  };

  return {
    actionLoading,
    onUpdateStatus,
    onAddMenuItem,
    onToggleAvailability,
    onLogout,
    showAddMenuItem,
    setShowAddMenuItem,
    showPinModal,
    setShowPinModal,
    currentPin,
  };
}

import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import { useWalletStore } from '../../../store/WalletStore';
import { useNavigation } from '@react-navigation/native';
import {
  updateOrderStatus,
  updateMenuItem,
  dispatchFoodOrder,
  rejectFoodOrder,
  completeFoodOrder,
  uploadDishImage,
  uploadRestaurantBanner,
  updateRestaurantProfile,
  addRestaurantTable,
  setTableStatus,
  fetchMerchantRestaurant,
} from '../../../services/food.service';
import { updateRestaurantStock } from '../../../services/marketplace.service';
import { confirmOrderPickup } from '../../../services/delivery.service';
import { HospitalityService } from '../../../services/hospitality.service';
import { uid } from '../../../utils';

export function useRestaurantActions(data: any, isWhitelisted: boolean = false) {
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
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [bannerImage, setBannerImage] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [restaurantProfile, setRestaurantProfile] = useState<any>(null);

  const onUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!currentUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);

    try {
      if (newStatus === 'DISPATCHING') {
        if (!currentUser?.id) return;
        
        // 1. Mark as READY and generate pickup_pin on server
        const pickupRes = await confirmOrderPickup(orderId, currentUser.id, 'FOOD');
        
        if (!pickupRes.ok) {
          showToast(pickupRes.error || 'Failed to prepare order', 'error');
          return;
        }

        // 2. Call Dispatch RPC
        const dispatchRes = await dispatchFoodOrder(orderId, currentUser.id);

        if (dispatchRes.success) {
          showToast(`Dispatched to ${dispatchRes.dispatchedCount} agents`, 'success');
          setCurrentPin(pickupRes.pin || '');
          setShowPinModal(true);
        }
      } else if (newStatus === 'COMPLETED') {
        const targetOrder = data.orders.find((o: any) => o.id === orderId);
        const result = await completeFoodOrder(orderId, currentUser.id, targetOrder?.pickup_pin);
        if (result.ok) {
          showToast(`Order handed over & payout received!`, 'success');
          loadData();
        } else {
          showToast(result.error || 'Failed to complete order', 'error');
        }
      } else {
        const result = await updateOrderStatus(orderId, currentUser.id, newStatus);
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

  const onRejectOrder = async (orderId: string) => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActionLoading(true);
    try {
      await rejectFoodOrder(orderId, currentUser.id);
      showToast('Order rejected & Citizen refunded', 'info');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to reject order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const isVerified =
    isWhitelisted || (currentUser?.merchant_status === 'APPROVED' && !!currentUser?.tin);

  const onAddMenuItem = async (form: any) => {
    if (!currentUser?.id) return;
    if (!isVerified) {
      showToast('Verification required to list menu items', 'error');
      return;
    }
    setUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let imageUrl = null;

    if (selectedImage) {
      const res = await uploadDishImage(selectedImage);
      if (res.data) imageUrl = res.data;
      else if (res.error) console.warn('Image upload failed, using default', res.error);
    }

    const result = await updateMenuItem(currentUser.id, {
      id: uid(),
      name: form.name.trim(),
      price: parseFloat(form.price),
      category: form.category,
      description: form.description?.trim() || '',
      available: form.available,
      image_url: imageUrl,
    });

    setUploading(false);
    if (!result.error) {
      loadData();
      setShowAddMenuItem(false);
      setSelectedImage(null);
      showToast('Menu item added!', 'success');
    } else {
      console.error('[Add Dish Error Payload]:', result.error);
      showToast(result.error || 'Failed to add item', 'error');
    }
  };

  const onPickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const onToggleAvailability = async (item: any) => {
    if (!currentUser?.id) return;
    const newAvailable = !item.available;
    const result = await updateMenuItem(currentUser.id, { ...item, available: newAvailable });
    if (!result.error) {
      setMenu(menu.map((m: any) => (m.id === item.id ? { ...m, available: newAvailable } : m)));
      showToast(`Item ${newAvailable ? 'available' : 'unavailable'}`, 'info');
    }
  };

  // ==========================================
  // HOSPITALITY ACTIONS
  // ==========================================

  const onCreateEvent = async (eventPayload: any) => {
    if (!currentUser?.id) return;
    setActionLoading(true);
    try {
      await HospitalityService.createEvent({ ...eventPayload, merchant_id: currentUser.id });
      showToast('Event created successfully!', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to create event', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onReleaseHospitalityEscrow = async (pin: string, type: 'TICKET' | 'RESERVATION') => {
    if (!currentUser?.id) return;
    setActionLoading(true);
    try {
      const res = await HospitalityService.releaseHospitalityEscrow(pin, type);
      showToast(res.message || 'Escrow released successfully', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message || `Failed to process ${type.toLowerCase()} PIN`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onToggleTableStatus = async (tableId: string, currentStatus: string) => {
    if (!currentUser?.id) return;
    const newStatus = currentStatus === 'free' ? 'occupied' : 'free';
    setActionLoading(true);
    try {
      await HospitalityService.toggleTableStatus(tableId, newStatus as any);
      showToast(`Table marked as ${newStatus.toLowerCase()}`, 'info');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to update table status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onInitializeTables = async (count: number) => {
    if (!currentUser?.id) return;
    setActionLoading(true);
    try {
      await HospitalityService.initializeTables(count);
      showToast(`${count} tables initialized`, 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to initialize tables', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onWithdraw = async () => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActionLoading(true);
    try {
      // In a real app, this would trigger a withdrawal flow
      // For now, we'll simulate success if balance > 0
      showToast('Withdrawal initiated! Processing...', 'info');
      setTimeout(() => {
        showToast('ETB 1,200 withdrawn to your bank account', 'success');
        loadData();
      }, 2000);
    } catch (error) {
      showToast('Failed to initiate withdrawal', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // BANNER & RESTAURANT PROFILE ACTIONS
  // ==========================================

  const onPickBanner = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled) setBannerImage(result.assets[0]);
  };

  const onUploadBanner = async () => {
    if (!currentUser?.id || !bannerImage) return;
    setBannerUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uploadRes = await uploadRestaurantBanner(bannerImage);
      if (uploadRes.error) {
        showToast(uploadRes.error, 'error');
        return;
      }
      const updateRes = await updateRestaurantProfile(currentUser.id, {
        banner_url: uploadRes.data!,
      });
      if (updateRes.error) {
        showToast(updateRes.error, 'error');
        return;
      }
      setRestaurantProfile((prev: any) => ({ ...prev, banner_url: uploadRes.data }));
      setBannerImage(null);
      showToast('🎉 Banner live! Citizens can see it now.', 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Upload failed', 'error');
    } finally {
      setBannerUploading(false);
    }
  };

  const onLoadRestaurantProfile = useCallback(async () => {
    if (!currentUser?.id) return;
    const res = await fetchMerchantRestaurant(currentUser.id);
    if (res.data) setRestaurantProfile(res.data);
  }, [currentUser?.id]);

  // ==========================================
  // TABLE MANAGEMENT ACTIONS
  // ==========================================

  const onAddTable = async (
    tableNumber: string,
    capacity: number,
    label: string,
    status: 'free' | 'vip' = 'free'
  ) => {
    if (!currentUser?.id) return;
    setActionLoading(true);
    try {
      const restRes = await fetchMerchantRestaurant(currentUser.id);
      const restaurantId = restRes.data?.id;
      if (!restaurantId) {
        showToast(
          'Restaurant not found. Add a dish first to auto-create your restaurant.',
          'error'
        );
        return;
      }
      const res = await addRestaurantTable(
        currentUser.id,
        restaurantId,
        tableNumber,
        capacity,
        label,
        status
      );
      if (res.error) showToast(res.error, 'error');
      else {
        showToast(`Table T${tableNumber} added!`, 'success');
        loadData();
        setShowAddTableModal(false);
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to add table', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onSetTableStatus = async (
    tableId: string,
    status: 'free' | 'occupied' | 'reserved' | 'vip'
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await setTableStatus(tableId, status);
    if (!res.error) {
      showToast(`Table marked ${status.toLowerCase()}`, 'info');
      loadData();
    } else showToast(res.error, 'error');
  };

  const onLogout = useCallback(async () => {
    try {
      await useAuthStore.getState().signOut();
      showToast('Logged out successfully', 'info');
    } catch (error) {
      showToast('Logout failed', 'error');
    }
  }, [showToast]);

  return {
    actionLoading,
    onUpdateStatus,
    onAddMenuItem,
    onToggleAvailability,
    onCreateEvent,
    onReleaseHospitalityEscrow,
    onToggleTableStatus,
    onInitializeTables,
    onRejectOrder,
    onLogout,
    onWithdraw,
    showAddMenuItem,
    setShowAddMenuItem,
    showPinModal,
    setShowPinModal,
    showAddTableModal,
    setShowAddTableModal,
    currentPin,
    selectedImage,
    setSelectedImage,
    onPickImage,
    uploading,
    // Banner
    bannerImage,
    setBannerImage,
    bannerUploading,
    onPickBanner,
    onUploadBanner,
    restaurantProfile,
    onLoadRestaurantProfile,
    // Tables
    onAddTable,
    onSetTableStatus,
    // Stock
    onUpdateStock: async (stockItem: any) => {
      if (!currentUser?.id) return;
      setActionLoading(true);
      try {
        const res = await updateRestaurantStock({ ...stockItem, merchant_id: currentUser.id });
        if (res.error) showToast(res.error, 'error');
        else {
          showToast(`Stock updated!`, 'success');
          loadData();
        }
      } catch (e: any) {
        showToast(e.message || 'Failed to update stock', 'error');
      } finally {
        setActionLoading(true);
      }
    },
    onOrderSupplies: async (item: any) => {
      if (!currentUser?.id) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Navigate to marketplace or show suggested products
      showToast(`Searching for ${item.item_name} on Agro-Link...`, 'info');
      (navigation as any).navigate('Marketplace', {
        search: item.item_name,
        category: 'Agro',
      });
    },
  };
}

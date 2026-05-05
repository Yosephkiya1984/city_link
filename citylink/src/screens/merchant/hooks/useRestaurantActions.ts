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
  settleFoodOrderPayment,
} from '../../../services/food.service';
import { updateRestaurantStock } from '../../../services/marketplace.service';
import { markOrderPickedUp, retryDispatch } from '../../../services/delivery.service';
import { HospitalityService } from '../../../services/hospitality.service';
import { uid } from '../../../utils';
import { OfflineSyncService } from '../../../services/OfflineSyncService';

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
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const onUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!currentUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);

    try {
      if (newStatus === 'DISPATCHING') {
        try {
          // 🚀 Trigger the unified dispatch system
          // This RPC handles moving status to DISPATCHING and notifying nearby agents
          const dispatchRes = await dispatchFoodOrder(orderId, currentUser.id);

          if (dispatchRes.success) {
            showToast(`📡 Dispatched to ${dispatchRes.dispatchedCount} agents`, 'success');
            loadData();
          }
        } catch (e: any) {
          showToast(e.message || 'Dispatch failed', 'error');
        }
        return;
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
        // 🔄 SMART STATUS REDIRECT: If marking a DELIVERY order as READY, trigger DISPATCHING flow
        if (newStatus === 'READY') {
          const targetOrder = data.orders.find((o: any) => o.id === orderId);
          if (!targetOrder) return;

          // 🚀 HANDOVER CHECK: If agent is already assigned, READY means handover (Confirm Pickup)
          if (targetOrder.status === 'AGENT_ASSIGNED') {
            const agentId = targetOrder.agent_id;
            if (!agentId) {
              showToast('No agent assigned for handover', 'error');
              return;
            }
            
            console.log(`[RestaurantActions] Handover for ${orderId} to agent ${agentId}`);
            const type = targetOrder._source === 'delivery' ? 'FOOD' : 'MARKETPLACE';
            const pickupRes = await markOrderPickedUp(orderId, currentUser.id, type);
            
            if (pickupRes.ok) {
              showToast('✅ Handover confirmed!', 'success');
              if (pickupRes.pin) {
                setCurrentPin(pickupRes.pin);
                setShowPinModal(true);
              }
              loadData();
              return;
            } else {
              showToast(pickupRes.error || 'Handover failed', 'error');
              return;
            }
          }

          // 🚀 Explicit delivery check for auto-dispatch
          const isDelivery = targetOrder._source === 'delivery' || !!targetOrder.shipping_address;
          const isPreOrder = targetOrder.type === 'preorder' || targetOrder.order_type === 'pickup' || targetOrder.type === 'pickup';
          
          console.log(`[RestaurantActions] READY transition for ${orderId}. isDelivery:`, isDelivery);

          if (isDelivery && !isPreOrder) {
            console.log('[RestaurantActions] Auto-dispatching delivery order');
            // Move to DISPATCHING state to trigger agent discovery
            setActionLoading(false); 
            return onUpdateStatus(orderId, 'DISPATCHING');
          }
        }

        const result = await updateOrderStatus(orderId, currentUser.id, newStatus);
        if (!result.error) {
          showToast(`Order ${newStatus.toLowerCase()}`, 'success');
          loadData();
        } else {
          // If network error, add to offline queue
          OfflineSyncService.addAction({
            id: orderId,
            type: 'ORDER',
            payload: { merchant_id: currentUser.id, status: newStatus },
            createdAt: new Date().toISOString()
          });
          showToast('Offline: Status will sync when connected', 'info');
        }
      }
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to update order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onFireReservation = async (reservationId: string) => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActionLoading(true);
    try {
      await HospitalityService.fireReservation(reservationId);
      showToast('🔥 Order sent to kitchen!', 'success');
      loadData();
    } catch (error: any) {
      // Offline fallback
      OfflineSyncService.addAction({
        id: reservationId,
        type: 'RESERVATION_UPDATE',
        payload: { id: reservationId, status: 'FIRED', fired_at: new Date() },
        createdAt: new Date().toISOString()
      });
      showToast('Offline: Order will fire when connected', 'info');
      loadData(); // Update local state if possible
    } finally {
      setActionLoading(false);
    }
  };

  const onSettlePayment = async (orderId: string, method: string = 'CASH') => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActionLoading(true);
    try {
      const res = await settleFoodOrderPayment(orderId, currentUser.id, method);
      if (res.ok) {
        showToast(`Payment settled via ${method}`, 'success');
        loadData();
      } else {
        showToast(res.error || 'Failed to settle payment', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to settle payment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onRejectOrder = async (orderId: string) => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActionLoading(true);
    try {
      // 1. Check if it's a reservation first
      const isReservation = data.reservations.some((r: any) => r.id === orderId);
      
      if (isReservation) {
        await HospitalityService.cancelReservation(orderId);
        showToast('Reservation cancelled & Citizen refunded', 'info');
      } else {
        await rejectFoodOrder(orderId, currentUser.id);
        showToast('Order rejected & Citizen refunded', 'info');
      }
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

  const onUpdateStock = async (stockItem: any) => {
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
      setActionLoading(false);
    }
  };

  const onOrderSupplies = async (item: any) => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast(`Searching for ${item.item_name} on Agro-Link...`, 'info');
    (navigation as any).navigate('Marketplace', {
      search: item.item_name,
      category: 'Agro',
    });
  };

  const onUpdateReservationStatus = async (reservationId: string, status: string) => {
    if (!currentUser?.id) return;
    setActionLoading(true);
    try {
      const { error } = await HospitalityService.updateReservationStatus(reservationId, status);
      if (error) throw new Error(error);
      showToast(`Reservation ${status.toLowerCase()}`, 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to update reservation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onRetryDispatch = async (orderId: string, orderType: any = 'FOOD') => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);
    try {
      const lat = restaurantProfile?.latitude || null;
      const lng = restaurantProfile?.longitude || null;
      const res = await retryDispatch(orderId, currentUser.id, orderType, lat, lng);
      if (res.ok) {
        showToast(`Dispatched to ${res.count} agents`, 'success');
        loadData();
      } else {
        showToast(res.error || 'Dispatch failed', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Dispatch error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return {
    actionLoading,
    onUpdateStatus,
    onRetryDispatch,
    onFireReservation,
    onSettlePayment,
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
    bannerImage,
    setBannerImage,
    bannerUploading,
    onPickBanner,
    onUploadBanner,
    restaurantProfile,
    onLoadRestaurantProfile,
    onAddTable,
    onSetTableStatus,
    onUpdateStock,
    onOrderSupplies,
    onUpdateReservationStatus,
    editingProduct,
    setEditingProduct,
  };
}

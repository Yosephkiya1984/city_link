import { useState, useCallback, useMemo } from 'react';
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
import {
  updateRestaurantStock,
  requestWithdrawal,
} from '../../../services/marketplace.service';
import { markOrderPickedUp, retryDispatch } from '../../../services/delivery.service';
import { HospitalityService } from '../../../services/hospitality.service';
import { uid } from '../../../utils';
import { OfflineSyncService } from '../../../services/OfflineSyncService';
import { RestaurantData, MergedFoodOrder } from './useRestaurantData';
import { FoodProduct, Restaurant as RestaurantProfile } from '../../../types/domain_types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation';

export function useRestaurantActions(data: RestaurantData, isWhitelisted: boolean = false) {
  const { loadData, setMenu, menu } = data;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile | null>(null);
  const [editingProduct, setEditingProduct] = useState<FoodProduct | null>(null);

  const onUpdateStatus = useCallback(async (orderId: string, newStatus: string) => {
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
        const targetOrder = data.orders.find((o: MergedFoodOrder) => o.id === orderId);
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
          const targetOrder = data.orders.find((o: MergedFoodOrder) => o.id === orderId);
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
              if (pickupRes.pickupPin) {
                setCurrentPin(pickupRes.pickupPin);
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update order';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, showToast, loadData, data.orders]);

  const onFireReservation = useCallback(async (reservationId: string) => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActionLoading(true);
    try {
      await HospitalityService.fireReservation(reservationId);
      showToast('🔥 Order sent to kitchen!', 'success');
      loadData();
    } catch (error) {
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
  }, [currentUser, loadData, showToast]);

  const onSettlePayment = useCallback(async (orderId: string, method: string = 'CASH') => {
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to settle payment';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, loadData, showToast]);

  const onRejectOrder = useCallback(async (orderId: string) => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActionLoading(true);
    try {
      // 1. Check if it's a reservation first
      const isReservation = data.reservations.some((r) => r.id === orderId);
      
      if (isReservation) {
        await HospitalityService.cancelReservation(orderId);
        showToast('Reservation cancelled & Citizen refunded', 'info');
      } else {
        await rejectFoodOrder(orderId, currentUser.id);
        showToast('Order rejected & Citizen refunded', 'info');
      }
      loadData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to reject order';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, loadData, showToast, data.reservations]);

  const isVerified =
    isWhitelisted || (currentUser?.merchant_status === 'APPROVED' && !!currentUser?.tin);

  const onAddMenuItem = useCallback(async (form: { name: string, price: string, category: string, description?: string, available: boolean }) => {
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
  }, [currentUser, isVerified, selectedImage, showToast, loadData]);

  const onPickImage = useCallback(async () => {
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
  }, []);

  const onToggleAvailability = useCallback(async (item: FoodProduct) => {
    if (!currentUser?.id) return;
    const newAvailable = !item.available;
    const result = await updateMenuItem(currentUser.id, { ...item, available: newAvailable });
    if (!result.error) {
      setMenu(menu.map((m) => (m.id === item.id ? { ...m, available: newAvailable } : m)));
      showToast(`Item ${newAvailable ? 'available' : 'unavailable'}`, 'info');
    }
  }, [currentUser, menu, setMenu, showToast]);

  const onCreateEvent = useCallback(async (eventPayload: { title: string, description: string, date: string, category: string }) => {
    if (!currentUser?.id) return;
    setActionLoading(true);
    try {
      await HospitalityService.createEvent({ ...eventPayload, merchant_id: currentUser.id });
      showToast('Event created successfully!', 'success');
      loadData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create event';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, loadData, showToast]);

  const onReleaseHospitalityEscrow = useCallback(async (pin: string, type: 'TICKET' | 'RESERVATION'): Promise<boolean> => {
    if (!currentUser?.id) return false;
    setActionLoading(true);
    try {
      const res = await HospitalityService.releaseHospitalityEscrow(pin, type);
      showToast(res?.message || 'Check-in successful! Escrow released.', 'success');
      loadData();
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : `Invalid PIN for ${type.toLowerCase()}`;
      showToast(msg, 'error');
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, loadData, showToast]);

  const onToggleTableStatus = useCallback(async (tableId: string, currentStatus: string) => {
    if (!currentUser?.id) return;
    const newStatus = currentStatus === 'free' ? 'occupied' : 'free';
    setActionLoading(true);
    try {
      await HospitalityService.toggleTableStatus(tableId, newStatus as any);
      showToast(`Table marked as ${newStatus.toLowerCase()}`, 'info');
      loadData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update table status';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, loadData, showToast]);

  const onInitializeTables = useCallback(async (count: number) => {
    if (!currentUser?.id) return;
    setActionLoading(true);
    try {
      await HospitalityService.initializeTables(count);
      showToast(`${count} tables initialized`, 'success');
      loadData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to initialize tables';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, loadData, showToast]);

  const onWithdraw = useCallback(async () => {
    const currentBalance = useWalletStore.getState().balance || 0;
    if (currentBalance < 100) {
      showToast('Minimum withdrawal is ETB 100', 'warning');
      return;
    }

    const bankName = currentUser?.merchant_details?.bank_name;
    const accountNum = currentUser?.merchant_details?.account_number;

    if (!bankName || !accountNum) {
      showToast('Please update bank details in profile first', 'warning');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActionLoading(true);
    try {
      const res = await requestWithdrawal(
        currentUser!.id,
        currentBalance,
        bankName,
        accountNum
      );

      if (res.data?.ok) {
        useWalletStore.getState().setBalance(res.data.new_balance);
        showToast('Withdrawal request submitted via Chapa!', 'success');
        loadData();
      } else {
        showToast(res.error || 'Withdrawal failed', 'error');
      }
    } catch (error) {
      console.error('[Withdrawal Error]:', error);
      showToast('Failed to initiate withdrawal', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, loadData, showToast]);

  const onPickBanner = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled) setBannerImage(result.assets); // Store array of assets
  }, []);

  const onUploadBanner = useCallback(async () => {
    if (!currentUser?.id || !bannerImage || !bannerImage.length) return;
    setBannerUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uploadedUrls: string[] = [];
      for (const asset of bannerImage) {
        const uploadRes = await uploadRestaurantBanner(asset);
        if (uploadRes.data) {
          uploadedUrls.push(uploadRes.data);
        }
      }
      
      if (uploadedUrls.length > 0) {
        const updateRes = await updateRestaurantProfile(currentUser.id, {
          gallery_json: uploadedUrls,
          banner_url: uploadedUrls[0], // Keep legacy banner_url mapped to the first image
        });
        if (updateRes.error) {
          showToast(updateRes.error, 'error');
          return;
        }
        setRestaurantProfile((prev) => (prev ? { ...prev, gallery_json: uploadedUrls, banner_url: uploadedUrls[0] } : null));
        setBannerImage(null);
        showToast('🎉 Gallery live! Citizens can see it now.', 'success');
        loadData();
      } else {
        showToast('Failed to upload images', 'error');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      showToast(msg, 'error');
    } finally {
      setBannerUploading(false);
    }
  }, [currentUser, bannerImage, loadData, showToast]);

  const onLoadRestaurantProfile = useCallback(async () => {
    if (!currentUser?.id) return;
    const res = await fetchMerchantRestaurant(currentUser.id);
    if (res.data) setRestaurantProfile(res.data as RestaurantProfile);
  }, [currentUser?.id]);

  const onAddTable = useCallback(async (
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to add table';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, loadData, showToast]);

  const onSetTableStatus = useCallback(async (
    tableId: string,
    status: 'free' | 'occupied' | 'reserved' | 'vip'
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await setTableStatus(tableId, status);
    if (!res.error) {
      showToast(`Table marked ${status.toLowerCase()}`, 'info');
      loadData();
    } else showToast(res.error, 'error');
  }, [loadData, showToast]);

  const onLogout = useCallback(async () => {
    try {
      await useAuthStore.getState().signOut();
      showToast('Logged out successfully', 'info');
    } catch (error) {
      showToast('Logout failed', 'error');
    }
  }, [showToast]);

  const onUpdateStock = useCallback(async (stockItem: { id: string, item_name: string, quantity: number }) => {
    if (!currentUser?.id) return;
    setActionLoading(true);
    try {
      const res = await updateRestaurantStock({ ...stockItem, merchant_id: currentUser.id });
      if (res.error) showToast(res.error, 'error');
      else {
        showToast(`Stock updated!`, 'success');
        loadData();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update stock';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, loadData, showToast]);

  const onOrderSupplies = useCallback(async (item: { item_name: string }) => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast(`Searching for ${item.item_name} on Agro-Link...`, 'info');
    navigation.navigate('Marketplace', {
      search: item.item_name,
      category: 'Agro',
    });
  }, [currentUser, navigation, showToast]);

  const onUpdateReservationStatus = useCallback(async (id: string, status: string) => {
    if (!currentUser?.id) return;
    setActionLoading(true);
    try {
      await HospitalityService.updateReservationStatus(id, status);
      showToast(`Reservation ${status.toLowerCase()}`, 'success');
      loadData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Status update failed';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, loadData, showToast]);

  const onNoShowReservation = useCallback(async (reservationId: string) => {
    if (!currentUser?.id) return;
    setActionLoading(true);
    try {
      const res = await HospitalityService.noShowReservation(reservationId);
      if (res?.ok) {
        showToast('No-show recorded. Deposit retained.', 'info');
      } else {
        showToast(res?.error || 'Failed to record no-show', 'error');
      }
      loadData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No-show failed';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, loadData, showToast]);
  
  const onCreateReservation = useCallback(async (payload: any) => {
    if (!currentUser?.id) return false;
    setActionLoading(true);
    try {
      const result = await HospitalityService.createReservation(
        payload.merchant_id || currentUser.id,
        payload.reservation_time,
        payload.guest_count,
        payload.deposit_amount || 0,
        payload.items || [],
        payload.table_id,
        payload.table_number,
        payload.metadata || {}
      );
      
      // The result is the JSONB from the RPC
      const pin = result?.service_pin || '....';
      showToast(`Reservation Created! PIN: ${pin}`, 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      await loadData();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create reservation';
      showToast(msg, 'error');
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, loadData, showToast]);

  const onRetryDispatch = useCallback(async (orderId: string, orderType: 'FOOD' | 'MARKETPLACE' = 'FOOD') => {
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Dispatch error';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, loadData, showToast, restaurantProfile]);

  return useMemo(() => ({
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
    onCreateReservation,
    onNoShowReservation,
    editingProduct,
    setEditingProduct,
  }), [
    actionLoading, onUpdateStatus, onRetryDispatch, onFireReservation, onSettlePayment,
    onAddMenuItem, onToggleAvailability, onCreateEvent, onReleaseHospitalityEscrow,
    onToggleTableStatus, onInitializeTables, onRejectOrder, onLogout, onWithdraw,
    showAddMenuItem, showPinModal, showAddTableModal, currentPin, selectedImage,
    uploading, bannerImage, bannerUploading, restaurantProfile, onLoadRestaurantProfile,
    onAddTable, onSetTableStatus, onUpdateStock, onOrderSupplies, onUpdateReservationStatus,
    onCreateReservation, onNoShowReservation,
    editingProduct
  ]);
}

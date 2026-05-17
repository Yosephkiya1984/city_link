import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getClient } from '../../../services/supabase';
import {
  marketplaceService,
  insertProduct,
  uploadProductImage,
  requestWithdrawal,
} from '../../../services/marketplace.service';
import { fetchProfile } from '../../../services/auth.service';
import { createChatThread, createChatMessage } from '../../../services/chat.service';
import { getCurrentLocation } from '../../../services/delivery.service';
import { uid } from '../../../utils';
import { useWalletStore } from '../../../store/WalletStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation';
import { User, Product, MarketplaceOrder } from '../../../types/domain_types';

export interface ShopActionsProps {
  currentUser: User | null;
  showToast: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  loadData: () => Promise<void>;
  newProduct: {
    name: string;
    price: string;
    category: string;
    stock: string;
    description: string;
    condition: string;
  };
  setNewProduct: (val: any) => void;
  editingProduct: Product | null;
  setEditingProduct: (val: Product | null) => void;
  selectedImage: any;
  setSelectedImage: (val: any) => void;
  setUploading: (val: boolean) => void;
  setShowProductModal: (val: boolean) => void;
  setInventory: (val: any) => void;
  shipping: boolean;
  setShipping: (val: boolean) => void;
  loading: boolean;
  setLoading: (val: boolean) => void;
  pinPromptOrder: MarketplaceOrder | null;
  setPinPromptOrder: (val: MarketplaceOrder | null) => void;
  pinInput: string;
  setPinInput: (val: string) => void;
  setSubmittingPin: (val: boolean) => void;
  setShowShipSuccess: (val: any) => void;
  setWithdrawing: (val: boolean) => void;
  orders: MarketplaceOrder[];
}

export function useShopActions({
  currentUser,
  showToast,
  loadData,
  newProduct,
  setNewProduct,
  editingProduct,
  setEditingProduct,
  selectedImage,
  setSelectedImage,
  setUploading,
  setShowProductModal,
  setInventory,
  shipping,
  setShipping,
  loading,
  setLoading,
  pinPromptOrder,
  setPinPromptOrder,
  pinInput,
  setPinInput,
  setSubmittingPin,
  setShowShipSuccess,
  setWithdrawing,
  orders,
}: ShopActionsProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleSaveProduct = async () => {
    if (!currentUser?.id) return;
    const priceVal = parseFloat(newProduct.price);
    const stockVal = parseInt(newProduct.stock);

    if (!newProduct.name || isNaN(priceVal) || priceVal < 0 || isNaN(stockVal) || stockVal < 0) {
      showToast('Please provide valid name, valid price, and stock quantity', 'warning');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUploading(true);

    let finalImageUrl =
      editingProduct?.image_url ||
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400&auto=format&fit=crop';

    if (selectedImage) {
      const uploadRes = await uploadProductImage(selectedImage);
      if (uploadRes.error) {
        showToast(`Image upload failed: ${uploadRes.error}`, 'error');
        setUploading(false);
        return;
      }
      finalImageUrl = uploadRes.data;
    }

    if (editingProduct) {
      const { error } = await marketplaceService.updateProduct(editingProduct.id, currentUser.id, {
        name: newProduct.name,
        price: priceVal,
        category: newProduct.category,
        stock: stockVal,
        description: newProduct.description,
        condition: newProduct.condition,
        image_url: finalImageUrl,
      });
      if (error) showToast('Update failed', 'error');
      else showToast('Product updated!', 'success');
    } else {
      const { data: sessionData } = await getClient()!.auth.getSession();
      console.log('[ShopActions] Current Supabase Session Role:', sessionData.session?.user?.role);
      console.log('[ShopActions] Current Supabase Session ID:', sessionData.session?.user?.id);
      console.log('[ShopActions] Current AuthStore ID:', currentUser.id);

      const productData = {
        id: uid(),
        merchant_id: currentUser.id,
        name: newProduct.name,
        title: newProduct.name,
        price: priceVal,
        category: newProduct.category,
        stock: stockVal,
        description: newProduct.description,
        status: 'active' as const,
        condition: newProduct.condition,
        image_url: finalImageUrl,
        images_json: [] as string[],
      };
      const res = await insertProduct(productData);
      if (res.error) showToast(`Failed to list product: ${res.error}`, 'error');
      else showToast('Product listed!', 'success');
    }

    setUploading(false);
    setShowProductModal(false);
    setEditingProduct(null);
    setNewProduct({
      name: '',
      price: '',
      category: 'Electronics',
      stock: '10',
      description: '',
      condition: 'new',
    });
    setSelectedImage(null);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: String(product.price),
      category: product.category,
      stock: String(product.stock),
      description: product.description,
      condition: product.condition || 'new',
    });
    setSelectedImage(null);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert('Delete Product', 'Remove this product from your store? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!currentUser?.id) return;
          try {
            await marketplaceService.deleteProduct(productId, currentUser.id);
            setInventory((prev: Product[]) => prev.filter((p) => p.id !== productId));
            showToast('Product removed', 'success');
          } catch (e) {
            showToast('Failed to delete product', 'error');
          }
        },
      },
    ]);
  };

  const handleMarkShipped = async (orderId: string) => {
    if (!currentUser?.id || shipping) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setShipping(true);
    try {
      let lat = null,
        lng = null;
      try {
        const loc = await getCurrentLocation();
        if (loc) {
          lat = loc.lat;
          lng = loc.lng;
        }
      } catch (locErr) {
        const msg = locErr instanceof Error ? locErr.message : 'Location fetch failed';
        console.log('[Location] Optional fetch failed:', msg);
      }

      const res = await marketplaceService.shipOrder(orderId, currentUser.id, lat, lng);
      if (res.success) {
        if (res.dispatchedCount > 0) {
          showToast(`📡 Looking for ${res.dispatchedCount} nearby agent(s)...`, 'success');
        } else {
          showToast('No delivery agents nearby. Using self-delivery.', 'info');
        }
        loadData();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error updating order';
      showToast(msg, 'error');
    } finally {
      setShipping(false);
    }
  };

  const handleConfirmPickup = async (orderId: string) => {
    if (!currentUser?.id || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    try {
      const { success, status, delivery_pin, pickup_pin } = await marketplaceService.confirmPickup(
        orderId,
        currentUser.id
      );
      if (success) {
        if (status === 'SHIPPED') {
          showToast(`✅ Pickup confirmed! Code ${delivery_pin} sent to buyer.`, 'success');
          const ord = orders.find((x) => x.id === orderId);
          setShowShipSuccess({ ...ord, status: 'SHIPPED', delivery_pin });
        } else {
          if (pickup_pin) {
            showToast(`🔑 Handover PIN: ${pickup_pin}`, 'success');
          } else {
            showToast('Waiting for agent to enter PIN...', 'info');
          }
        }
        loadData();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Confirmation failed';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchRetry = async (orderId: string) => {
    if (!currentUser?.id || shipping) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShipping(true);
    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        showToast('Enable GPS to search for agents', 'error');
        return;
      }
      const res = await marketplaceService.shipOrder(orderId, currentUser.id, loc.lat, loc.lng);
      if (res.dispatchedCount > 0) {
        showToast(`📡 Dispatched to ${res.dispatchedCount} agents!`, 'success');
      } else {
        showToast('No agents found in 5km radius.', 'info');
      }
      loadData();
    } catch (e) {
      showToast('Dispatch failed', 'error');
    } finally {
      setShipping(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel and refund this order? This cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Refund',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await marketplaceService.cancelOrder(orderId, 'cancelled_by_merchant');
              if (res.success) {
                showToast('Order cancelled', 'success');
                loadData();
              } else {
                showToast(res.error || 'Failed to cancel', 'error');
              }
            } catch (e) {
              showToast('Error cancelling order', 'error');
            }
            setLoading(false);
          },
        },
      ]
    );
  };

  const handleSwitchSelfDelivery = (order: MarketplaceOrder) => {
    Alert.alert('Self-Delivery', 'Cancel the agent search and deliver this yourself?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Self-Deliver',
        onPress: async () => {
          if (!currentUser?.id) return;
          setLoading(true);
          try {
            await marketplaceService.selfDeliverOrder(order.id, currentUser.id);
            showToast('Switched to self-delivery', 'success');
            loadData();
          } catch (e) {
            showToast('Error updating order', 'error');
          }
          setLoading(false);
        },
      },
    ]);
  };

  const submitSelfDeliveryPin = async () => {
    if (!pinPromptOrder) return;
    if (pinInput.trim().length < 4) {
      showToast('Need 4 digit PIN', 'error');
      return;
    }
    setSubmittingPin(true);
    const { confirmDeliveryWithPin } = await import('../../../services/delivery.service');
    const { ok, error } = await confirmDeliveryWithPin(pinPromptOrder.id, pinInput.trim(), null);
    setSubmittingPin(false);

    if (!ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(error === 'invalid_pin' ? 'Invalid Delivery PIN' : `Failed: ${error}`, 'error');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Delivery Confirmed! Escrow released to your wallet.', 'success');
    setPinPromptOrder(null);
    setPinInput('');
    loadData();
  };

  const handleMessageBuyer = async (order: MarketplaceOrder) => {
    if (!currentUser?.id || !order.buyer_id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const [id1, id2] = [currentUser.id, order.buyer_id].sort();
    const threadId = `${id1}-${id2}`;

    try {
      const client = getClient();
      if (!client) throw new Error('Database client not initialized');
      const { data: existing } = await client
        .from('message_threads')
        .select('thread_id')
        .eq('thread_id', threadId)
        .maybeSingle();

      if (!existing) {
        const initMsg = `Regarding order: ${order.product_name}`;
        await createChatThread({
          thread_id: threadId,
          user_a_id: id1,
          user_b_id: id2,
          last_msg: initMsg,
        });

        await createChatMessage({
          thread_id: threadId,
          user_id: currentUser.id,
          content: initMsg,
        });
      }

      const buyerProfile = await fetchProfile(order.buyer_id);
      navigation.navigate('Chat', {
        threadId,
        recipientName: buyerProfile.data?.full_name || 'Customer',
        recipientId: order.buyer_id,
      });
    } catch (e) {
      console.error('Message error:', e);
      showToast('Could not open chat', 'error');
    }
  };

  const handleWithdraw = async () => {
    const currentBalance = useWalletStore.getState().balance || 0;
    if (currentBalance < 100) {
      showToast('Minimum withdrawal is ETB 100', 'warning');
      return;
    }

    // Dynamic bank details from merchant profile
    const bankName = currentUser?.merchant_details?.bank_name;
    const accountNum = currentUser?.merchant_details?.account_number;

    if (!bankName || !accountNum) {
      Alert.alert(
        'Missing Bank Details',
        'Please update your bank account information in your profile settings before withdrawing.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Request Payout',
      `Withdraw ETB ${currentBalance.toLocaleString()} to your ${bankName} account (${accountNum})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Withdrawal',
          onPress: async () => {
            if (!currentUser?.id) return;
            setWithdrawing(true);
            try {
              const res = await requestWithdrawal(
                currentUser.id,
                currentBalance,
                bankName,
                accountNum
              );

              if (res.data?.ok) {
                // Optimistically update or wait for refresh
                useWalletStore.getState().setBalance(res.data.new_balance);
                showToast('Withdrawal request submitted! Processing via Chapa gateway.', 'success');
                loadData();
              } else {
                showToast(res.error || 'Withdrawal failed', 'error');
              }
            } catch (e) {
              console.error('Withdrawal error:', e);
              showToast('Withdrawal failed', 'error');
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  return {
    handleSaveProduct,
    handleEditProduct,
    handleDeleteProduct,
    handleMarkShipped,
    handleConfirmPickup,
    handleDispatchRetry,
    handleCancelOrder,
    handleSwitchSelfDelivery,
    submitSelfDeliveryPin,
    handleMessageBuyer,
    handleWithdraw,
  };
}

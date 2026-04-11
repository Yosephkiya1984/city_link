import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../../navigation';
import { useAppStore } from '../../store/AppStore';
import { supabase, subscribeToTable, unsubscribe } from '../../services/supabase';
import { signOut } from '../../services/auth.service';
import { createChatThread, createChatMessage } from '../../services/chat.service';
import { fetchProfile } from '../../services/profile.service';
import {
  marketplaceService,
  fetchMarketplaceOrdersByMerchant,
  fetchMerchantInventory,
  insertProduct,
  deleteProduct,
  uploadProductImage,
} from '../../services/marketplace.service';
import { Modal, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { uid } from '../../utils';
import {
  findNearbyAgents,
  dispatchOrderToAgents,
  getCurrentLocation,
} from '../../services/delivery.service';

const { width } = Dimensions.get('window');

// â”€â”€â”€ Custom Premium Theme (Obsidian & Emerald) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const T = {
  bg: '#101319',
  surface: '#1d2025',
  surfaceLow: '#191c21',
  surfaceHigh: '#272a30',
  primary: '#59de9b',
  primaryDark: '#00a86b',
  secondary: '#ffd887',
  tertiary: '#ffb4aa',
  text: '#e1e2ea',
  textSub: '#869489',
  border: 'rgba(134,148,137,0.15)',
  green: '#34C759',
};

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ShopDashboardNavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  'MerchantDashboard'
>;

export default function ShopDashboard() {
  const navigation = useNavigation<ShopDashboardNavigationProp>();
  const currentUser = useAppStore((s) => s.currentUser);
  const balance = useAppStore((s) => s.balance); // reactive â€” not getState()
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: 'Electronics',
    stock: '10',
    description: '',
    condition: 'new',
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showShipSuccess, setShowShipSuccess] = useState(null);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [withdrawing, setWithdrawing] = useState(false);
  const [salesHistory, setSalesHistory] = useState({
    curve: [0, 0, 0, 0, 0, 0, 0],
    raw: [],
    labels: [],
  });
  const [openDisputes, setOpenDisputes] = useState([]);
  const [inventorySearch, setInventorySearch] = useState('');

  const [pinPromptOrder, setPinPromptOrder] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [submittingPin, setSubmittingPin] = useState(false);

  const businessName = currentUser?.business_name || currentUser?.full_name || 'Store Front';

  const loadData = React.useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);

    // Get wallet ID first
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', currentUser.id)
      .single();

    const [ordRes, invRes, txRes, salesRes, disputes] = await Promise.all([
      fetchMarketplaceOrdersByMerchant(currentUser.id),
      fetchMerchantInventory(currentUser.id),
      wallet ? marketplaceService.fetchWalletTransactions(wallet.id) : { data: [] },
      marketplaceService.getMerchantSalesHistory(currentUser.id),
      marketplaceService.getMerchantOpenDisputes(currentUser.id),
    ]);

    if (ordRes.data) setOrders(ordRes.data);
    if (invRes.data) setInventory(invRes.data);
    if (txRes.data) setWalletTransactions(txRes.data);
    if (salesRes) setSalesHistory(salesRes);
    if (disputes) setOpenDisputes(disputes);
    if (wallet) useAppStore.getState().setBalance(wallet.balance);

    setLoading(false);
    setRefreshing(false);
  }, [currentUser?.id]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Camera roll permissions are required to upload images!', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      setSelectedImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
    }
  };

  React.useEffect(() => {
    if (!currentUser?.id) return;
    loadData();
    // Subscribe to orders and products with unique session channels
    const chOrd = subscribeToTable(
      `merchant-orders-${Date.now()}`,
      'marketplace_orders',
      `merchant_id=eq.${currentUser.id}`,
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          setOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
          );
        } else if (payload.eventType === 'INSERT') {
          setOrders((prev) => [payload.new, ...prev]);
          loadData(); // Refresh analytics for new order
        }
      }
    );

    const chInv = subscribeToTable(
      `merchant-inventory-${Date.now()}`,
      'products',
      `merchant_id=eq.${currentUser.id}`,
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          setInventory((prev) =>
            prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
          );
        } else if (payload.eventType === 'INSERT') {
          setInventory((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setInventory((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
        loadData(); // Refresh metrics on product changes
      }
    );

    return () => {
      unsubscribe(chOrd);
      unsubscribe(chInv);
    };
  }, [loadData, currentUser?.id]);

  const handleSaveProduct = async () => {
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
      // Update
      const { error } = await marketplaceService.updateProduct(editingProduct.id, {
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
      // Create
      const productData = {
        id: uid(),
        merchant_id: currentUser.id,
        name: newProduct.name,
        title: newProduct.name,
        price: priceVal,
        category: newProduct.category,
        stock: stockVal,
        description: newProduct.description,
        status: 'active',
        condition: newProduct.condition,
        image_url: finalImageUrl,
        images_json: [],
      };
      const res = await insertProduct(productData);
      if (res.error) showToast('Failed to list product', 'error');
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

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: String(product.price),
      category: product.category,
      stock: String(product.stock),
      description: product.description,
      condition: product.condition || 'new',
    });
    setSelectedImage(null); // Keep existing unless changed
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId) => {
    Alert.alert('Delete Product', 'Remove this product from your store? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await marketplaceService.deleteProduct(productId);
            setInventory((prev) => prev.filter((p) => p.id !== productId));
            showToast('Product removed', 'success');
          } catch (e) {
            showToast('Failed to delete product', 'error');
          }
        },
      },
    ]);
  };

  const handleMarkShipped = async (orderId) => {
    if (shipping) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setShipping(true);
    try {
      // 1. Attempt to get location for dispatching
      let lat = null,
        lng = null;
      try {
        const loc = await getCurrentLocation();
        if (loc) {
          lat = loc.lat;
          lng = loc.lng;
        }
      } catch (locErr) {
        console.log('[Location] Optional location fetch failed:', locErr.message);
      }

      // 2. Call atomic dispatchOrder service (starts finding driver, doesn't generate PIN yet)
      const res = await marketplaceService.shipOrder(orderId, currentUser.id, lat, lng);

      if (res.success) {
        if (res.dispatchedCount > 0) {
          showToast(`📡 Looking for ${res.dispatchedCount} nearby agent(s)...`, 'success');
        } else {
          showToast('No delivery agents nearby. Using self-delivery.', 'info');
        }
        loadData(); // Refresh list to show DISPATCHING status
      }
    } catch (e) {
      showToast(e.message || 'Error updating order', 'error');
    } finally {
      setShipping(false);
    }
  };

  const handleConfirmPickup = async (orderId) => {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    try {
      const { success, status, delivery_pin } = await marketplaceService.confirmPickup(
        orderId,
        currentUser.id
      );
      if (success) {
        if (status === 'SHIPPED') {
          showToast(`âœ… Pickup confirmed! Code ${delivery_pin} sent to buyer.`, 'success');
          // Show success modal for PIN
          const ord = orders.find((x) => x.id === orderId);
          setShowShipSuccess({ ...ord, status: 'SHIPPED', delivery_pin });
        } else {
          showToast('Handover recorded. Waiting for agent confirmation...', 'info');
        }
        loadData();
      }
    } catch (e) {
      showToast(e.message || 'Confirmation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchRetry = async (orderId) => {
    if (shipping) return;
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

  const handleCancelOrder = async (orderId) => {
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

  const handleSwitchSelfDelivery = async (order) => {
    Alert.alert('Self-Delivery', 'Cancel the agent search and deliver this yourself?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Self-Deliver',
        onPress: async () => {
          setLoading(true);
          try {
            // Use supabase direct queries to bypass RPC for simple updates
            await supabase
              .from('delivery_dispatches')
              .update({ status: 'SUPERSEDED' })
              .eq('order_id', order.id);
            await supabase
              .from('marketplace_orders')
              .update({ status: 'SHIPPED', dispatch_expires_at: null })
              .eq('id', order.id);
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
    const { confirmDeliveryWithPin } = require('../../services/delivery.service');
    const { ok, error } = await confirmDeliveryWithPin(
      pinPromptOrder.id,
      pinInput.trim(),
      null,
      currentUser.id
    );
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

  const handleMessageBuyer = async (order) => {
    if (!order.buyer_id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const [id1, id2] = [currentUser.id, order.buyer_id].sort();
    const threadId = `${id1}-${id2}`;

    try {
      // Find or create thread
      const { data: existing } = await supabase
        .from('message_threads')
        .select('thread_id')
        .eq('thread_id', threadId)
        .maybeSingle();

      if (!existing) {
        // Get buyer name for the thread metadata
        const { data: profile } = await fetchProfile(order.buyer_id);
        const buyerName = profile?.full_name || 'Customer';

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
    const currentBalance = useAppStore.getState().balance || 0;
    if (currentBalance < 100) {
      showToast('Minimum withdrawal is ETB 100', 'warning');
      return;
    }

    Alert.alert(
      'Simulated Withdrawal',
      `Withdraw ETB ${currentBalance.toLocaleString()} to your linked CBE account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setWithdrawing(true);
            try {
              // Simulate API delay
              await new Promise((resolve) => setTimeout(resolve, 2000));

              const { data: wallet } = await supabase
                .from('wallets')
                .select('id')
                .eq('user_id', currentUser.id)
                .single();
              if (wallet) {
                const txId = uid();
                // Record local debit for ledger
                await supabase.from('transactions').insert({
                  id: txId,
                  wallet_id: wallet.id,
                  amount: currentBalance,
                  type: 'debit',
                  category: 'withdrawal',
                  description: 'Bank Payout (CBE Bank)',
                  created_at: new Date().toISOString(),
                });

                // Update wallet balance in DB
                const { error: balErr } = await supabase
                  .from('wallets')
                  .update({ balance: 0 })
                  .eq('id', wallet.id);

                if (balErr) throw balErr;

                useAppStore.getState().setBalance(0);
                showToast('Withdrawal successful! Funds will arrive in 24h.', 'success');
                loadData(); // Refresh the list
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

  // â”€â”€â”€ Tab 1: Overview (Mobile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderOverview = () => {
    const revenueStatuses = ['PAID', 'SHIPPED', 'COMPLETED'];
    const totalRev = orders
      .filter((o) => revenueStatuses.includes(o.status))
      .reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    const activeOrd = orders.filter((o) =>
      ['PAID', 'SHIPPED', 'DISPATCHING', 'AGENT_ASSIGNED', 'IN_TRANSIT', 'AWAITING_PIN'].includes(
        o.status
      )
    ).length;
    const inventoryCount = inventory.length;
    const lowStockCount = inventory.filter((p) => p.stock <= 5).length;

    // Sales tendency calculation (from live analytics)
    const salesCurve = salesHistory.curve;

    return (
      <View style={styles.tabContent}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.pageTitle}>Dashboard</Text>
            <Text style={styles.pageSubtitle}>Sales analytics overview</Text>
          </View>
          <TouchableOpacity
            style={styles.iconButtonOutlined}
            onPress={() => showToast('Report downloaded to device', 'success')}
          >
            <Ionicons name="download-outline" size={20} color={T.text} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid - 2x2 for Mobile */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: T.primary + '20' }]}>
              <Ionicons name="wallet-outline" size={16} color={T.primary} />
            </View>
            <Text style={styles.statValue}>ETB {totalRev.toLocaleString()}</Text>
            <Text style={styles.statLabel}>REVENUE</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: T.secondary + '20' }]}>
              <Ionicons name="cube-outline" size={16} color={T.secondary} />
            </View>
            <Text style={styles.statValue}>{orders.length}</Text>
            <Text style={styles.statLabel}>TOTAL ORDERS</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: T.tertiary + '20' }]}>
              <Ionicons name="hourglass-outline" size={16} color={T.tertiary} />
            </View>
            <Text style={styles.statValue}>{activeOrd}</Text>
            <Text style={styles.statLabel}>ACTIVE</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#06b6d4' + '20' }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#06b6d4" />
            </View>
            <Text style={styles.statValue}>{lowStockCount}</Text>
            <Text style={styles.statLabel}>LOW STOCK</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>Sales Trend</Text>
            <Text style={styles.pageSubtitle}>Daily volume for last 7 days</Text>
          </View>
          <View style={styles.chartGraphArea}>
            <View style={styles.chartBars}>
              {salesCurve.map((val, i) => {
                const dateStr = salesHistory.labels[i] || '';
                const dayLabel = dateStr
                  ? new Date(dateStr).toLocaleDateString([], { weekday: 'short' })
                  : '';
                return (
                  <View key={i} style={styles.chartCol}>
                    <View
                      style={[
                        styles.chartBarLine,
                        {
                          height: `${Math.max(val * 100, 8)}%`,
                          backgroundColor: val > 0.5 ? T.primary : T.primary + '80',
                          borderRadius: 4,
                        },
                      ]}
                    />
                    <Text style={styles.chartDayLabel}>{dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.topSellingContainer}>
          <Text style={styles.cardTitle}>Top Products</Text>
          <View style={styles.topSellingList}>
            {inventory.slice(0, 3).map((item, i) => (
              <View key={i} style={styles.topSellingItem}>
                <Image source={{ uri: item.image_url }} style={styles.tsImage} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tsName}>{item.name}</Text>
                  <Text style={styles.tsSales}>
                    {item.stock} in stock â€¢ {item.category}
                  </Text>
                </View>
                <Text style={styles.tsPrice}>ETB {item.price.toLocaleString()}</Text>
              </View>
            ))}
            {inventory.length === 0 && (
              <Text style={{ color: T.textSub, textAlign: 'center' }}>No products listed</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setCurrentUser(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  // â”€â”€â”€ Tab 2: Inventory (Mobile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderInventory = () => (
    <View style={styles.tabContent}>
      <View style={styles.headerTitleRow}>
        <View>
          <Text style={styles.pageTitle}>Inventory</Text>
          <Text style={styles.pageSubtitle}>Manage product catalogue</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryButtonSolid}
          onPress={() => setShowProductModal(true)}
        >
          <Ionicons name="add" size={16} color={T.bg} />
          <Text style={styles.btnTextThick}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Bar â€” wired to inventorySearch state */}
      <View style={styles.filterRowMobile}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={T.textSub} />
          <TextInput
            placeholder="Search products..."
            placeholderTextColor={T.textSub}
            style={styles.searchInput}
            value={inventorySearch}
            onChangeText={setInventorySearch}
          />
        </View>
        {inventorySearch.length > 0 && (
          <TouchableOpacity
            style={styles.iconButtonOutlined}
            onPress={() => setInventorySearch('')}
          >
            <Ionicons name="close" size={20} color={T.textSub} />
          </TouchableOpacity>
        )}
      </View>

      {/* Card-Based Inventory List â€” filtered by search */}
      <View style={{ gap: 12 }}>
        {inventory.filter(
          (p) => !inventorySearch || p.name?.toLowerCase().includes(inventorySearch.toLowerCase())
        ).length === 0 &&
          !loading && (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Ionicons name="cube-outline" size={48} color={T.border} />
              <Text style={{ color: T.textSub, marginTop: 12 }}>
                {inventorySearch ? 'No matching products' : 'No products in stock'}
              </Text>
            </View>
          )}
        {inventory
          .filter(
            (p) => !inventorySearch || p.name?.toLowerCase().includes(inventorySearch.toLowerCase())
          )
          .map((p) => {
            const isLow = (p.stock || 0) < 15;
            const barColor = p.stock === 0 ? T.tertiary : isLow ? T.secondary : T.primary;
            const maxStock = p.max_stock || 100;
            const imgUri = p.image_url || p.image || (p.images_json && p.images_json[0]);
            return (
              <View key={p.id} style={styles.productMobileCard}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.productMobileImg, { overflow: 'hidden' }]}>
                    {imgUri ? (
                      <Image source={{ uri: imgUri }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="cube" size={24} color={T.primary} />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={styles.tsName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 4,
                      }}
                    >
                      <Text style={styles.tableSku}>ID: {p.id.slice(0, 8)}</Text>
                      <Text style={styles.tsPrice}>ETB {p.price}</Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>
                      {p.category?.toUpperCase() || 'GENERAL'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtnSmall}
                    onPress={() => handleEditProduct(p)}
                  >
                    <Ionicons name="create-outline" size={14} color={T.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteBtnSmall, { marginLeft: 8 }]}
                    onPress={() => handleDeleteProduct(p.id)}
                  >
                    <Ionicons name="trash-outline" size={14} color={T.tertiary} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.stockText}>
                    <Text style={{ color: p.stock > 0 ? T.text : T.tertiary }}>{p.stock || 0}</Text>
                    /{maxStock}
                  </Text>
                  <View style={styles.stockBarBgMob}>
                    <View
                      style={[
                        styles.stockBarFill,
                        {
                          width: `${((p.stock || 0) / maxStock) * 100}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
      </View>
    </View>
  );

  // â”€â”€â”€ Tab 3: Orders (Mobile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderOrders = () => (
    <View style={styles.tabContent}>
      <View style={styles.headerTitleRow}>
        <View>
          <Text style={styles.pageTitle}>Orders</Text>
          <Text style={styles.pageSubtitle}>
            {
              orders.filter((o) =>
                [
                  'PAID',
                  'SHIPPED',
                  'DISPATCHING',
                  'AGENT_ASSIGNED',
                  'IN_TRANSIT',
                  'AWAITING_PIN',
                ].includes(o.status)
              ).length
            }{' '}
            active shipments
          </Text>
        </View>
      </View>

      {/* Real Dispute Alert â€” only show when there are open disputes */}
      {openDisputes.length > 0 && (
        <View style={styles.alertBanner}>
          <View style={styles.alertIconBox}>
            <Ionicons name="warning" size={16} color={T.tertiary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>
              {openDisputes.length} Open Dispute{openDisputes.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.alertSub}>
              {openDisputes[0]?.reason || 'Needs resolution within 24h.'}
            </Text>
          </View>
        </View>
      )}

      {/* Feed */}
      <View style={{ gap: 16 }}>
        {orders.length === 0 && !loading && (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Ionicons name="cart-outline" size={48} color={T.border} />
            <Text style={{ color: T.textSub, marginTop: 12 }}>No orders yet</Text>
          </View>
        )}
        {orders.map((o) => (
          <View key={o.id} style={styles.orderMobileCard}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.ocId}>{o.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.ocTimeTxtMobile}>
                  {' '}
                  â€¢{' '}
                  {new Date(o.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.ocStatusBadge,
                  {
                    backgroundColor:
                      o.status === 'PAID'
                        ? T.primaryDark + '30'
                        : [
                              'SHIPPED',
                              'DISPATCHING',
                              'AGENT_ASSIGNED',
                              'IN_TRANSIT',
                              'AWAITING_PIN',
                            ].includes(o.status)
                          ? T.secondary + '30'
                          : o.status === 'COMPLETED'
                            ? T.primary + '30'
                            : o.status === 'DISPUTED'
                              ? T.tertiary + '30'
                              : T.surfaceHigh,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.ocStatusTxt,
                    {
                      color:
                        o.status === 'PAID'
                          ? T.primary
                          : [
                                'SHIPPED',
                                'DISPATCHING',
                                'AGENT_ASSIGNED',
                                'IN_TRANSIT',
                                'AWAITING_PIN',
                              ].includes(o.status)
                            ? T.secondary
                            : o.status === 'COMPLETED'
                              ? T.primary
                              : o.status === 'DISPUTED'
                                ? T.tertiary
                                : T.textSub,
                    },
                  ]}
                >
                  {o.status.replace('_', ' ')}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <View
                style={[styles.ocImgMobile, { alignItems: 'center', justifyContent: 'center' }]}
              >
                <Ionicons name="cube" size={24} color={T.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ocProdName}>{o.product_name}</Text>
                <Text style={styles.ocProdDetail} numberOfLines={1}>
                  Quantity: {o.quantity || o.qty || 1}
                </Text>
                <Text style={styles.ocBigAmountMobile}>
                  ETB {Number(o.total)?.toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.ocDivider} />

            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ocTinyLabel}>SHIPPING ADDRESS</Text>
                <Text style={styles.ocAddressTxt}>{o.shipping_address || 'Standard Delivery'}</Text>
              </View>
              <View
                style={{ flex: 1, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: T.border }}
              >
                <Text style={styles.ocTinyLabel}>
                  {[
                    'SHIPPED',
                    'DISPATCHING',
                    'AGENT_ASSIGNED',
                    'IN_TRANSIT',
                    'AWAITING_PIN',
                  ].includes(o.status)
                    ? 'DELIVERY PIN'
                    : 'ESCROW STATUS'}
                </Text>
                {[
                  'SHIPPED',
                  'DISPATCHING',
                  'AGENT_ASSIGNED',
                  'IN_TRANSIT',
                  'AWAITING_PIN',
                ].includes(o.status) ? (
                  <View style={styles.ocPinBoxMobile}>
                    <Text style={styles.ocPinTxt}>{o.delivery_pin}</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons
                      name={o.status === 'COMPLETED' ? 'checkmark-circle' : 'lock-closed'}
                      size={14}
                      color={o.status === 'COMPLETED' ? T.primary : T.secondary}
                    />
                    <Text
                      style={[styles.ocLockTxt, o.status === 'COMPLETED' && { color: T.primary }]}
                    >
                      {o.status === 'COMPLETED' ? 'Released' : 'Funds Secured'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
              {o.status === 'PAID' ? (
                <TouchableOpacity
                  style={[styles.ocBtnMobile, { backgroundColor: T.primaryDark, flex: 2 }]}
                  onPress={() => handleMarkShipped(o.id)}
                >
                  <Ionicons name="cube-outline" size={16} color={T.bg} style={{ marginRight: 6 }} />
                  <Text style={[styles.ocBtnTxt, { color: T.bg }]}>Mark Shipped</Text>
                </TouchableOpacity>
              ) : o.status === 'DISPATCHING' ? (
                <View style={{ flexDirection: 'row', gap: 8, flex: 2 }}>
                  <TouchableOpacity
                    style={[styles.ocBtnMobile, { backgroundColor: T.surfaceHigh, flex: 1.2 }]}
                    disabled
                  >
                    <ActivityIndicator size="small" color={T.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.ocBtnTxt, { color: T.textSub }]}>Finding Driver...</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.ocBtnMobile,
                      {
                        backgroundColor: T.surfaceHigh,
                        flex: 1,
                        borderColor: T.border,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleSwitchSelfDelivery(o)}
                  >
                    <Text style={[styles.ocBtnTxt, { color: T.text }]}>Self-Deliver</Text>
                  </TouchableOpacity>
                </View>
              ) : o.status === 'SHIPPED' ? (
                <View style={{ flex: 2, gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.ocBtnMobile, { backgroundColor: T.green }]}
                    onPress={() => {
                      setPinInput('');
                      setPinPromptOrder(o);
                    }}
                  >
                    <Ionicons
                      name="checkmark-done"
                      size={14}
                      color="#000"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.ocBtnTxt, { color: '#000' }]}>
                      Complete Delivery (PIN)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.ocBtnMobile,
                      {
                        backgroundColor: T.surfaceHigh,
                        borderColor: T.primary + '30',
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleDispatchRetry(o.id)}
                  >
                    <Ionicons
                      name="bicycle-outline"
                      size={14}
                      color={T.primary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.ocBtnTxt, { color: T.primary, fontSize: 11 }]}>
                      Search for Drivers
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : o.status === 'AGENT_ASSIGNED' ? (
                <View style={{ flex: 2, gap: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.ocBtnMobile,
                      { backgroundColor: o.merchant_confirmed_pickup ? T.surfaceHigh : T.primary },
                    ]}
                    onPress={() => handleConfirmPickup(o.id)}
                    disabled={o.merchant_confirmed_pickup}
                  >
                    <Ionicons
                      name={o.merchant_confirmed_pickup ? 'time-outline' : 'hand-right-outline'}
                      size={16}
                      color={o.merchant_confirmed_pickup ? T.textSub : T.bg}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.ocBtnTxt,
                        { color: o.merchant_confirmed_pickup ? T.textSub : T.bg },
                      ]}
                    >
                      {o.merchant_confirmed_pickup ? 'Awaiting Agent...' : 'Confirm Handover'}
                    </Text>
                  </TouchableOpacity>
                  {o.agent_confirmed_pickup && !o.merchant_confirmed_pickup && (
                    <Text
                      style={{
                        fontSize: 10,
                        color: T.primary,
                        textAlign: 'center',
                        fontWeight: '800',
                      }}
                    >
                      AGENT HAS CONFIRMED PICKUP
                    </Text>
                  )}
                </View>
              ) : ['IN_TRANSIT', 'AWAITING_PIN'].includes(o.status) ? (
                <TouchableOpacity
                  style={[styles.ocBtnMobile, { backgroundColor: T.surfaceHigh, flex: 2 }]}
                  disabled
                >
                  <Text style={[styles.ocBtnTxt, { color: T.textSub }]}>
                    {o.status === 'AWAITING_PIN'
                      ? 'Driver Arrived (Awaiting PIN)'
                      : 'Driver on Route to Buyer'}
                  </Text>
                </TouchableOpacity>
              ) : o.status === 'DISPUTED' ? (
                <TouchableOpacity
                  style={[styles.ocBtnMobile, { backgroundColor: T.tertiary + '30', flex: 2 }]}
                  disabled
                >
                  <Text style={[styles.ocBtnTxt, { color: T.tertiary }]}>Disputed</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.ocBtnMobile, { backgroundColor: T.surfaceHigh, flex: 2 }]}
                  disabled
                >
                  <Text style={[styles.ocBtnTxt, { color: T.primary }]}>Completed</Text>
                </TouchableOpacity>
              )}
              {o.status === 'PAID' && (
                <TouchableOpacity
                  style={[styles.ocBtnMobileOutlined, { flex: 1, borderColor: T.tertiary + '80' }]}
                  onPress={() => handleCancelOrder(o.id)}
                >
                  <Text style={[styles.ocBtnOutlinedTxtMobile, { color: T.tertiary }]}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.ocBtnMobileOutlined, { flex: 1, borderColor: T.primary + '50' }]}
                onPress={() => handleMessageBuyer(o)}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={14}
                  color={T.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.ocBtnOutlinedTxtMobile, { color: T.primary }]}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ocBtnMobileOutlined, { flex: 1 }]}>
                <Text style={styles.ocBtnOutlinedTxtMobile}>Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  // â”€â”€â”€ Tab 4: Finance (Mobile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderFinance = () => (
    <View style={styles.tabContent}>
      <View style={styles.headerTitleRow}>
        <View>
          <Text style={styles.pageTitle}>Finance</Text>
          <Text style={styles.pageSubtitle}>Available balance</Text>
        </View>
      </View>

      <View style={styles.financeHeroMobile}>
        <Text style={styles.fhLabel}>TOTAL EARNINGS</Text>
        <Text style={styles.fhAmountMobile}>ETB {(balance || 0).toLocaleString()}</Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <View style={styles.fhTrend}>
            <Ionicons name="trending-up" size={14} color={T.primaryDark} />
            <Text style={styles.fhTrendTxt}>+Syncing...</Text>
          </View>
          <TouchableOpacity
            style={[styles.fhWithdrawBtn, withdrawing && { opacity: 0.7 }]}
            onPress={handleWithdraw}
            disabled={withdrawing}
          >
            <Text style={styles.fhWithdrawTxt}>{withdrawing ? '...' : 'Withdraw'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.cardTitle, { marginTop: 24, marginBottom: 16 }]}>Ledger History</Text>

      <View style={styles.txListMobile}>
        {walletTransactions.map((tx) => (
          <View key={tx.id} style={styles.txItemMobile}>
            <View style={styles.txIconBoxMobile}>
              <Ionicons
                name={tx.type === 'debit' ? 'arrow-down-outline' : 'arrow-up-outline'}
                size={16}
                color={tx.type === 'debit' ? T.tertiary : T.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tableName}>{tx.description}</Text>
              <Text style={styles.txDateTxt}>
                {new Date(tx.created_at).toLocaleDateString()} â€¢ {tx.category}
              </Text>
            </View>
            <Text style={[styles.tablePrice, { color: tx.type === 'credit' ? T.primary : T.text }]}>
              {tx.type === 'debit' ? '-' : '+'}ETB {Number(tx.amount).toLocaleString()}
            </Text>
          </View>
        ))}
        {walletTransactions.length === 0 && (
          <Text style={{ color: T.textSub, textAlign: 'center', padding: 20 }}>
            No transaction history
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* â”€â”€â”€ Mobile Navbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={styles.navBarMobile}>
        <View style={styles.brandBoxMobile}>
          <View style={styles.brandIconMobile}>
            <Ionicons name="storefront" size={18} color={T.primary} />
          </View>
          <View>
            <Text style={styles.brandNameMobile}>{businessName}</Text>
            <Text style={styles.brandSubtitleMobile}>VERIFIED MERCHANT</Text>
          </View>
        </View>
        <View style={styles.navRight}>
          <TouchableOpacity
            style={styles.navIconBtn}
            onPress={() => navigation.navigate('ChatInbox')}
          >
            <Ionicons name="chatbubbles-outline" size={24} color={T.textSub} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navIconBtn}>
            <Ionicons name="notifications-outline" size={24} color={T.textSub} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBoxMobile} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={T.tertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* â”€â”€â”€ Scrollable Custom Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={styles.tabScrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroller}
        >
          {[
            { id: 'overview', icon: 'grid', label: 'Overview' },
            { id: 'inventory', icon: 'file-tray-stacked', label: 'Inventory' },
            { id: 'orders', icon: 'cart', label: 'Orders' },
            { id: 'finance', icon: 'cash', label: 'Finance' },
          ].map((link) => {
            const active = activeTab === link.id;
            return (
              <TouchableOpacity
                key={link.id}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => setActiveTab(link.id)}
              >
                <Ionicons
                  name={(active ? link.icon : `${link.icon}-outline`) as any}
                  size={16}
                  color={active ? T.primary : T.textSub}
                />
                <Text style={[styles.tabItemTxt, active && styles.tabItemTxtActive]}>
                  {link.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* â”€â”€â”€ Main View â€” with pull-to-refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <ScrollView
        style={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={T.primary}
          />
        }
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'inventory' && renderInventory()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'finance' && renderFinance()}
      </ScrollView>

      {/* Product Detail Modal (Add/Edit) */}
      <Modal visible={showProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
              <TouchableOpacity
                onPress={() => {
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
                }}
              >
                <Ionicons name="close" size={24} color={T.text} />
              </TouchableOpacity>
            </View>

            {/* Image Picker Section */}
            <View style={styles.imagePickerContainer}>
              {selectedImage || editingProduct?.image_url ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: selectedImage?.uri || editingProduct?.image_url }}
                    style={styles.imagePreview}
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Ionicons name="camera-outline" size={24} color={T.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imagePickerBtn}
                  onPress={pickImage}
                  activeOpacity={0.7}
                >
                  <View style={styles.imageIconCircle}>
                    <Ionicons name="camera-outline" size={32} color={T.primary} />
                  </View>
                  <Text style={styles.imagePickerTxt}>Add Product Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Product Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Galaxy S24, Premium Leather Bag..."
                placeholderTextColor={T.textSub}
                value={newProduct.name}
                onChangeText={(t) => setNewProduct((p) => ({ ...p, name: t }))}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Price (ETB)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="2500"
                  placeholderTextColor={T.textSub}
                  value={newProduct.price}
                  onChangeText={(t) => setNewProduct((p) => ({ ...p, price: t }))}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Initial Stock</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="50"
                  placeholderTextColor={T.textSub}
                  value={newProduct.stock}
                  onChangeText={(t) => setNewProduct((p) => ({ ...p, stock: t }))}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Product details, specs, features..."
                placeholderTextColor={T.textSub}
                multiline
                value={newProduct.description}
                onChangeText={(t) => setNewProduct((p) => ({ ...p, description: t }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {['Electronics', 'Fashion', 'Home', 'Beauty'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.smallBadge,
                      newProduct.category === c && { backgroundColor: T.primary },
                    ]}
                    onPress={() => setNewProduct((p) => ({ ...p, category: c }))}
                  >
                    <Text
                      style={[styles.smallBadgeText, newProduct.category === c && { color: T.bg }]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Condition</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {['new', 'like-new', 'good', 'fair'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.smallBadge,
                      newProduct.condition === c && { backgroundColor: T.primary },
                    ]}
                    onPress={() => setNewProduct((p) => ({ ...p, condition: c }))}
                  >
                    <Text
                      style={[styles.smallBadgeText, newProduct.condition === c && { color: T.bg }]}
                    >
                      {c.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (uploading || (!selectedImage && !editingProduct)) && { opacity: 0.7 },
              ]}
              onPress={handleSaveProduct}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={T.bg} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {editingProduct ? 'Save Changes' : 'List Product'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Shipment Success Modal */}
      <Modal visible={!!showShipSuccess} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center', paddingVertical: 40 }]}>
            <View style={[styles.successCirc, { backgroundColor: T.primary + '20' }]}>
              <Ionicons name="checkmark-circle" size={64} color={T.primary} />
            </View>
            <Text style={[styles.modalTitle, { marginTop: 24 }]}>Shipment Confirmed!</Text>
            <Text
              style={[
                styles.pageSubtitle,
                { textAlign: 'center', marginHorizontal: 20, marginTop: 8 },
              ]}
            >
              Share this 6-digit delivery PIN with the buyer to release escrow funds upon delivery.
            </Text>

            <View style={styles.pinDisplayCard}>
              <Text style={styles.pinTextLarge}>{showShipSuccess?.delivery_pin}</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { width: '100%', marginTop: 32 }]}
              onPress={() => setShowShipSuccess(null)}
            >
              <Text style={styles.submitBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Image Upload Styles
  imagePickerContainer: { marginBottom: 20, alignItems: 'center' },
  imagePickerBtn: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    backgroundColor: T.surfaceHigh,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: T.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  imagePickerTxt: { color: T.textSub, fontSize: 13, fontWeight: '500' },
  imagePreviewContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: T.surfaceHigh,
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: T.bg + 'CC',
    borderRadius: 12,
  },

  // Global Mobile Overrides
  container: { flex: 1, backgroundColor: T.bg },

  // Mobile Navbar
  navBarMobile: {
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: T.surfaceLow,
    paddingTop: 10,
  },
  brandBoxMobile: { flexDirection: 'row', alignItems: 'center' },
  brandIconMobile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  brandNameMobile: { color: T.primary, fontSize: 16, fontWeight: '700' },
  brandSubtitleMobile: {
    color: T.textSub,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navIconBtn: { padding: 4, position: 'relative' },
  notifDot: {
    width: 8,
    height: 8,
    backgroundColor: T.secondary,
    borderRadius: 4,
    position: 'absolute',
    top: 4,
    right: 4,
  },
  avatarBoxMobile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scrollable Mobile Tabs
  tabScrollWrap: {
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.surfaceLow,
  },
  tabScroller: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: T.surface,
  },
  tabItemActive: { backgroundColor: T.primary + '20' },
  tabItemTxt: { color: T.textSub, fontSize: 13, fontWeight: '600', marginLeft: 8 },
  tabItemTxtActive: { color: T.primary, fontWeight: '700' },

  // Content Area
  mainScroll: { flex: 1 },
  tabContent: { padding: 20, paddingBottom: 100 },

  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  pageTitle: { fontSize: 28, fontWeight: '700', color: T.text },
  pageSubtitle: { fontSize: 13, color: T.textSub, marginTop: 4 },
  primaryButtonSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  iconButtonOutlined: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextThick: { fontSize: 13, fontWeight: '700', marginLeft: 6, color: T.bg },

  cardTitle: { fontSize: 16, color: T.text, fontWeight: '700' },

  // Tab 1: Overview (Mobile)
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 16,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: T.text, marginBottom: 2 },
  statLabel: { fontSize: 11, color: T.textSub, fontWeight: '600' },

  chartContainer: {
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  chartHeader: { marginBottom: 16 },
  chartGraphArea: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: T.border,
    padding: 8,
  },
  chartBars: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', height: 120 },
  chartCol: {
    width: 1,
    backgroundColor: 'transparent',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartBarLine: { width: 2, backgroundColor: T.primary, position: 'absolute', bottom: 0 },
  chartDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.primary,
    position: 'absolute',
  },
  chartDayLabel: {
    color: T.textSub,
    fontSize: 8,
    marginTop: 8,
    textTransform: 'uppercase',
    position: 'absolute',
    bottom: -20,
  },

  topSellingContainer: {
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 16,
  },
  topSellingList: { marginTop: 16, gap: 16 },
  topSellingItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tsImage: { width: 44, height: 44, borderRadius: 8, backgroundColor: T.surfaceHigh },
  tsName: { fontSize: 13, fontWeight: '700', color: T.text },
  tsSales: { fontSize: 11, color: T.textSub, marginTop: 4 },
  tsPrice: { fontSize: 13, color: T.primary, fontWeight: '700', fontFamily: 'monospace' },

  // Tab 2: Inventory (Mobile)
  filterRowMobile: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surfaceLow,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  searchInput: { flex: 1, marginLeft: 8, height: 40, color: T.text, fontSize: 13 },

  productMobileCard: {
    backgroundColor: T.surfaceLow,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  productMobileImg: { width: 56, height: 56, borderRadius: 8, backgroundColor: T.surfaceHigh },
  tableSku: { fontSize: 11, color: T.textSub },
  catBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: T.primary + '15',
  },
  catBadgeText: { fontSize: 9, color: T.primary, fontWeight: '700', letterSpacing: 0.5 },
  stockBarBgMob: {
    width: 60,
    height: 6,
    backgroundColor: T.surfaceHigh,
    borderRadius: 3,
    overflow: 'hidden',
    marginLeft: 8,
  },
  stockBarFill: { height: '100%', borderRadius: 3 },
  stockText: { fontSize: 11, color: T.textSub, fontWeight: '600' },

  // Tab 3: Orders (Mobile)
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.tertiary + '15',
    borderWidth: 1,
    borderColor: T.tertiary + '30',
    borderLeftWidth: 4,
    borderLeftColor: T.tertiary,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  alertIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.tertiary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertTitle: { fontSize: 13, fontWeight: '700', color: T.tertiary, marginBottom: 2 },
  alertSub: { fontSize: 11, color: T.tertiary, opacity: 0.8 },

  orderMobileCard: {
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 16,
  },
  ocId: { fontSize: 12, color: T.text, fontFamily: 'monospace', fontWeight: '700' },
  ocTimeTxtMobile: { fontSize: 11, color: T.textSub },
  ocStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  ocStatusTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  ocImgMobile: { width: 48, height: 48, borderRadius: 8, backgroundColor: T.surfaceHigh },
  ocProdName: { fontSize: 13, fontWeight: '700', color: T.text },
  ocProdDetail: { fontSize: 11, color: T.textSub, marginTop: 2, fontStyle: 'italic' },
  ocBigAmountMobile: { fontSize: 16, fontWeight: '700', color: T.primary, marginTop: 4 },

  ocDivider: { height: 1, backgroundColor: T.border, marginVertical: 16 },

  ocTinyLabel: {
    fontSize: 9,
    color: T.textSub,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  ocBuyerName: { fontSize: 12, fontWeight: '700', color: T.text },
  ocAddressTxt: { fontSize: 11, color: T.textSub, marginTop: 2 },

  ocPinBoxMobile: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.primary + '30',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  ocPinTxt: { color: T.primary, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  ocLockTxt: { color: T.secondary, fontSize: 12, fontWeight: '600', marginLeft: 4 },

  ocBtnMobile: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ocBtnTxt: { color: T.bg, fontSize: 13, fontWeight: '700' },
  ocBtnMobileOutlined: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  ocBtnOutlinedTxtMobile: { color: T.textSub, fontSize: 13, fontWeight: '600' },

  // Tab 4: Finance (Mobile)
  financeHeroMobile: {
    backgroundColor: T.primaryDark,
    borderRadius: 12,
    padding: 20,
    overflow: 'hidden',
  },
  fhLabel: { fontSize: 10, color: T.bg, opacity: 0.7, fontWeight: '700', letterSpacing: 1 },
  fhAmountMobile: { fontSize: 32, color: T.bg, fontWeight: '700', marginVertical: 8 },
  fhTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fhTrendTxt: { color: T.bg, fontSize: 11, fontWeight: '600', marginLeft: 6 },
  fhWithdrawBtn: {
    backgroundColor: T.bg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  fhWithdrawTxt: { color: T.primaryDark, fontSize: 12, fontWeight: '700' },

  txListMobile: {
    backgroundColor: T.surfaceLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    gap: 16,
  },
  txItemMobile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIconBoxMobile: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: T.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableName: { fontSize: 13, fontWeight: '700', color: T.text },
  txDateTxt: { fontSize: 11, color: T.textSub, marginTop: 4 },
  tablePrice: { fontSize: 13, color: T.text, fontWeight: '700' },

  // New Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: T.surfaceLow,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: T.text },
  formGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 12,
    color: T.textSub,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalInput: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    color: T.text,
    fontSize: 15,
  },
  smallBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.surfaceHigh,
  },
  smallBadgeText: { fontSize: 12, color: T.text, fontWeight: '600' },
  submitBtn: {
    backgroundColor: T.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: { color: T.bg, fontSize: 16, fontWeight: '700' },
  deleteBtnSmall: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: T.surfaceHigh,
    borderWidth: 1,
    borderColor: T.border,
  },

  // Shipment Success Specific
  successCirc: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDisplayCard: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.primary + '30',
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  pinTextLarge: { fontSize: 44, fontWeight: '800', color: T.primary, letterSpacing: 8 },
});

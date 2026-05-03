import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { useMarketStore } from '../../store/MarketStore';
import { useAuthStore } from '../../store/AuthStore';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { marketplaceService } from '../../services/marketplace.service';
import { fmtETB, t } from '../../utils';
import { Radius, Shadow, Fonts, FontSize } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { Screen, Typography, Surface, SectionTitle } from '../../components';
import { Spacing } from '../../theme';
import { LegalReceipt } from '../../components/shared/LegalReceipt';

export default function CartScreen() {
  const C = useTheme();
  const navigation = useNavigation();
  const {
    cartItems,
    getCartTotalPrice,
    getCartItemsByMerchant,
    removeFromCart,
    clearCart,
    updateCartQuantity,
  } = useMarketStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const balance = useWalletStore((s) => s.balance);
  const showToast = useSystemStore((s) => s.showToast);

  const [checkingOut, setCheckingOut] = useState(false);
  const [shippingAddress, setShippingAddress] = useState((currentUser as any)?.address || '');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTxData, setLastTxData] = useState<any>(null);
  const [loadingFees, setLoadingFees] = useState(true);
  const [feesMap, setFeesMap] = useState<Record<string, number>>({});

  const merchants = getCartItemsByMerchant();
  const cartItemsCount = cartItems.length;
  const merchantGroups = Object.values(merchants);
  const totalPrice = getCartTotalPrice();
  const merchantIds = Object.keys(merchants);

  // Calculate dynamic total delivery fee from map
  const deliveryFee = merchantIds.reduce((sum, mid) => sum + (feesMap[mid] || 0), 0);
  const grandTotal = totalPrice + deliveryFee;

  useEffect(() => {
    async function loadFees() {
      if (!currentUser || merchantIds.length === 0) {
        setLoadingFees(false);
        return;
      }
      try {
        const fees = await marketplaceService.calculateDeliveryFees(currentUser.id, merchantIds);
        const map: Record<string, number> = {};
        fees.forEach((f) => {
          map[f.merchant_id] = f.fee;
        });
        setFeesMap(map);
      } catch (err) {
        console.error('Failed to load delivery fees:', err);
      } finally {
        setLoadingFees(false);
      }
    }
    loadFees();
  }, [merchantIds.length, currentUser?.id]);

  const handleUpdateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
    } else {
      updateCartQuantity(productId, newQty);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemoveItem = (productId: string) => {
    Alert.alert(t('remove_item'), t('remove_item_msg'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('remove'),
        style: 'destructive',
        onPress: () => {
          removeFromCart(productId);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      },
    ]);
  };

  const handleCheckout = async () => {
    if (!currentUser) {
      showToast(t('login_to_checkout'), 'error');
      return;
    }
    if (balance < grandTotal) {
      showToast(t('insufficient_balance_fmt', { amount: fmtETB(grandTotal, 0) }), 'error');
      return;
    }
    if (cartItems.length === 0) {
      showToast(t('cart_is_empty'), 'error');
      return;
    }
    if (!shippingAddress.trim()) {
      showToast(t('shipping_address_required'), 'error');
      return;
    }

    setCheckingOut(true);
    try {
      const items = cartItems.map((i) => ({
        product_id: i.product.id,
        qty: i.quantity,
        expected_price: i.product.price,
      }));

      await marketplaceService.checkoutCart(currentUser.id, items, shippingAddress, deliveryFee);

      clearCart();
      // 🛡️ HARDENING: Instead of manual calculation, we sync with the database
      // "Ground Truth" to prevent balance drift.
      await useWalletStore.getState().syncWithServer();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Store data for receipt
      setLastTxData({
        amount: grandTotal,
        merchantName:
          merchantGroups.length > 1
            ? t('multiple_merchants')
            : merchantGroups[0][0].product.business_name || t('citylink_marketplace'),
        merchantTIN: 'CITY-MKT-001', // Platform aggregate TIN or specific if single
        items: cartItems.map((i) => ({
          label: i.product.name,
          value: i.product.price * i.quantity,
        })),
        date: new Date().toISOString(),
        id: `MKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      });

      showToast(t('checkout_successful'), 'success');
      setShowReceipt(true);
    } catch (e: any) {
      console.error('[CartScreen] Checkout error:', e);
      showToast(e?.message || t('checkout_failed'), 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  if (cartItemsCount === 0 && !showReceipt) {
    return (
      <Screen style={{ backgroundColor: C.ink }} safeArea={true}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={C.text} />
          </TouchableOpacity>
          <Typography variant="h2" style={{ marginLeft: 16 }}>
            {t('shopping_cart')}
          </Typography>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={C.edge2} />
          <Typography variant="h2" style={{ marginTop: 24, marginBottom: 8 }}>
            {t('cart_empty_title')}
          </Typography>
          <Typography variant="body" color="sub">
            {t('cart_empty_sub')}
          </Typography>
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: C.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Typography variant="h3" style={{ color: C.ink }}>
              {t('continue_shopping')}
            </Typography>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: C.ink }} safeArea={true}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Typography variant="h2" style={{ marginLeft: 16 }}>
          {t('shopping_cart')}
        </Typography>
        <TouchableOpacity
          style={{ marginLeft: 'auto' }}
          onPress={() => {
            Alert.alert(t('clear_cart_confirm'), t('clear_cart_msg'), [
              { text: t('cancel'), style: 'cancel' },
              { text: t('clear'), style: 'destructive', onPress: clearCart },
            ]);
          }}
        >
          <Typography variant="label" color="red">
            {t('clear_cart_confirm').toUpperCase()}
          </Typography>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
        {merchantGroups.map((group: any, idx) => {
          const merchant = group[0].product.business_name || t('citylink_marketplace');
          const merchantTotal = group.reduce(
            (sum: number, i: any) => sum + i.product.price * i.quantity,
            0
          );

          return (
            <Surface key={idx} variant="flat" style={styles.merchantSection}>
              <View style={styles.merchantHeader}>
                <Ionicons name="storefront-outline" size={18} color={C.primary} />
                <Text style={[styles.merchantName, { color: C.text }]}>{merchant}</Text>
              </View>

              {group.map((item: any) => (
                <View key={item.product.id} style={styles.cartItem}>
                  <Image source={{ uri: item.product.image_url }} style={styles.itemImage} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Typography variant="h3">{item.product.name}</Typography>
                    <Typography variant="label" color="primary" style={{ marginTop: 2 }}>
                      ETB {fmtETB(item.product.price, 0)}
                    </Typography>
                  </View>
                  <View style={styles.qtyContainer}>
                    <TouchableOpacity
                      onPress={() => handleUpdateQty(item.product.id, item.quantity - 1)}
                      style={[styles.qtyBtn, { borderColor: C.edge2 }]}
                    >
                      <Ionicons name="remove" size={16} color={C.text} />
                    </TouchableOpacity>
                    <Typography variant="h3" style={{ marginHorizontal: 12 }}>
                      {item.quantity}
                    </Typography>
                    <TouchableOpacity
                      onPress={() => handleUpdateQty(item.product.id, item.quantity + 1)}
                      style={[styles.qtyBtn, { borderColor: C.edge2 }]}
                    >
                      <Ionicons name="add" size={16} color={C.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={[styles.merchantFooter, { borderTopColor: C.edge }]}>
                <Typography variant="label" color="sub">
                  {t('subtotal')}
                </Typography>
                <Typography variant="h3">ETB {fmtETB(merchantTotal, 0)}</Typography>
              </View>
            </Surface>
          );
        })}

        <Surface variant="flat" style={styles.summarySection}>
          <Typography variant="h3" style={{ marginBottom: 16 }}>
            {t('order_summary')}
          </Typography>

          <View style={styles.summaryRow}>
            <Typography variant="body" color="sub">
              {t('items_total')}
            </Typography>
            <Typography variant="h3">ETB {fmtETB(totalPrice, 0)}</Typography>
          </View>

          <View style={styles.summaryRow}>
            <Typography variant="body" color="sub">
              {t('delivery_fee')}
            </Typography>
            {loadingFees ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Typography variant="h3" color="primary">
                ETB {fmtETB(deliveryFee, 0)}
              </Typography>
            )}
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: C.edge }]} />

          <View style={styles.summaryRow}>
            <Typography variant="h2">{t('total')}</Typography>
            <Typography variant="h1" color="primary">
              ETB {fmtETB(grandTotal, 0)}
            </Typography>
          </View>
        </Surface>

        <Surface variant="flat" style={styles.addressSection}>
          <SectionTitle title={t('shipping_address_label')} style={{ marginBottom: 12 }} />
          <TextInput
            style={[
              styles.addressInput,
              { backgroundColor: C.ink, color: C.text, borderColor: C.edge2 },
            ]}
            placeholder={t('shipping_address_placeholder')}
            placeholderTextColor={C.hint}
            value={shippingAddress}
            onChangeText={setShippingAddress}
            multiline
          />
          <View style={styles.escrowNotice}>
            <Ionicons name="shield-checkmark" size={16} color={C.primary} />
            <Typography variant="label" color="sub" style={{ marginLeft: 8, flex: 1 }}>
              {t('escrow_info')}
            </Typography>
          </View>
        </Surface>
      </ScrollView>

      <BlurView intensity={30} tint="dark" style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.checkoutBtn,
            { backgroundColor: C.primary },
            (checkingOut || loadingFees) && { opacity: 0.6 },
          ]}
          onPress={handleCheckout}
          disabled={checkingOut || loadingFees}
        >
          {checkingOut ? (
            <ActivityIndicator color={C.ink} />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color={C.ink} style={{ marginRight: 8 }} />
              <Typography variant="h2" style={{ color: C.ink }}>
                {t('checkout_lock_escrow')}
              </Typography>
            </>
          )}
        </TouchableOpacity>
      </BlurView>

      {lastTxData && (
        <LegalReceipt
          visible={showReceipt}
          amount={lastTxData.amount}
          merchantName={lastTxData.merchantName}
          merchantTIN={lastTxData.merchantTIN}
          transactionId={lastTxData.id}
          date={lastTxData.date}
          items={lastTxData.items}
          paymentMethod="WALLET"
          onClose={() => {
            setShowReceipt(false);
            navigation.navigate('MyOrders' as never);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  continueBtn: {
    marginTop: 32,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: Radius.xl,
  },
  merchantSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: Radius.xl,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  merchantName: { fontSize: 18, fontWeight: '900' },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  summarySection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: Radius.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 16,
  },
  addressSection: {
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 20,
    borderRadius: Radius.xl,
  },
  addressInput: {
    height: 80,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 12,
    textAlignVertical: 'top',
    fontFamily: Fonts.body,
  },
  escrowNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,168,107,0.05)',
    borderRadius: Radius.md,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
  },
  checkoutBtn: {
    height: 64,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
});

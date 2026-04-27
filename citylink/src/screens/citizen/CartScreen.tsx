import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useMarketStore } from '../../store/MarketStore';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { useAuthStore } from '../../store/AuthStore';
import { fmtETB } from '../../utils';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Shadow, Fonts } from '../../theme';
import { marketplaceService } from '../../services/marketplace.service';
import { LegalReceipt } from '../../components';

export default function CartScreen() {
  const C = useTheme();
  const navigation = useNavigation();
  const showToast = useSystemStore((s) => s.showToast);
  const currentUser = useAuthStore((s) => s.currentUser);
  const balance = useWalletStore((s) => s.balance);

  const {
    cartItems,
    getCartItemsByMerchant,
    updateCartQuantity,
    removeFromCart,
    getCartTotalPrice,
    clearCart,
  } = useMarketStore();

  const [checkingOut, setCheckingOut] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTxData, setLastTxData] = useState<any>(null);

  const merchants = getCartItemsByMerchant();
  const cartItemsCount = cartItems.length;
  const merchantGroups = Object.values(merchants);
  const totalPrice = getCartTotalPrice();
  const deliveryFee = 150; // Fixed for now
  const grandTotal = totalPrice + deliveryFee;

  const handleUpdateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
    } else {
      updateCartQuantity(productId, newQty);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemoveItem = (productId: string) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item from cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
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
      showToast('Please login to checkout', 'error');
      return;
    }
    if (balance < grandTotal) {
      showToast(`Insufficient balance (ETB ${fmtETB(grandTotal, 0)} needed)`, 'error');
      return;
    }
    if (cartItems.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }

    setCheckingOut(true);
    try {
      const address = `${(currentUser as any).subcity || 'Addis Ababa'}, ${(currentUser as any).woreda || 'City Center'}`;
      for (const merchantItems of merchantGroups) {
        const merchantTotal = merchantItems.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        );
        const merchantDeliveryFee = Number(
          (deliveryFee * (merchantTotal / totalPrice) || 0).toFixed(2)
        );

        for (const item of merchantItems) {
          await marketplaceService.completePurchase({
            product: item.product,
            buyerId: currentUser.id,
            qty: item.quantity,
            shippingAddress: address,
            deliveryFee: merchantDeliveryFee,
          });
        }
      }

      clearCart();
      useWalletStore.getState().setBalance(balance - grandTotal);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Store data for receipt
      setLastTxData({
        amount: grandTotal,
        merchantName: merchantGroups.length > 1 ? 'Multiple Merchants' : (merchantGroups[0][0].product.business_name || 'CityLink Marketplace'),
        merchantTIN: 'CITY-MKT-001', // Platform aggregate TIN or specific if single
        items: cartItems.map(i => ({ label: i.product.name, value: i.product.price * i.quantity })),
        date: new Date().toISOString(),
        id: `MKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      });
      
      showToast('Checkout successful!', 'success');
      setShowReceipt(true);
      // navigation.navigate will be called after closing receipt
    } catch (e: any) {
      showToast(e.message || 'Checkout failed', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  const renderMerchantSection = ({ item: merchantItems }: { item: any[] }) => {
    const merchant = merchantItems[0].product.merchant_name || 'Unknown Seller';
    const merchantTotal = merchantItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

    return (
      <View style={[styles.merchantSection, { backgroundColor: C.surface, borderColor: C.edge2 }]}>
        <Text style={[styles.merchantName, { color: C.text, fontFamily: Fonts.headline }]}>
          {merchant}
        </Text>
        <Text style={[styles.merchantTotal, { color: C.sub, fontFamily: Fonts.body }]}>
          Subtotal: ETB {fmtETB(merchantTotal, 0)}
        </Text>

        {merchantItems.map((cartItem) => {
          const img = cartItem.product.image_url || cartItem.product.images_json?.[0] || null;
          return (
            <View key={cartItem.product.id} style={styles.cartItem}>
              <View style={styles.itemImageWrap}>
                {img ? (
                  <Image source={{ uri: img }} style={styles.itemImage} />
                ) : (
                  <View
                    style={[
                      styles.itemImage,
                      {
                        backgroundColor: C.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                    ]}
                  >
                    <Ionicons name="cube-outline" size={24} color={C.hint} />
                  </View>
                )}
              </View>
              <View style={styles.itemDetails}>
                <Text
                  style={[styles.itemName, { color: C.text, fontFamily: Fonts.headline }]}
                  numberOfLines={2}
                >
                  {cartItem.product.name}
                </Text>
                <Text style={[styles.itemPrice, { color: C.primary, fontFamily: Fonts.label }]}>
                  ETB {fmtETB(cartItem.product.price, 0)} each
                </Text>
                <View style={styles.qtyControls}>
                  <TouchableOpacity
                    style={[styles.qtyBtn, { backgroundColor: C.ink }]}
                    onPress={() => handleUpdateQty(cartItem.product.id, cartItem.quantity - 1)}
                  >
                    <Ionicons name="remove" size={16} color={C.text} />
                  </TouchableOpacity>
                  <Text style={[styles.qtyText, { color: C.text, fontFamily: Fonts.headline }]}>
                    {cartItem.quantity}
                  </Text>
                  <TouchableOpacity
                    style={[styles.qtyBtn, { backgroundColor: C.ink }]}
                    onPress={() => handleUpdateQty(cartItem.product.id, cartItem.quantity + 1)}
                  >
                    <Ionicons name="add" size={16} color={C.text} />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemoveItem(cartItem.product.id)}
              >
                <Ionicons name="trash-outline" size={20} color={C.red} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  if (cartItems.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: C.ink }]}>
        <StatusBar barStyle="light-content" backgroundColor={C.ink} />
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={80} color={C.edge2} />
          <Text style={[styles.emptyTitle, { color: C.text, fontFamily: Fonts.headline }]}>
            Your cart is empty
          </Text>
          <Text style={[styles.emptySub, { color: C.sub, fontFamily: Fonts.body }]}>
            Add some products to get started
          </Text>
          <TouchableOpacity
            style={[styles.shopBtn, { backgroundColor: C.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.shopBtnText, { color: C.ink, fontFamily: Fonts.headline }]}>
              Continue Shopping
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.ink }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={C.white} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.white, fontFamily: Fonts.headline }]}>
          Shopping Cart ({cartItems.length})
        </Text>
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Clear Cart', 'Remove all items?', [
              { text: 'Cancel' },
              { text: 'Clear', style: 'destructive', onPress: clearCart },
            ])
          }
        >
          <Ionicons name="trash-outline" size={24} color={C.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={Object.values(merchants)}
        renderItem={renderMerchantSection}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.checkoutBar, { backgroundColor: C.surface, borderColor: C.edge2 }]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: C.sub, fontFamily: Fonts.label }]}>
            Subtotal
          </Text>
          <Text style={[styles.totalValue, { color: C.text, fontFamily: Fonts.headline }]}>
            ETB {fmtETB(totalPrice, 0)}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: C.sub, fontFamily: Fonts.label }]}>
            Est. Delivery
          </Text>
          <Text style={[styles.totalValue, { color: C.text, fontFamily: Fonts.headline }]}>
            ETB {fmtETB(deliveryFee, 0)}
          </Text>
        </View>
        <View style={[styles.totalRow, styles.grandTotal]}>
          <Text style={[styles.grandTotalLabel, { color: C.primary, fontFamily: Fonts.headline }]}>
            Total
          </Text>
          <Text style={[styles.grandTotalValue, { color: C.primary, fontFamily: Fonts.headline }]}>
            ETB {fmtETB(grandTotal, 0)}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.checkoutBtn,
            { backgroundColor: C.primary },
            (checkingOut || balance < grandTotal) && { opacity: 0.5 },
          ]}
          onPress={handleCheckout}
          disabled={checkingOut || balance < grandTotal}
        >
          <Text style={[styles.checkoutBtnText, { color: C.ink, fontFamily: Fonts.headline }]}>
            {checkingOut
              ? 'Processing...'
              : balance < grandTotal
                ? 'Insufficient Balance'
                : 'Checkout & Lock Escrow'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Legal Receipt Modal */}
      {lastTxData && (
        <LegalReceipt
          visible={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            navigation.navigate('MyOrders' as never);
          }}
          merchantName={lastTxData.merchantName}
          merchantTIN={lastTxData.merchantTIN}
          transactionId={lastTxData.id}
          date={lastTxData.date}
          amount={lastTxData.amount}
          paymentMethod="WALLET"
          items={[
            ...lastTxData.items,
            { label: 'Delivery Fee', value: deliveryFee }
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#000',
  },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  listContent: { padding: 20, paddingBottom: 200 },
  merchantSection: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  merchantName: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  merchantTotal: { fontSize: 14, marginBottom: 12 },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  itemImageWrap: { width: 60, height: 60, borderRadius: 8, overflow: 'hidden', marginRight: 12 },
  itemImage: { width: '100%', height: '100%' },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  itemPrice: { fontSize: 14, marginBottom: 8 },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: 16, fontWeight: '700', marginHorizontal: 16 },
  removeBtn: { padding: 8 },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
    ...Shadow.lg,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 14, fontWeight: '700' },
  grandTotal: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  grandTotalLabel: { fontSize: 18, fontWeight: '900' },
  grandTotalValue: { fontSize: 18, fontWeight: '900' },
  checkoutBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    ...Shadow.md,
  },
  checkoutBtnText: { fontSize: 16, fontWeight: '900' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 24, fontWeight: '900', marginTop: 24, marginBottom: 8 },
  emptySub: { fontSize: 16, textAlign: 'center', marginBottom: 32 },
  shopBtn: { borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32 },
  shopBtnText: { fontSize: 16, fontWeight: '900' },
});

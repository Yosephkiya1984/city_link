import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { FlashList } from '../../components/common/SafeFlashList';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '../../store/AuthStore';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { useMarketStore } from '../../store/MarketStore';
import { fmtETB, t } from '../../utils';
import { useT } from '../../utils/i18n';
import { subscribeToTable, unsubscribe, getClient } from '../../services/supabase';
import { createChatThread, createChatMessage } from '../../services/chat.service';
import { marketplaceService } from '../../services/marketplace.service';
import { useTheme } from '../../hooks/useTheme';
import { useMarketplace } from '../../hooks/useMarketplace';
import { Radius, Shadow, Fonts, FontSize, DarkColors as T } from '../../theme';

// Modular Components
import { SW, SH } from '../../components/marketplace/constants';
import MarketplaceHeader from '../../components/marketplace/MarketplaceHeader';
import MarketplaceSearchBar from '../../components/marketplace/MarketplaceSearchBar';
import CategoryPills from '../../components/marketplace/CategoryPills';
import FeaturedCard from '../../components/marketplace/FeaturedCard';
import ProductCard from '../../components/marketplace/ProductCard';
import MarketplaceSkeleton from '../../components/marketplace/MarketplaceSkeleton';
import { SuccessOverlay } from '../../components/layout/SuccessOverlay';
import { Screen, Typography, Surface, SectionTitle } from '../../components';
import { Spacing } from '../../theme';

// Internal Modal Badge
const EscrowBadge = ({ C }: { C: any }) => (
  <Surface
    variant="flat"
    style={[
      styles.escrowBadge,
      { backgroundColor: C.primary + '10', borderColor: C.primary + '20' },
    ]}
  >
    <Ionicons name="shield-checkmark" size={16} color={C.primary} />
    <Typography variant="label" style={{ color: C.primary, flex: 1, marginLeft: 8 }}>
      {t('escrow_protected')}
    </Typography>
  </Surface>
);

// ——————————————————————————————————————————————————————————————————————————————————————————————
// MAIN SCREEN
// ——————————————————————————————————————————————————————————————————————————————————————————————
export default function MarketplaceScreen() {
  const t = useT();
  const C = useTheme();
  const navigation = useNavigation();
  const balance = useWalletStore((s) => s.balance);
  const {
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
    currentUser,
    handleAddToCart,
    featured,
    estimatedDelivery,
    loadingFee,
  } = useMarketplace();

  const showToast = useSystemStore((s) => s.showToast);

  const handleBuy = async () => {
    if (buying) return;
    const user = currentUser;
    if (!user) {
      showToast(t('purchase_confirm_error'), 'error');
      return;
    }
    if (user.id === selectedProduct?.merchant_id) {
      showToast(t('own_listing_error'), 'warning');
      return;
    }
    const totalCost = (selectedProduct?.price || 0) * qty;
    const grandTotal = totalCost + estimatedDelivery;
    if (balance < grandTotal) {
      showToast(t('insufficient_balance_needed', { amount: fmtETB(grandTotal, 0) }), 'error');
      return;
    }
    if ((selectedProduct?.stock || 0) < qty) {
      showToast(t('not_enough_stock'), 'error');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBuying(true);
    try {
      const res = await marketplaceService.completePurchase({
        product: selectedProduct,
        buyerId: user.id,
        qty,
        shippingAddress:
          `${(user as any).subcity || 'Addis Ababa'}, ${(user as any).woreda || 'City Center'} - ${deliveryInstructions}`.trim(),
        deliveryFee: estimatedDelivery,
      });
      if (res.success) {
        // 🛡️ Sync from server — never trust client-side math for financial state
        await useWalletStore.getState().syncWithServer();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedProduct(null);
        setDeliveryInstructions('');
        setShowSuccess(true);
      }
    } catch (e: any) {
      console.error('[Marketplace] Direct purchase error:', e);
      showToast(e?.message || t('purchase_failed'), 'error');
    } finally {
      setBuying(false);
    }
  };

  const handleMessageSeller = async () => {
    if (!currentUser) {
      showToast(t('login_required_chat'), 'info');
      return;
    }
    const merchantId = selectedProduct?.merchant_id;
    if (!merchantId) {
      showToast(t('seller_info_unavailable'), 'error');
      return;
    }
    if ((currentUser as any).id === merchantId) {
      showToast(t('own_listing_chat_error'), 'warning');
      return;
    }

    try {
      const ids = [(currentUser as any).id, merchantId].sort();
      const threadId = `${ids[0]}-${ids[1]}`;
      const initMsg = t('interest_msg', { name: selectedProduct.name });

      const client = getClient();
      if (!client) throw new Error('Supabase client not initialized');

      const { data: existing } = await client
        .from('message_threads')
        .select('thread_id')
        .eq('thread_id', threadId)
        .maybeSingle();

      if (!existing) {
        const { error } = await createChatThread({
          thread_id: threadId,
          user_a_id: ids[0],
          user_b_id: ids[1],
          last_msg: initMsg,
        });
        if (error && (error as any).code !== '23505') throw error;

        await createChatMessage({
          thread_id: threadId,
          user_id: (currentUser as any).id,
          content: initMsg,
        });
      }

      const sellerName =
        selectedProduct.business_name || selectedProduct.merchant_name || t('seller_default');
      setSelectedProduct(null);
      setDeliveryInstructions('');
      (navigation as any).navigate('Chat', {
        threadId: threadId,
        recipientName: sellerName,
        recipientId: merchantId,
      });
    } catch (e: any) {
      console.error('Chat thread error:', e);
      showToast(t('chat_start_failed'), 'error');
    }
  };

  const renderProductItem = useCallback(
    ({ item }: { item: any }) => (
      <ProductCard
        item={item}
        onPress={(p) => {
          setQty(1);
          setSelectedProduct(p);
        }}
      />
    ),
    [setSelectedProduct, setQty]
  );

  const ListHeader = useMemo(
    () => (
      <View>
        <MarketplaceSearchBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
        />
        <CategoryPills
          selected={category}
          onSelect={(cat: string) => {
            setCategory(cat);
            setLoading(true);
          }}
        />

        {!loading && search === '' && category === 'all' && featured.length > 0 && (
          <View style={{ marginBottom: Spacing.xl }}>
            <SectionTitle
              title={t('featured')}
              subtitle={t('listings_count', { count: products.length })}
              style={{ paddingHorizontal: 20 }}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SW * 0.78 + 16}
              decelerationRate="fast"
              contentContainerStyle={{ paddingLeft: 20, paddingRight: 4, gap: 16 }}
            >
              {featured.map((item: any) => (
                <FeaturedCard
                  key={item.id}
                  item={item}
                  onPress={(p) => {
                    setQty(1);
                    setSelectedProduct(p);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <Typography variant="h2">
            {search
              ? t('results_for', { query: search })
              : category === 'all'
                ? t('all_products')
                : t(category)}
          </Typography>
        </View>
      </View>
    ),
    [
      search,
      category,
      loading,
      featured,
      products.length,
      C,
      setCategory,
      setLoading,
      setSelectedProduct,
      setQty,
    ]
  );

  const ListEmpty = useMemo(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={56} color={C.edge2} />
        <Text style={[styles.emptyTitle, { color: C.text, fontFamily: Fonts.headline }]}>
          {t('no_products_found')}
        </Text>
        <Text style={[styles.emptySub, { color: C.sub, fontFamily: Fonts.body }]}>
          {t('try_different_search')}
        </Text>
      </View>
    );
  }, [loading, C]);

  return (
    <Screen style={[styles.container, { backgroundColor: C.ink }]} safeArea={false}>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />
      <MarketplaceHeader balance={balance} name={(currentUser as any)?.full_name} />

      {loading && products.length === 0 ? (
        <View style={{ marginTop: 120, paddingHorizontal: 20 }}>
          <MarketplaceSkeleton />
        </View>
      ) : (
        <FlashList<any>
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item: any) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          estimatedItemSize={260}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          initialNumToRender={6}
        />
      )}

      {/* Product Detail Modal */}
      <Modal visible={!!selectedProduct} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalBg}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setSelectedProduct(null)}
            activeOpacity={1}
          />
          <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
            {selectedProduct &&
              (() => {
                const img = selectedProduct.image_url || selectedProduct.images_json?.[0] || null;
                const soldOut = (selectedProduct.stock || 0) <= 0;
                const totalCost = (selectedProduct.price || 0) * qty;
                const grandTotal = totalCost + estimatedDelivery;
                const canAfford = ((balance as any) || 0) >= grandTotal;
                const sellerName =
                  selectedProduct.business_name ||
                  selectedProduct.merchant_name ||
                  t('seller_default');

                return (
                  <>
                    <View style={styles.modalImgWrap}>
                      {img ? (
                        <Image source={{ uri: img }} style={styles.modalImg} />
                      ) : (
                        <View style={styles.modalImgPlaceholder}>
                          <Ionicons name="cube-outline" size={60} color={C.hint} />
                        </View>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.modalClose,
                          {
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            borderColor: 'rgba(255,255,255,0.2)',
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() => setSelectedProduct(null)}
                      >
                        <Ionicons name="close" size={20} color={C.white} />
                      </TouchableOpacity>
                      {selectedProduct.condition && (
                        <Surface variant="lift" style={styles.conditionBadge}>
                          <Typography variant="label" style={{ color: '#FFF' }}>
                            {t(selectedProduct.condition.toLowerCase())}
                          </Typography>
                        </Surface>
                      )}
                    </View>

                    <ScrollView
                      style={{ maxHeight: SH * 0.6 }}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 60 }}
                    >
                      <Typography variant="label" color="primary" style={{ marginBottom: 4 }}>
                        {t(selectedProduct.category?.toLowerCase() || 'general')}
                      </Typography>

                      <Typography variant="h1" style={{ marginBottom: Spacing.sm }}>
                        {selectedProduct.name || selectedProduct.title}
                      </Typography>

                      {selectedProduct.description && (
                        <Typography variant="body" color="sub" style={{ marginBottom: Spacing.xl }}>
                          {selectedProduct.description}
                        </Typography>
                      )}

                      <Surface
                        variant="outline"
                        style={[styles.sellerRow, { borderColor: C.edge2 }]}
                      >
                        <View style={[styles.sellerIcon, { backgroundColor: C.primary + '10' }]}>
                          <Ionicons name="storefront-outline" size={20} color={C.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Typography variant="label" color="sub" style={{ marginBottom: 2 }}>
                            {t('seller')}
                          </Typography>
                          <Typography variant="h3">{sellerName}</Typography>
                        </View>
                        <TouchableOpacity
                          style={[styles.chatBtn, { borderColor: C.primary + '40' }]}
                          onPress={handleMessageSeller}
                        >
                          <Ionicons name="chatbubble-outline" size={14} color={C.primary} />
                          <Typography variant="label" color="primary" style={{ marginLeft: 6 }}>
                            {t('chat')}
                          </Typography>
                        </TouchableOpacity>
                      </Surface>

                      <EscrowBadge C={C} />

                      <View style={styles.divider} />

                      <View style={styles.buyRow}>
                        <View>
                          <Typography variant="label" color="sub" style={{ marginBottom: 4 }}>
                            {t('product_subtotal')}
                          </Typography>
                          <Typography variant="h1">ETB {fmtETB(totalCost, 0)}</Typography>
                          <Typography
                            variant="label"
                            color="primary"
                            style={{ marginTop: 4, fontWeight: '700' }}
                          >
                            + {loadingFee ? '...' : fmtETB(estimatedDelivery, 0)}{' '}
                            {t('est_delivery')}
                          </Typography>
                        </View>

                        <Surface
                          variant="outline"
                          style={[
                            styles.qtyPicker,
                            { backgroundColor: C.ink, borderColor: C.edge2 },
                          ]}
                        >
                          <TouchableOpacity
                            style={[styles.qtyBtn, { backgroundColor: C.surface }]}
                            onPress={() => {
                              if (qty > 1) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setQty(qty - 1);
                              }
                            }}
                            disabled={qty <= 1}
                          >
                            <Ionicons name="remove" size={18} color={qty <= 1 ? C.hint : C.text} />
                          </TouchableOpacity>
                          <Typography variant="h3" style={{ minWidth: 32, textAlign: 'center' }}>
                            {qty}
                          </Typography>
                          <TouchableOpacity
                            style={[styles.qtyBtn, { backgroundColor: C.surface }]}
                            onPress={() => {
                              if (qty < Math.min(selectedProduct.stock, 10)) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setQty(qty + 1);
                              }
                            }}
                            disabled={qty >= Math.min(selectedProduct.stock, 10)}
                          >
                            <Ionicons
                              name="add"
                              size={18}
                              color={qty >= Math.min(selectedProduct.stock, 10) ? C.hint : C.text}
                            />
                          </TouchableOpacity>
                        </Surface>
                      </View>

                      <View style={styles.deliveryInputBox}>
                        <Typography variant="label" color="sub" style={{ marginBottom: 8 }}>
                          {t('delivery_instructions_label')}
                        </Typography>
                        <TextInput
                          style={[
                            styles.deliveryInput,
                            { backgroundColor: C.ink, color: C.text, borderColor: C.edge2 },
                          ]}
                          placeholder={t('delivery_instructions_placeholder')}
                          placeholderTextColor={C.hint}
                          value={deliveryInstructions}
                          onChangeText={setDeliveryInstructions}
                        />
                      </View>

                      <Typography
                        variant="label"
                        style={[
                          styles.stockInfo,
                          {
                            color: soldOut
                              ? C.red
                              : selectedProduct.stock <= 5
                                ? C.secondary
                                : C.sub,
                          },
                        ]}
                      >
                        {soldOut
                          ? t('out_of_stock')
                          : t('units_available', { count: selectedProduct.stock })}
                      </Typography>

                      {!canAfford && (
                        <Typography
                          variant="label"
                          color="red"
                          style={{ marginBottom: 12, marginTop: -4 }}
                        >
                          {t('insufficient_balance_more', {
                            amount: fmtETB(grandTotal - ((balance as any) || 0), 0),
                          })}
                        </Typography>
                      )}

                      <View style={styles.buttonRow}>
                        <TouchableOpacity
                          style={[
                            styles.addToCartBtn,
                            { backgroundColor: C.surface, borderColor: C.primary },
                          ]}
                          onPress={handleAddToCart}
                          disabled={soldOut}
                        >
                          <Ionicons name="cart-outline" size={16} color={C.primary} />
                          <Typography variant="h3" color="primary" style={{ marginLeft: 8 }}>
                            {t('add_to_cart')}
                          </Typography>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.buyNowBtn,
                            { backgroundColor: C.primary },
                            (buying || soldOut || !canAfford) && { opacity: 0.5 },
                          ]}
                          onPress={handleBuy}
                          disabled={buying || soldOut || !canAfford}
                        >
                          {buying ? (
                            <ActivityIndicator color={C.ink} />
                          ) : (
                            <>
                              <Ionicons
                                name="lock-closed"
                                size={16}
                                color={C.ink}
                                style={{ marginRight: 8 }}
                              />
                              <Typography variant="h3" style={{ color: C.ink }}>
                                {soldOut
                                  ? t('out_of_stock')
                                  : !canAfford
                                    ? t('insufficient_balance')
                                    : t('buy_now_total', { total: fmtETB(grandTotal, 0) })}
                              </Typography>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  </>
                );
              })()}
          </View>
        </View>
      </Modal>

      <SuccessOverlay
        visible={showSuccess}
        title={t('purchase_confirmed')}
        subtitle={t('escrow_confirmed_desc')}
        onClose={() => {
          setShowSuccess(false);
          (navigation as any).navigate('MyOrders');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    paddingTop: 110,
    paddingBottom: 100,
    paddingHorizontal: Spacing.sm,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs,
  },
  emptySub: {
    textAlign: 'center',
    opacity: 0.6,
  },

  // Modal Styles
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
    maxHeight: SH * 0.95,
  },
  modalImgWrap: {
    height: 300,
    position: 'relative',
  },
  modalImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalImgPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  conditionBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sellerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing.xl,
  },
  buyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.xl,
  },
  qtyPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.md,
    padding: 4,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryInputBox: {
    marginBottom: Spacing.xl,
  },
  deliveryInput: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    fontSize: 15,
  },
  stockInfo: {
    marginBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  addToCartBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  buyNowBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
});

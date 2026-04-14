import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

import { useAppStore } from '../../store/AppStore';
import { fmtETB } from '../../utils';
import { subscribeToTable, unsubscribe, supabase } from '../../services/supabase';
import { createChatThread, createChatMessage } from '../../services/chat.service';
import { marketplaceService } from '../../services/marketplace.service';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Shadow, Fonts, FontSize } from '../../theme';

// Modular Components
import { T, SW, SH } from '../../components/marketplace/constants';
import MarketplaceHeader from '../../components/marketplace/MarketplaceHeader';
import MarketplaceSearchBar from '../../components/marketplace/MarketplaceSearchBar';
import CategoryPills from '../../components/marketplace/CategoryPills';
import FeaturedCard from '../../components/marketplace/FeaturedCard';
import ProductCard from '../../components/marketplace/ProductCard';
import MarketplaceSkeleton from '../../components/marketplace/MarketplaceSkeleton';

// Internal Modal Badge
const EscrowBadge = ({ C }: { C: any }) => (
  <View style={[styles.escrowBadge, { backgroundColor: C.primary + '15', borderColor: C.primary + '30' }]}>
    <Ionicons name="shield-checkmark" size={14} color={C.primary} />
    <Text style={[styles.escrowBadgeText, { color: C.primary, fontFamily: Fonts.label }]}>Escrow Protected · Funds only release on delivery</Text>
  </View>
);

// ——————————————————————————————————————————————————————————————————————————————————————————————
// MAIN SCREEN
// ——————————————————————————————————————————————————————————————————————————————————————————————
export default function MarketplaceScreen() {
  const C = useTheme();
  const navigation = useNavigation();
  const balance = useAppStore((s) => s.balance);
  const showToast = useAppStore((s) => s.showToast);
  const currentUser = useAppStore((s) => s.currentUser);

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState(false);
  const [qty, setQty] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const searchTimer = useRef<any>(null);

  // ——————————————————————————————————————————————————————————————————————————————————————————————
  const loadProducts = useCallback(
    async (q = '', cat = 'All') => {
      try {
        let data;
        if (q.trim()) {
          data = await marketplaceService.searchProducts(q);
        } else if (cat !== 'All') {
          data = await marketplaceService.getProductsByCategory(cat);
        } else {
          data = await marketplaceService.getActiveProducts();
        }
        setProducts(data || []);
      } catch (e) {
        showToast('Could not load products', 'error');
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadProducts(search, category);
  }, [category]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadProducts(search, category), 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // Real-time product updates
  useEffect(() => {
    const ch = subscribeToTable('mkt-products-rt', 'products', null, (payload) => {
      if (payload.eventType === 'UPDATE') {
        setProducts((prev) =>
          prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
        );
      } else if (payload.eventType === 'INSERT' && payload.new.status === 'active') {
        setProducts((prev) => [payload.new, ...prev]);
      } else if (payload.eventType === 'DELETE') {
        setProducts((prev) => prev.filter((p) => p.id !== payload.old?.id));
      }
    });
    return () => unsubscribe(ch);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts(search, category);
    setRefreshing(false);
  };

  // ——————————————————————————————————————————————————————————————————————————————————————————————
  const handleBuy = async () => {
    if (buying) return;
    const user = useAppStore.getState().currentUser;
    if (!user) {
      showToast('Please login to purchase', 'error');
      return;
    }
    if (user.id === selectedProduct?.merchant_id) {
      showToast("You can't buy your own listing", 'warning');
      return;
    }
    const currentBalance = useAppStore.getState().balance || 0;
    const totalCost = (selectedProduct?.price || 0) * qty;
    if (currentBalance < totalCost) {
      showToast(`Insufficient balance (ETB ${fmtETB(totalCost, 0)} needed)`, 'error');
      return;
    }
    if ((selectedProduct?.stock || 0) < qty) {
      showToast('Not enough stock', 'error');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBuying(true);
    try {
      const res = await (marketplaceService as any).completePurchase({
        product: selectedProduct,
        buyerId: user.id,
        qty,
        shippingAddress:
          `${(user as any).subcity || 'Addis Ababa'}, ${(user as any).woreda || 'City Center'} - ${deliveryInstructions}`.trim(),
      });
      if (res.success) {
        const finalTotal = res.total || totalCost;
        useAppStore.getState().setBalance(currentBalance - finalTotal);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedProduct(null);
        setDeliveryInstructions('');
        showToast('Purchase placed! Funds locked in escrow 🔒', 'success');
        setTimeout(() => (navigation as any).navigate('MyOrders'), 800);
      }
    } catch (e: any) {
      showToast(e.message || 'Purchase failed', 'error');
    } finally {
      setBuying(false);
    }
  };

  const handleMessageSeller = async () => {
    if (!currentUser) {
      showToast('Please login to message sellers', 'info');
      return;
    }
    const merchantId = selectedProduct?.merchant_id;
    if (!merchantId) {
      showToast('Seller info not available', 'error');
      return;
    }
    if ((currentUser as any).id === merchantId) {
      showToast("That's your own listing", 'warning');
      return;
    }

    try {
      const ids = [(currentUser as any).id, merchantId].sort();
      const threadId = `${ids[0]}-${ids[1]}`;
      const initMsg = `Hi! I'm interested in your product: ${selectedProduct.name}`;

      const { data: existing } = await supabase
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

      const sellerName = selectedProduct.business_name || selectedProduct.merchant_name || 'Seller';
      setSelectedProduct(null);
      setDeliveryInstructions('');
      (navigation as any).navigate('Chat', {
        threadId: threadId,
        recipientName: sellerName,
        recipientId: merchantId,
      });
    } catch (e: any) {
      console.error('Chat thread error:', e);
      showToast('Failed to start conversation', 'error');
    }
  };

  // ——————————————————————————————————————————————————————————————————————————————————————————————
  const featured = useMemo(() => products.slice(0, 4), [products]);

  const renderProductItem = useCallback(
    ({ item }: { item: any }) => (
      <ProductCard
        item={item}
        onPress={(p: any) => {
          setQty(1);
          setSelectedProduct(p);
        }}
      />
    ),
    []
  );

  const ListHeader = useMemo(() => (
    <View>
      <MarketplaceSearchBar value={search} onChangeText={setSearch} onClear={() => setSearch('')} />
      <CategoryPills
        selected={category}
        onSelect={(cat: string) => {
          setCategory(cat);
          setLoading(true);
        }}
      />

      {!loading && search === '' && category === 'All' && featured.length > 0 && (
        <View style={{ marginBottom: 32 }}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: C.text, fontFamily: Fonts.headline }]}>Featured</Text>
            <Text style={[styles.sectionSub, { color: C.sub, fontFamily: Fonts.label }]}>{products.length} listings</Text>
          </View>
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
                onPress={(p: any) => {
                  setQty(1);
                  setSelectedProduct(p);
                }}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: C.text, fontFamily: Fonts.headline }]}>
          {search ? `Results for "${search}"` : category === 'All' ? 'All Products' : category}
        </Text>
      </View>
    </View>
  ), [search, category, loading, featured, products.length]);

  const ListEmpty = useMemo(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={56} color={C.edge2} />
        <Text style={[styles.emptyTitle, { color: C.text, fontFamily: Fonts.headline }]}>No Products Found</Text>
        <Text style={[styles.emptySub, { color: C.sub, fontFamily: Fonts.body }]}>Try a different category or search term</Text>
      </View>
    );
  }, [loading]);

  return (
    <View style={[styles.container, { backgroundColor: C.ink }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />
      <MarketplaceHeader balance={balance} name={(currentUser as any)?.full_name} />

      {loading && products.length === 0 ? (
        <View style={{ marginTop: 120, paddingHorizontal: 20 }}>
          <MarketplaceSkeleton />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
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
                const canAfford = ((balance as any) || 0) >= totalCost;
                const sellerName = selectedProduct.business_name || selectedProduct.merchant_name || 'Seller';

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
                        style={[styles.modalClose, { backgroundColor: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1 }]}
                        onPress={() => setSelectedProduct(null)}
                      >
                        <Ionicons name="close" size={20} color={C.white} />
                      </TouchableOpacity>
                      {selectedProduct.condition && (
                        <View style={styles.conditionBadge}>
                          <Text style={[styles.conditionText, { fontFamily: Fonts.label }]}>
                            {selectedProduct.condition.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <ScrollView
                      style={{ maxHeight: SH * 0.6 }}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ padding: 28, paddingBottom: 60 }}
                    >
                      <Text style={[styles.modalCat, { color: C.primary, fontFamily: Fonts.label }]}>
                        {(selectedProduct.category || 'GENERAL').toUpperCase()}
                      </Text>
                      <Text style={[styles.modalTitle, { color: C.text, fontFamily: Fonts.headline }]}>
                        {selectedProduct.name || selectedProduct.title}
                      </Text>
                      {selectedProduct.description && (
                        <Text style={[styles.modalDesc, { color: C.sub, fontFamily: Fonts.body }]}>{selectedProduct.description}</Text>
                      )}

                      <View style={[styles.sellerRow, { backgroundColor: C.surface, borderColor: C.edge2 }]}>
                        <View style={[styles.sellerIcon, { backgroundColor: C.primary + '15' }]}>
                          <Ionicons name="storefront-outline" size={20} color={C.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sellerLabel, { color: C.sub, fontFamily: Fonts.label }]}>SELLER</Text>
                          <Text style={[styles.sellerName, { color: C.text, fontFamily: Fonts.headline }]}>{sellerName}</Text>
                        </View>
                        <TouchableOpacity style={[styles.chatBtn, { borderColor: C.primary + '40' }]} onPress={handleMessageSeller}>
                          <Ionicons name="chatbubble-outline" size={14} color={C.primary} />
                          <Text style={[styles.chatBtnText, { color: C.primary, fontFamily: Fonts.label }]}>Chat</Text>
                        </TouchableOpacity>
                      </View>

                      <EscrowBadge C={C} />
                      <View style={styles.divider} />

                      <View style={styles.buyRow}>
                        <View>
                          <Text style={[styles.priceLabel, { color: C.sub, fontFamily: Fonts.label }]}>PRICE</Text>
                          <Text style={[styles.priceValue, { color: C.text, fontFamily: Fonts.headline }]}>
                            ETB {fmtETB(selectedProduct.price, 0)}
                          </Text>
                          {qty > 1 && (
                            <Text style={[styles.priceTotal, { color: C.sub, fontFamily: Fonts.label }]}>Total: ETB {fmtETB(totalCost, 0)}</Text>
                          )}
                        </View>

                        <View style={[styles.qtyPicker, { backgroundColor: C.ink, borderColor: C.edge2 }]}>
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
                          <Text style={[styles.qtyText, { color: C.text, fontFamily: Fonts.headline }]}>{qty}</Text>
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
                            <Ionicons name="add" size={18} color={qty >= Math.min(selectedProduct.stock, 10) ? C.hint : C.text} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.deliveryInputBox}>
                        <Text style={[styles.priceLabel, { color: C.sub, fontFamily: Fonts.label }]}>DELIVERY INSTRUCTIONS (OPTIONAL)</Text>
                        <TextInput
                          style={[styles.deliveryInput, { backgroundColor: C.ink, color: C.text, borderColor: C.edge2 }]}
                          placeholder="E.g., Next to building X, call me on arrival..."
                          placeholderTextColor={C.hint}
                          value={deliveryInstructions}
                          onChangeText={setDeliveryInstructions}
                        />
                      </View>

                      <Text style={[styles.stockInfo, { color: soldOut ? T.red : selectedProduct.stock <= 5 ? T.secondary : T.textSub }]}>
                        {soldOut ? 'Out of stock' : `${selectedProduct.stock} units available`}
                      </Text>

                      {!canAfford && (
                        <Text style={{ color: T.red, fontSize: 12, marginBottom: 12, marginTop: -4 }}>
                          Insufficient balance — need ETB {fmtETB(totalCost - ((balance as any) || 0), 0)} more
                        </Text>
                      )}

                      <TouchableOpacity
                        style={[styles.buyNowBtn, { backgroundColor: C.primary }, (buying || soldOut || !canAfford) && { opacity: 0.5 }]}
                        onPress={handleBuy}
                        disabled={buying || soldOut || !canAfford}
                      >
                        {buying ? (
                          <ActivityIndicator color={C.ink} />
                        ) : (
                          <>
                            <Ionicons name="lock-closed" size={16} color={C.ink} style={{ marginRight: 8 }} />
                            <Text style={[styles.buyNowText, { color: C.ink, fontFamily: Fonts.headline }]}>
                              {soldOut ? 'Out of Stock' : !canAfford ? 'Insufficient Balance' : `Buy Now · ETB ${fmtETB(totalCost, 0)}`}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </ScrollView>
                  </>
                );
              })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingTop: 110, paddingBottom: 100 },
  columnWrapper: { paddingHorizontal: 20, justifyContent: 'space-between', marginBottom: 16 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.8 },
  sectionSub: { fontSize: 13, opacity: 0.6 },
  emptyState: { alignItems: 'center', paddingVertical: 100 },
  emptyTitle: { fontSize: 20, fontWeight: '900', marginTop: 24, marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', opacity: 0.6 },

  // Modal Styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', maxHeight: SH * 0.95 },
  modalImgWrap: { height: 260, position: 'relative' },
  modalImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  modalImgPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  modalClose: { position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  conditionBadge: { position: 'absolute', bottom: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  conditionText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
  modalCat: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  modalTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -1, marginBottom: 12 },
  modalDesc: { fontSize: 15, lineHeight: 24, marginBottom: 24, opacity: 0.7 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 14, borderWidth: 1.5, marginBottom: 16 },
  sellerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sellerLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  sellerName: { fontSize: 14, fontWeight: '900' },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  chatBtnText: { fontSize: 13, fontWeight: '900' },
  escrowBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 24 },
  escrowBadgeText: { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 20 },
  divider: { height: 1, marginBottom: 24, opacity: 0.1 },
  buyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  priceLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
  priceValue: { fontSize: 32, fontWeight: '900' },
  priceTotal: { fontSize: 13, marginTop: 4, opacity: 0.6 },
  qtyPicker: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, borderWidth: 1.5, padding: 6 },
  qtyBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 18, fontWeight: '900', minWidth: 32, textAlign: 'center' },
  deliveryInputBox: { marginTop: 20, marginBottom: 8 },
  deliveryInput: { borderRadius: 12, padding: 16, marginTop: 10, borderWidth: 1.5, fontSize: 14, fontFamily: Fonts.body },
  stockInfo: { fontSize: 13, marginBottom: 16, fontWeight: '800' },
  buyNowBtn: { borderRadius: 18, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...Shadow.md },
  buyNowText: { fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
});



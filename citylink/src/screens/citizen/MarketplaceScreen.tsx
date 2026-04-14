import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
  Image,
  TextInput,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

import { useAppStore } from '../../store/AppStore';
import { fmtETB } from '../../utils';
import { subscribeToTable, unsubscribe, supabase } from '../../services/supabase';
import { createChatThread, createChatMessage } from '../../services/chat.service';
import { marketplaceService } from '../../services/marketplace.service';

const { width: SW, height: SH } = Dimensions.get('window');

// â”€â”€ Theme â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const T = {
  bg: '#0c0e12',
  surface: '#161a20',
  surfaceHigh: '#1e2228',
  card: '#12161c',
  primary: '#40d991',
  primaryDim: '#40d99120',
  secondary: '#f59e0b',
  secondaryDim: '#f59e0b18',
  accent: '#7c3aed',
  accentDim: '#7c3aed18',
  red: '#ef4444',
  redDim: '#ef444418',
  text: '#e2e8f0',
  textSub: '#64748b',
  textMuted: '#334155',
  border: 'rgba(255,255,255,0.06)',
  borderBright: 'rgba(255,255,255,0.12)',
  glass: 'rgba(12,14,18,0.9)',
};

const CATEGORIES = [
  { id: 'All', name: 'All', icon: 'grid', color: T.primary },
  { id: 'Electronics', name: 'Electronics', icon: 'phone-portrait', color: '#06b6d4' },
  { id: 'Fashion', name: 'Fashion', icon: 'shirt', color: '#ec4899' },
  { id: 'Food', name: 'Food', icon: 'restaurant', color: T.secondary },
  { id: 'Home', name: 'Home', icon: 'home', color: '#10b981' },
  { id: 'Beauty', name: 'Beauty', icon: 'color-palette', color: '#8b5cf6' },
  { id: 'Tech', name: 'Tech', icon: 'hardware-chip', color: '#3b82f6' },
];

// â”€â”€ Shimmer Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Shimmer = ({ style }: any) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return <Animated.View style={[{ backgroundColor: T.surfaceHigh, opacity }, style]} />;
};

const ProductSkeleton = ({ style }: any) => (
  <View style={[styles.productCard, { backgroundColor: T.card }]}>
    <Shimmer style={{ height: 140, borderRadius: 10, marginBottom: 12 }} />
    <Shimmer style={{ height: 10, borderRadius: 5, width: '50%', marginBottom: 8 }} />
    <Shimmer style={{ height: 14, borderRadius: 5, width: '80%', marginBottom: 8 }} />
    <Shimmer style={{ height: 14, borderRadius: 5, width: '40%' }} />
  </View>
);

// ——————————————————————————————————————————————————————————————————————————————————————————————
const Header = ({ balance, name }: any) => {
  const navigation = useNavigation();
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerGreeting}>Hello, {name?.split(' ')[0] || 'Shopper'} 👋</Text>
        <Text style={styles.headerTitle}>
          CityLink <Text style={{ color: T.primary }}>Market</Text>
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => (navigation as any).navigate('MyOrders')}
        >
          <Ionicons name="receipt-outline" size={20} color={T.textSub} />
        </TouchableOpacity>
        <View style={styles.balancePill}>
          <Ionicons name="wallet-outline" size={13} color={T.primary} />
          <Text style={styles.balanceText}>{fmtETB(balance, 0)} ETB</Text>
        </View>
      </View>
    </View>
  );
};

// ——————————————————————————————————————————————————————————————————————————————————————————————
const SearchBar = ({ value, onChangeText, onClear }: any) => (
  <View style={styles.searchWrap}>
    <Ionicons name="search" size={18} color={T.textSub} style={styles.searchIcon} />
    <TextInput
      style={styles.searchInput}
      placeholder="Search products..."
      placeholderTextColor={T.textSub}
      value={value}
      onChangeText={onChangeText}
      returnKeyType="search"
    />
    {value.length > 0 && (
      <TouchableOpacity onPress={onClear} style={{ padding: 4 }}>
        <Ionicons name="close-circle" size={18} color={T.textSub} />
      </TouchableOpacity>
    )}
  </View>
);

// ——————————————————————————————————————————————————————————————————————————————————————————————
const CategoryPills = ({ selected, onSelect }: any) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.pillRow}
    contentContainerStyle={{ paddingRight: 20, gap: 8 }}
  >
    {CATEGORIES.map((cat: any) => {
      const active = selected === cat.id;
      return (
        <TouchableOpacity
          key={cat.id}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(cat.id);
          }}
          style={[
            styles.pill,
            active && { backgroundColor: cat.color + '22', borderColor: cat.color + '60' },
          ]}
        >
          <Ionicons name={cat.icon as any} size={13} color={active ? cat.color : T.textSub} />
          <Text style={[styles.pillText, active && { color: cat.color, fontWeight: '700' }]}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

// ——————————————————————————————————————————————————————————————————————————————————————————————
const FeaturedCard = ({ item, onPress }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const img = item.image_url || item.images_json?.[0] || null;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(item)}
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
    >
      <Animated.View style={[styles.featuredCard, { transform: [{ scale }] }]}>
        {img ? (
          <Image source={{ uri: img }} style={styles.featuredImg} />
        ) : (
          <View
            style={[
              styles.featuredImg,
              { backgroundColor: T.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
            ]}
          >
            <Ionicons name="cube-outline" size={40} color={T.textMuted} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(12,14,18,0.95)']}
          style={styles.featuredGradient}
        />
        <View style={styles.featuredOverlay}>
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>✦ FEATURED</Text>
          </View>
          <Text style={styles.featuredName} numberOfLines={2}>
            {item.name || item.title}
          </Text>
          <Text style={styles.featuredPrice}>ETB {fmtETB(item.price, 0)}</Text>
        </View>
        {item.stock > 0 && item.stock <= 5 && (
          <View style={styles.lowStockBadge}>
            <Text style={styles.lowStockText}>Only {item.stock} left</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ——————————————————————————————————————————————————————————————————————————————————————————————
const ProductCard = ({ item, onPress }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const img = item.image_url || item.images_json?.[0] || null;
  const soldOut = (item.stock || 0) <= 0;
  const lowStock = !soldOut && (item.stock || 0) <= 5;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(item)}
      onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
    >
      <Animated.View style={[styles.productCard, { transform: [{ scale }] }]}>
        <View style={styles.productImgWrap}>
          {img ? (
            <Image source={{ uri: img }} style={styles.productImg} />
          ) : (
            <View
              style={[
                styles.productImg,
                { backgroundColor: T.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
              ]}
            >
              <Ionicons name="cube-outline" size={32} color={T.textMuted} />
            </View>
          )}
          {soldOut && (
            <View
              style={[styles.stockLabel, { backgroundColor: T.redDim, borderColor: T.red + '40' }]}
            >
              <Text style={[styles.stockLabelText, { color: T.red }]}>SOLD OUT</Text>
            </View>
          )}
          {lowStock && (
            <View
              style={[
                styles.stockLabel,
                { backgroundColor: T.secondaryDim, borderColor: T.secondary + '40' },
              ]}
            >
              <Text style={[styles.stockLabelText, { color: T.secondary }]}>LOW STOCK</Text>
            </View>
          )}
        </View>

        <View style={styles.productBody}>
          <Text style={styles.productCat}>{(item.category || 'GENERAL').toUpperCase()}</Text>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name || item.title}
          </Text>
          <View style={styles.productFooter}>
            <Text style={styles.productPrice}>ETB {fmtETB(item.price, 0)}</Text>
            <TouchableOpacity
              style={[styles.buyQuickBtn, soldOut && { opacity: 0.4 }]}
              onPress={() => {
                if (!soldOut) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onPress(item);
                }
              }}
              disabled={soldOut}
            >
              <Ionicons name="flash" size={16} color={soldOut ? T.textSub : T.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ——————————————————————————————————————————————————————————————————————————————————————————————
const EscrowBadge = () => (
  <View style={styles.escrowBadge}>
    <Ionicons name="shield-checkmark" size={14} color={T.primary} />
    <Text style={styles.escrowBadgeText}>Escrow Protected · Funds only release on delivery</Text>
  </View>
);

// ——————————————————————————————————————————————————————————————————————————————————————————————
// MAIN SCREEN
// ——————————————————————————————————————————————————————————————————————————————————————————————
export default function MarketplaceScreen({ navigation: nav }: any) {
  const navigation = useNavigation();
  const balance = useAppStore((s) => s.balance);
  const showToast = useAppStore((s) => s.showToast);
  const currentUser = useAppStore((s) => s.currentUser);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState(false);
  const [qty, setQty] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const searchTimer = useRef(null);

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
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadProducts(search, category), 350);
    return () => clearTimeout(searchTimer.current);
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
    } catch (e) {
      showToast(e.message || 'Purchase failed', 'error');
    } finally {
      setBuying(false);
    }
  };

  // ——————————————————————————————————————————————————————————————————————————————————————————————
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
      // Stable thread_id between two users
      const ids = [(currentUser as any).id, merchantId].sort();
      const threadId = `${ids[0]}-${ids[1]}`;
      const initMsg = `Hi! I'm interested in your product: ${selectedProduct.name}`;

      // Check if thread exists
      const { data: existing } = await supabase
        .from('message_threads')
        .select('thread_id')
        .eq('thread_id', threadId)
        .maybeSingle();

      if (!existing) {
        // Create it via service helper
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
    ({ item }: any) => (
      <ProductCard
        item={item}
        onPress={(p: any) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setQty(1);
          setSelectedProduct(p);
        }}
      />
    ),
    []
  );

  const renderSkeleton = () => (
    <View style={styles.grid}>
      {[1, 2, 3, 4].map((k) => (
        <ProductSkeleton key={k} />
      ))}
    </View>
  );

  const sellerName = selectedProduct
    ? selectedProduct.business_name ||
      selectedProduct.merchant_name ||
      selectedProduct.seller_name ||
      'Verified Seller'
    : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* —————————————————————————————————————————————————————————————————————————————————————————————— */}
      <Header balance={balance} name={(currentUser as any)?.full_name} />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />
        }
        contentContainerStyle={{ paddingTop: 100, paddingBottom: 60 }}
      >
        {/* Search */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <SearchBar value={search} onChangeText={setSearch} onClear={() => setSearch('')} />
        </View>

        {/* Categories */}
        <View style={{ paddingLeft: 20, marginBottom: 24 }}>
          <CategoryPills
            selected={category}
            onSelect={(cat: string) => {
              setCategory(cat);
              setLoading(true);
            }}
          />
        </View>

        {/* Featured Carousel */}
        {!loading && search === '' && category === 'All' && featured.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Featured</Text>
              <Text style={styles.sectionSub}>{products.length} listings</Text>
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

        {/* Product Grid */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>
              {search ? `Results for "${search}"` : category === 'All' ? 'All Products' : category}
            </Text>
          </View>

          {loading ? (
            renderSkeleton()
          ) : products.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={52} color={T.textMuted} />
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySub}>Try a different category or search term</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {products.map((item: any) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onPress={(p: any) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setQty(1);
                    setSelectedProduct(p);
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* —————————————————————————————————————————————————————————————————————————————————————————————— */}
      <Modal visible={!!selectedProduct} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalBg}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setSelectedProduct(null)}
            activeOpacity={1}
          />
          <View style={styles.modalSheet}>
            {selectedProduct &&
              (() => {
                const img = selectedProduct.image_url || selectedProduct.images_json?.[0] || null;
                const soldOut = (selectedProduct.stock || 0) <= 0;
                const totalCost = (selectedProduct.price || 0) * qty;
                const canAfford = ((balance as any) || 0) >= totalCost;
                return (
                  <>
                    {/* Image */}
                    <View style={styles.modalImgWrap}>
                      {img ? (
                        <Image source={{ uri: img }} style={styles.modalImg} />
                      ) : (
                        <View
                          style={[
                            styles.modalImg,
                            {
                              backgroundColor: T.surfaceHigh,
                              alignItems: 'center',
                              justifyContent: 'center',
                            },
                          ]}
                        >
                          <Ionicons name="cube-outline" size={60} color={T.textMuted} />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.modalClose}
                        onPress={() => setSelectedProduct(null)}
                      >
                        <Ionicons name="close" size={20} color={T.text} />
                      </TouchableOpacity>
                      {selectedProduct.condition && (
                        <View style={styles.conditionBadge}>
                          <Text style={styles.conditionText}>
                            {selectedProduct.condition.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <ScrollView
                      style={{ maxHeight: SH * 0.55 }}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
                    >
                      {/* Category + Name */}
                      <Text style={styles.modalCat}>
                        {(selectedProduct.category || 'GENERAL').toUpperCase()}
                      </Text>
                      <Text style={styles.modalTitle}>
                        {selectedProduct.name || selectedProduct.title}
                      </Text>
                      {selectedProduct.description && (
                        <Text style={styles.modalDesc}>{selectedProduct.description}</Text>
                      )}

                      {/* Seller Row */}
                      <View style={styles.sellerRow}>
                        <View style={styles.sellerIcon}>
                          <Ionicons name="storefront-outline" size={18} color={T.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sellerLabel}>SELLER</Text>
                          <Text style={styles.sellerName}>{sellerName}</Text>
                        </View>
                        <TouchableOpacity style={styles.chatBtn} onPress={handleMessageSeller}>
                          <Ionicons name="chatbubble-outline" size={14} color={T.primary} />
                          <Text style={styles.chatBtnText}>Chat</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Escrow Trust Badge */}
                      <EscrowBadge />

                      {/* Divider */}
                      <View style={styles.divider} />

                      {/* Price + Qty + CTA */}
                      <View style={styles.buyRow}>
                        <View>
                          <Text style={styles.priceLabel}>PRICE</Text>
                          <Text style={styles.priceValue}>
                            ETB {fmtETB(selectedProduct.price, 0)}
                          </Text>
                          {qty > 1 && (
                            <Text style={styles.priceTotal}>Total: ETB {fmtETB(totalCost, 0)}</Text>
                          )}
                        </View>

                        {/* Qty Picker */}
                        <View style={styles.qtyPicker}>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => {
                              if (qty > 1) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setQty(qty - 1);
                              }
                            }}
                            disabled={qty <= 1}
                          >
                            <Ionicons
                              name="remove"
                              size={18}
                              color={qty <= 1 ? T.textMuted : T.text}
                            />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{qty}</Text>
                          <TouchableOpacity
                            style={styles.qtyBtn}
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
                              color={
                                qty >= Math.min(selectedProduct.stock, 10) ? T.textMuted : T.text
                              }
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Delivery Instructions */}
                      <View style={styles.deliveryInputBox}>
                        <Text style={styles.priceLabel}>DELIVERY INSTRUCTIONS (OPTIONAL)</Text>
                        <TextInput
                          style={styles.deliveryInput}
                          placeholder="E.g., Next to building X, call me on arrival..."
                          placeholderTextColor={T.textSub}
                          value={deliveryInstructions}
                          onChangeText={setDeliveryInstructions}
                        />
                      </View>

                      <Text
                        style={[
                          styles.stockInfo,
                          {
                            color: soldOut
                              ? T.red
                              : selectedProduct.stock <= 5
                                ? T.secondary
                                : T.textSub,
                          },
                        ]}
                      >
                        {soldOut ? 'Out of stock' : `${selectedProduct.stock} units available`}
                      </Text>

                      {!canAfford && (
                        <Text style={{ color: T.red, fontSize: 12, marginBottom: 12, marginTop: -4 }}>
                          Insufficient balance — need ETB{' '}
                          {fmtETB(totalCost - ((balance as any) || 0), 0)} more
                        </Text>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.buyNowBtn,
                          (buying || soldOut || !canAfford) && { opacity: 0.5 },
                        ]}
                        onPress={handleBuy}
                        disabled={buying || soldOut || !canAfford}
                      >
                        {buying ? (
                          <ActivityIndicator color={T.bg} />
                        ) : (
                          <>
                            <Ionicons
                              name="lock-closed"
                              size={16}
                              color={T.bg}
                              style={{ marginRight: 8 }}
                            />
                            <Text style={styles.buyNowText}>
                              {soldOut
                                ? 'Out of Stock'
                                : !canAfford
                                  ? 'Insufficient Balance'
                                  : `Buy Now · ETB ${fmtETB(totalCost, 0)}`}
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

// ——————————————————————————————————————————————————————————————————————————————————————————————
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: T.glass,
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 28) + 12,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerGreeting: {
    fontSize: 11,
    color: T.textSub,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.primaryDim,
    borderWidth: 1,
    borderColor: T.primary + '40',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  balanceText: { fontSize: 13, fontWeight: '700', color: T.primary },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: T.text, fontWeight: '500' },

  // Category pills
  pillRow: {},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
  },
  pillText: { fontSize: 12, color: T.textSub, fontWeight: '600' },

  // Section header
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  sectionSub: { fontSize: 12, color: T.textSub },

  // Featured
  featuredCard: {
    width: SW * 0.78,
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
  },
  featuredImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  featuredGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%' },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  featuredBadge: {
    backgroundColor: T.primary + '20',
    borderWidth: 1,
    borderColor: T.primary + '60',
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  featuredBadgeText: { fontSize: 9, fontWeight: '800', color: T.primary, letterSpacing: 1 },
  featuredName: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4, lineHeight: 22 },
  featuredPrice: { fontSize: 15, fontWeight: '700', color: T.primary },
  lowStockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: T.secondaryDim,
    borderWidth: 1,
    borderColor: T.secondary + '60',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lowStockText: { fontSize: 9, fontWeight: '800', color: T.secondary },

  // Product grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  productCard: {
    width: (SW - 52) / 2,
    backgroundColor: T.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
  },
  productImgWrap: { height: 145, position: 'relative' },
  productImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  stockLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  stockLabelText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  productBody: { padding: 12 },
  productCat: {
    fontSize: 9,
    color: T.textSub,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  productName: { fontSize: 13, fontWeight: '700', color: T.text, lineHeight: 17, marginBottom: 10 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 15, fontWeight: '800', color: T.primary },
  buyQuickBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: T.primaryDim,
    borderWidth: 1,
    borderColor: T.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Skeleton
  skeletonCard: { width: (SW - 52) / 2, borderRadius: 14, overflow: 'hidden' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: T.text, marginTop: 16, marginBottom: 6 },
  emptySub: { fontSize: 13, color: T.textSub, textAlign: 'center' },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: SH * 0.92,
  },
  modalImgWrap: { height: 240, position: 'relative' },
  modalImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  conditionText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  modalCat: {
    fontSize: 10,
    color: T.primary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: T.text,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  modalDesc: { fontSize: 14, color: T.textSub, lineHeight: 21, marginBottom: 20 },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 12,
  },
  sellerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: T.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerLabel: {
    fontSize: 9,
    color: T.textSub,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  sellerName: { fontSize: 13, fontWeight: '700', color: T.text },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chatBtnText: { fontSize: 12, color: T.primary, fontWeight: '700' },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.primaryDim,
    borderWidth: 1,
    borderColor: T.primary + '30',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  escrowBadgeText: { flex: 1, fontSize: 12, color: T.primary, fontWeight: '600', lineHeight: 17 },
  divider: { height: 1, backgroundColor: T.border, marginBottom: 20 },
  buyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 10,
    color: T.textSub,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  priceValue: { fontSize: 28, fontWeight: '800', color: T.text },
  priceTotal: { fontSize: 12, color: T.textSub, marginTop: 2 },
  qtyPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: T.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: 16, fontWeight: '700', color: T.text, minWidth: 28, textAlign: 'center' },
  stockInfo: { fontSize: 12, marginBottom: 12, fontWeight: '600' },
  buyNowBtn: {
    backgroundColor: T.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowText: { color: T.bg, fontSize: 15, fontWeight: '800' },
  deliveryInputBox: { marginTop: 16, marginBottom: 4 },
  deliveryInput: {
    backgroundColor: T.bg,
    borderRadius: 8,
    padding: 12,
    color: T.text,
    marginTop: 8,
    borderWidth: 1,
    borderColor: T.border,
    fontSize: 13,
  },
});

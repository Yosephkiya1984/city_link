import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StatusBar,
  TextInput,
  ImageBackground,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFood, FoodTab } from '../../hooks/useFood';
import { foodStyles as S, NOIR } from './FoodScreen.styles';
import { Fonts } from '../../theme';
import { fmtETB, t } from '../../utils';
import { CButton } from '../../components/ui/CButton';
import { Screen } from '../../components/ui/Screen';
import { Surface } from '../../components/ui/Surface';
import { Typography } from '../../components/ui/Typography';
import { ProcessingOverlay } from '../../components/layout/ProcessingOverlay';
import { SuccessOverlay } from '../../components/layout/SuccessOverlay';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS: { id: FoodTab; icon: string; label: string }[] = [
  { id: 'delivery', icon: 'bicycle', label: t('delivery') },
  { id: 'booking', icon: 'calendar', label: t('book_table') },
  { id: 'tonight', icon: 'moon', label: t('tonight') },
];

// ─── Venue / Restaurant Card ──────────────────────────────────────────────────
const VenueCard = ({ r, onPress }: { r: any; onPress: () => void }) => {
  const heroUri = r.banner_url || r.cover_photo_url;
  const deliveryTime = r.avg_delivery_minutes ?? 30;
  const deliveryFee = r.delivery_fee ?? 0;
  return (
    <TouchableOpacity style={S.venueCard} onPress={onPress} activeOpacity={0.88}>
      <ImageBackground
        source={heroUri ? { uri: heroUri } : undefined}
        style={S.venueCover}
        imageStyle={{ borderRadius: 18 }}
      >
        {!heroUri && (
          <View
            style={{
              flex: 1,
              backgroundColor: NOIR.card,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="restaurant" size={48} color={NOIR.hint} />
          </View>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.88)']} style={S.venueGradient}>
          {/* Status badge */}
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 10,
              backgroundColor: r.is_open ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)',
              borderWidth: 1,
              borderColor: r.is_open ? '#10B98160' : '#EF444460',
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 0.5,
                color: r.is_open ? '#10B981' : '#EF4444',
              }}
            >
              {r.is_open ? '● OPEN' : '● CLOSED'}
            </Text>
          </View>
          <View>
            <Text style={S.venueName} numberOfLines={1}>
              {r.name}
            </Text>
            <View style={S.venueMeta}>
              <Ionicons name="star" size={11} color={NOIR.gold} />
              <Text style={S.venueRating}>{r.rating ? r.rating.toFixed(1) : 'New'}</Text>
              <View style={S.venueDot} />
              <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.6)" />
              <Text style={S.venueCategory}>{deliveryTime} min</Text>
              <View style={S.venueDot} />
              <Text style={S.venueCategory}>
                {deliveryFee === 0 ? 'Free delivery' : `ETB ${deliveryFee} delivery`}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
};

// ─── Event Card ───────────────────────────────────────────────────────────────
const EventCard = ({ item, onPress }: { item: any; onPress: () => void }) => {
  const price = item.ticket_price ?? item.cover_charge ?? 0;
  const spotsLeft = item.available_capacity ?? 0;
  return (
    <TouchableOpacity style={S.eventCard} onPress={onPress} activeOpacity={0.88}>
      <ImageBackground
        source={{ uri: item.cover_url }}
        style={{ flex: 1 }}
        imageStyle={{ borderRadius: 20 }}
      >
        <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.88)']} style={S.eventGradient}>
          <BlurView
            intensity={35}
            tint="dark"
            style={[S.eventBadge, { borderColor: spotsLeft > 0 ? '#10B98140' : '#EF444440' }]}
          >
            <View
              style={[S.eventDot, { backgroundColor: spotsLeft > 0 ? '#10B981' : '#EF4444' }]}
            />
            <Text style={[S.eventBadgeTxt, { color: spotsLeft > 0 ? '#10B981' : '#EF4444' }]}>
              {spotsLeft > 0 ? t('spots_left', { count: spotsLeft }) : t('out_of_stock')}
            </Text>
          </BlurView>
          <View style={S.eventFooter}>
            <Text style={S.eventTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={S.eventDate}>
              {new Date(item.event_date).toLocaleDateString('en-ET', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
              {price > 0 ? `  ·  ETB ${fmtETB(price, 0)}` : `  ·  ${t('free_entry')}`}
            </Text>
            {item.merchant?.business_name && (
              <Text style={S.eventVenue}>@ {item.merchant.business_name}</Text>
            )}
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
};

export default function FoodScreen() {
  const {
    activeTab,
    setActiveTab,
    restaurants,
    loading,
    loadError,
    events,
    eventsLoading,
    selectedEvent,
    setSelectedEvent,
    selectedRest,
    setSelectedRest,
    menuItems,
    menuLoading,
    cart,
    cartTotal,
    cartCount,
    addToCart,
    removeFromCart,
    balance,
    selectRestaurant,
    placeFoodOrder,
    shippingAddress,
    setShippingAddress,
    coords,
    locationLoading,
    detectLocation,
    guestCount,
    setGuestCount,
    reservationTime,
    setReservationTime,
    restaurantTables,
    selectedTable,
    setSelectedTable,
    createTableReservation,
    buyEventTicket,
  } = useFood();

  const [orderProcessing, setOrderProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const handleOrder = async () => {
    setOrderProcessing(true);
    try {
      if (activeTab === 'delivery') {
        await placeFoodOrder();
      } else {
        await createTableReservation();
      }
      setOrderSuccess(true);
    } catch (e: any) {
      // Toast is shown inside the hook
    } finally {
      setOrderProcessing(false);
    }
  };

  const handleTicketPurchase = async () => {
    if (!selectedEvent) return;
    setOrderProcessing(true);
    try {
      await buyEventTicket(selectedEvent.id, guestCount);
      setOrderSuccess(true);
    } catch (e: any) {
      //
    } finally {
      setOrderProcessing(false);
    }
  };

  // ─── Content for each tab ───────────────────────────────────────────────────
  const renderRestaurantList = () => {
    if (loading) {
      return (
        <View style={S.emptyBox}>
          <ActivityIndicator color={NOIR.gold} size="large" />
          <Text style={S.emptyText}>{t('finding_venues')}</Text>
        </View>
      );
    }
    if (loadError) {
      return (
        <View style={S.emptyBox}>
          <Ionicons name="wifi-outline" size={48} color={NOIR.hint} />
          <Text style={S.emptyTitle}>{t('could_not_connect')}</Text>
          <Text style={S.emptyText}>{t('check_internet')}</Text>
        </View>
      );
    }
    if (restaurants.length === 0) {
      return (
        <View style={S.emptyBox}>
          <Ionicons name="restaurant-outline" size={48} color={NOIR.hint} />
          <Text style={S.emptyTitle}>{t('no_venues_yet')}</Text>
          <Text style={S.emptyText}>{t('merchants_appear_here')}</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={restaurants}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => <VenueCard r={r} onPress={() => selectRestaurant(r)} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderEventsTab = () => {
    if (eventsLoading) {
      return (
        <View style={S.emptyBox}>
          <ActivityIndicator color={NOIR.gold} size="large" />
          <Text style={S.emptyText}>{t('loading_events')}</Text>
        </View>
      );
    }
    if (events.length === 0) {
      return (
        <View style={S.emptyBox}>
          <Ionicons name="moon-outline" size={48} color={NOIR.hint} />
          <Text style={S.emptyTitle}>{t('nothing_tonight')}</Text>
          <Text style={S.emptyText}>{t('venues_post_daily')}</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EventCard item={item} onPress={() => setSelectedEvent(item)} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Screen style={S.container} safeArea={false}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <BlurView intensity={20} tint="dark" style={S.header}>
        <View style={S.headerRow}>
          <View>
            <Text style={S.headerSub}>CITYLINK</Text>
            <Text style={S.headerTitle}>{t('addis_gourmet')}</Text>
          </View>
          <BlurView intensity={30} tint="dark" style={S.locationPill}>
            <Ionicons name="location" size={13} color={NOIR.gold} />
            <Text style={S.locationText}>{t('addis_ababa')}</Text>
          </BlurView>
        </View>

        {/* ── Tab Strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.tabStrip}
        >
          {TABS.map((t) => {
            const active = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(t.id);
                }}
                style={[S.tabBtn, active && S.tabBtnActive]}
              >
                <Ionicons
                  name={t.icon as any}
                  size={15}
                  color={active ? '#000' : NOIR.sub}
                  style={{ marginRight: 5 }}
                />
                <Text style={[S.tabBtnTxt, active && S.tabBtnTxtActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </BlurView>

      {/* ── Content Area ── */}
      <View style={{ flex: 1 }}>
        {activeTab === 'tonight' ? renderEventsTab() : renderRestaurantList()}
      </View>

      {/* ══════════════════════════════════════════════════
          Restaurant / Booking Bottom Sheet
          ══════════════════════════════════════════════════ */}
      <Modal visible={!!selectedRest} transparent animationType="slide" statusBarTranslucent>
        <View style={S.backdrop} />
        {selectedRest && (
          <View style={S.sheet}>
            <View style={S.sheetHandle} />

            {/* ── Hero Banner ── */}
            {selectedRest.banner_url || selectedRest.cover_photo_url ? (
              <ImageBackground
                source={{ uri: selectedRest.banner_url || selectedRest.cover_photo_url }}
                style={{ width: '100%', height: 170 }}
              >
                <LinearGradient
                  colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.92)']}
                  style={{ flex: 1, padding: 16, justifyContent: 'flex-end' }}
                >
                  <Text style={[S.sheetTitle, { marginBottom: 4 }]} numberOfLines={1}>
                    {selectedRest.name}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    {selectedRest.rating > 0 && (
                      <Text style={{ color: NOIR.gold, fontSize: 12, fontWeight: '700' }}>
                        ★ {selectedRest.rating?.toFixed(1)}
                      </Text>
                    )}
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                      ⏱ {selectedRest.avg_delivery_minutes ?? 30} min
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                      {(selectedRest.delivery_fee ?? 0) === 0
                        ? '🛵 Free delivery'
                        : `ETB ${selectedRest.delivery_fee} delivery`}
                    </Text>
                    {selectedRest.min_order > 0 && (
                      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                        Min: ETB {selectedRest.min_order}
                      </Text>
                    )}
                  </View>
                </LinearGradient>
                <TouchableOpacity
                  style={[
                    S.closeBtn,
                    {
                      position: 'absolute',
                      top: 10,
                      right: 12,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                    },
                  ]}
                  onPress={() => setSelectedRest(null)}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </ImageBackground>
            ) : (
              <View style={S.sheetHead}>
                <View style={{ flex: 1 }}>
                  <Text style={S.sheetTitle} numberOfLines={1}>
                    {selectedRest.name}
                  </Text>
                  <Text style={S.sheetSubtitle}>
                    {selectedRest.category || t('restaurant')} · Addis Ababa
                  </Text>
                </View>
                <TouchableOpacity style={S.closeBtn} onPress={() => setSelectedRest(null)}>
                  <Ionicons name="close" size={20} color={NOIR.sub} />
                </TouchableOpacity>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* ── DELIVERY MODE ── */}
              {activeTab === 'delivery' && (
                <>
                  {menuLoading ? (
                    <View style={S.emptyBox}>
                      <ActivityIndicator color={NOIR.gold} />
                      <Text style={S.emptyText}>{t('loading_menu')}</Text>
                    </View>
                  ) : menuItems.length === 0 ? (
                    <View style={S.emptyBox}>
                      <Ionicons name="fast-food-outline" size={40} color={NOIR.hint} />
                      <Text style={S.emptyText}>{t('no_menu_items')}</Text>
                    </View>
                  ) : (
                    menuItems.map((item) => (
                      <View
                        key={item.id}
                        style={[S.menuRow, { alignItems: 'flex-start', paddingVertical: 16 }]}
                      >
                        {/* Food Image */}
                        <View
                          style={{
                            width: 90,
                            height: 90,
                            borderRadius: 16,
                            overflow: 'hidden',
                            backgroundColor: NOIR.surface,
                            marginRight: 14,
                            flexShrink: 0,
                          }}
                        >
                          {item.image_url ? (
                            <ImageBackground
                              source={{ uri: item.image_url }}
                              style={{ flex: 1 }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View
                              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Ionicons name="fast-food" size={28} color={NOIR.hint} />
                            </View>
                          )}
                          {item.is_featured && (
                            <View
                              style={{
                                position: 'absolute',
                                top: 4,
                                left: 4,
                                backgroundColor: NOIR.gold,
                                paddingHorizontal: 5,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ color: '#000', fontSize: 8, fontWeight: '800' }}>
                                ★ TOP
                              </Text>
                            </View>
                          )}
                        </View>
                        {/* Info */}
                        <View style={{ flex: 1 }}>
                          <Text style={S.menuItemName}>{item.name}</Text>
                          {!!item.description && (
                            <Text style={S.menuItemDesc} numberOfLines={2}>
                              {item.description}
                            </Text>
                          )}
                          <View
                            style={{
                              flexDirection: 'row',
                              gap: 6,
                              marginBottom: 8,
                              flexWrap: 'wrap',
                            }}
                          >
                            {item.is_vegetarian && (
                              <View
                                style={{
                                  backgroundColor: '#10B98115',
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: '#10B98140',
                                }}
                              >
                                <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>
                                  🌿 Veg
                                </Text>
                              </View>
                            )}
                            {item.prep_minutes > 0 && (
                              <View
                                style={{
                                  backgroundColor: NOIR.surface,
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ color: NOIR.sub, fontSize: 10 }}>
                                  ⏱ {item.prep_minutes}m
                                </Text>
                              </View>
                            )}
                            {item.spice_level > 0 && (
                              <Text style={{ fontSize: 10 }}>
                                {'🌶'.repeat(Math.min(item.spice_level, 3))}
                              </Text>
                            )}
                          </View>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Text style={S.menuItemPrice}>ETB {fmtETB(item.price, 0)}</Text>
                            {(cart[item.id] ?? 0) > 0 ? (
                              <View style={S.qtyCtrl}>
                                <TouchableOpacity
                                  style={S.qtyBtn}
                                  onPress={() => removeFromCart(item.id)}
                                >
                                  <Ionicons name="remove" size={16} color={NOIR.text} />
                                </TouchableOpacity>
                                <Text style={S.qtyVal}>{cart[item.id]}</Text>
                                <TouchableOpacity
                                  style={S.qtyBtn}
                                  onPress={() => addToCart(item.id)}
                                >
                                  <Ionicons name="add" size={16} color={NOIR.gold} />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <TouchableOpacity style={S.addBtn} onPress={() => addToCart(item.id)}>
                                <Ionicons name="add" size={20} color="#000" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    ))
                  )}

                  {cartCount > 0 && (
                    <View style={S.cartFooter}>
                      <View style={S.cartSummary}>
                        <Text style={S.cartLabel}>{t('items_count', { count: cartCount })}</Text>
                        <Text style={S.cartTotal}>ETB {fmtETB(cartTotal, 0)}</Text>
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <Text style={S.fieldLabel}>{t('delivery_address_label')}</Text>
                        <TouchableOpacity
                          onPress={detectLocation}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          disabled={locationLoading}
                        >
                          {locationLoading ? (
                            <ActivityIndicator size="small" color={NOIR.gold} />
                          ) : (
                            <>
                              <Ionicons
                                name={coords ? 'location' : 'location-outline'}
                                size={14}
                                color={coords ? '#10B981' : NOIR.gold}
                              />
                              <Text
                                style={{
                                  color: coords ? '#10B981' : NOIR.gold,
                                  fontSize: 12,
                                  fontFamily: Fonts.bold,
                                }}
                              >
                                {coords ? t('location_locked') : t('use_my_location')}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={S.textInput}
                        placeholder={t('street_building_placeholder')}
                        placeholderTextColor={NOIR.hint}
                        value={shippingAddress}
                        onChangeText={setShippingAddress}
                      />
                      <CButton
                        title={`🛵  ${t('place_order_total', { total: fmtETB(cartTotal, 0) })}`}
                        onPress={handleOrder}
                      />
                    </View>
                  )}
                </>
              )}

              {/* ── BOOKING / RESERVE MODE ── */}
              {activeTab === 'booking' && (
                <View style={{ padding: 20, gap: 18 }}>
                  {/* Live Table Setup */}
                  <View>
                    <Text style={S.spotSelectionTitle}>{t('select_table')}</Text>
                    <View style={S.spotGrid}>
                      {restaurantTables.map((table) => {
                        const isSelected = selectedTable === table.id;
                        const isOccupied = table.status === 'OCCUPIED';
                        const isVIP = table.is_vip;
                        return (
                          <TouchableOpacity
                            key={table.id}
                            disabled={isOccupied}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setSelectedTable(table.id);
                            }}
                            style={[
                              S.spotButton,
                              isOccupied
                                ? S.spotOccupied
                                : isVIP
                                  ? {
                                      ...S.spotAvailable,
                                      borderColor: '#A855F7',
                                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                    }
                                  : isSelected
                                    ? S.spotSelected
                                    : S.spotAvailable,
                            ]}
                            activeOpacity={0.8}
                          >
                            {isVIP && (
                              <Ionicons
                                name="star"
                                size={10}
                                color="#A855F7"
                                style={{ marginBottom: 2 }}
                              />
                            )}
                            <Text
                              style={[
                                S.spotText,
                                isOccupied
                                  ? S.spotTextOccupied
                                  : isVIP
                                    ? { color: '#A855F7' }
                                    : isSelected
                                      ? S.spotTextSelected
                                      : S.spotTextAvailable,
                              ]}
                            >
                              T{table.table_number}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={S.spotLegend}>
                      <View style={S.legendItem}>
                        <View
                          style={[
                            S.legendDot,
                            { backgroundColor: 'rgba(89, 222, 155, 0.2)', borderColor: '#59de9b' },
                          ]}
                        />
                        <Text style={S.legendText}>{t('available')}</Text>
                      </View>
                      <View style={S.legendItem}>
                        <View
                          style={[
                            S.legendDot,
                            { backgroundColor: 'rgba(212, 175, 55, 0.2)', borderColor: '#D4AF37' },
                          ]}
                        />
                        <Text style={S.legendText}>{t('selected')}</Text>
                      </View>
                      <View style={S.legendItem}>
                        <View
                          style={[
                            S.legendDot,
                            { backgroundColor: 'rgba(255, 90, 76, 0.2)', borderColor: '#ff5a4c' },
                          ]}
                        />
                        <Text style={S.legendText}>{t('occupied')}</Text>
                      </View>
                      <View style={S.legendItem}>
                        <View
                          style={[
                            S.legendDot,
                            { backgroundColor: 'rgba(168, 85, 247, 0.2)', borderColor: '#A855F7' },
                          ]}
                        />
                        <Text style={S.legendText}>VIP</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={S.fieldLabel}>{t('num_guests')}</Text>
                  <View style={S.chipRow}>
                    {[1, 2, 4, 6, 8, 10].map((n) => {
                      const sel = guestCount === n;
                      return (
                        <TouchableOpacity
                          key={n}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setGuestCount(n);
                          }}
                          style={[S.guestChip, sel && S.guestChipActive]}
                        >
                          <Ionicons name="people" size={14} color={sel ? '#000' : NOIR.sub} />
                          <Text style={[S.guestChipTxt, sel && { color: '#000' }]}>{n}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={S.fieldLabel}>{t('date_time')}</Text>
                  <TextInput
                    style={S.textInput}
                    placeholder="YYYY-MM-DD HH:MM  (e.g. 2026-04-30 19:30)"
                    placeholderTextColor={NOIR.hint}
                    value={reservationTime}
                    onChangeText={setReservationTime}
                  />

                  <View style={S.depositBox}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
                    <Text style={S.depositText}>
                      {t('deposit_desc', { amount: guestCount * 100 })}
                    </Text>
                  </View>

                  <CButton
                    title={
                      selectedTable
                        ? `🍷  ${t('confirm_table', { num: restaurantTables.find((t) => t.id === selectedTable)?.table_number })}`
                        : `🍷  ${t('select_a_table')}`
                    }
                    onPress={handleOrder}
                    disabled={!selectedTable}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════
          Event Ticket Modal
          ══════════════════════════════════════════════════ */}
      <Modal visible={!!selectedEvent} transparent animationType="slide" statusBarTranslucent>
        <View style={S.backdrop} />
        {selectedEvent && (
          <View style={S.sheet}>
            <View style={S.sheetHandle} />

            <View style={S.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={S.sheetTitle} numberOfLines={2}>
                  {selectedEvent.title}
                </Text>
                <Text style={S.sheetSubtitle}>
                  {new Date(selectedEvent.event_date).toLocaleString('en-ET', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <TouchableOpacity style={S.closeBtn} onPress={() => setSelectedEvent(null)}>
                <Ionicons name="close" size={20} color={NOIR.sub} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Info Row */}
              <View style={S.eventInfoRow}>
                {[
                  {
                    icon: 'ticket-outline',
                    label: t('price'),
                    val:
                      (selectedEvent.ticket_price ?? selectedEvent.cover_charge ?? 0) > 0
                        ? `ETB ${fmtETB(selectedEvent.ticket_price ?? selectedEvent.cover_charge ?? 0, 0)}`
                        : t('free'),
                  },
                  {
                    icon: 'people-outline',
                    label: t('spots_left_up'),
                    val: `${selectedEvent.available_capacity ?? 0}`,
                  },
                  {
                    icon: 'location-outline',
                    label: t('venue'),
                    val:
                      selectedEvent.venue || selectedEvent.merchant?.business_name || 'Main Stage',
                  },
                ].map((row) => (
                  <View key={row.label} style={S.infoCell}>
                    <Ionicons name={row.icon as any} size={20} color={NOIR.gold} />
                    <Text style={S.infoCellLabel}>{row.label}</Text>
                    <Text style={S.infoCellVal}>{row.val}</Text>
                  </View>
                ))}
              </View>

              {!!selectedEvent.description && (
                <Text style={S.eventDesc}>{selectedEvent.description}</Text>
              )}

              <Text style={[S.fieldLabel, { marginHorizontal: 20, marginTop: 20 }]}>
                {t('tickets')}
              </Text>
              <View style={[S.chipRow, { paddingHorizontal: 20 }]}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const sel = guestCount === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setGuestCount(n);
                      }}
                      style={[S.guestChip, sel && S.guestChipActive]}
                    >
                      <Text style={[S.guestChipTxt, sel && { color: '#000' }]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ padding: 20 }}>
                <CButton
                  title={
                    (selectedEvent.ticket_price ?? selectedEvent.cover_charge ?? 0) > 0
                      ? `🎟  ${t('buy_tickets', { count: guestCount, total: fmtETB((selectedEvent.ticket_price ?? selectedEvent.cover_charge ?? 0) * guestCount, 0) })}`
                      : `🎟  ${t('reserve_free_tickets', { count: guestCount })}`
                  }
                  onPress={handleTicketPurchase}
                />
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      <ProcessingOverlay visible={orderProcessing} message={t('processing')} />
      <SuccessOverlay
        visible={orderSuccess}
        title={activeTab === 'delivery' ? t('order_placed_emoji') : t('table_reserved_emoji')}
        subtitle={
          activeTab === 'delivery' ? t('meal_prepared_desc') : t('reservation_confirmed_desc')
        }
        onClose={() => {
          setOrderSuccess(false);
          setSelectedRest(null);
          setSelectedEvent(null);
        }}
      />
    </Screen>
  );
}

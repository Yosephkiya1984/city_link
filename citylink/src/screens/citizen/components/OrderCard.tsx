import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { Fonts } from '../../../theme';
import { fmtETB, t } from '../../../utils';
import { useCountdown } from '../../../hooks/useCountdown';
import { myOrdersStyles as styles } from '../MyOrdersScreen.styles';
import { Surface } from '../../../components/ui/Surface';
import { Typography } from '../../../components/ui/Typography';
import { WalletPinModal } from '../../../components/WalletPinModal';
import { revealMarketplaceOrderPin } from '../../../services/marketplace.service';
import { revealFoodOrderPin } from '../../../services/food.service';
import {
  verifyWalletPin,
  verifyWalletPinAndGetHash,
  getCurrentPinHash,
  hasWalletPin,
} from '../../../services/walletPin';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import { MarketplaceOrder } from '../../../types';

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PAID: { icon: 'time-outline', label: () => t('ready_dispatch').toUpperCase() },
  DISPATCHING: { icon: 'search-outline', label: () => t('finding_agent').toUpperCase() },
  AGENT_ASSIGNED: { icon: 'person-outline', label: () => t('agent_en_route').toUpperCase() },
  SHIPPED: { icon: 'bicycle-outline', label: () => t('picked_up').toUpperCase() },
  IN_TRANSIT: { icon: 'bicycle-outline', label: () => t('on_the_way').toUpperCase() },
  AWAITING_PIN: { icon: 'home-outline', label: () => t('arrived').toUpperCase() },
  DISPUTED: { icon: 'warning-outline', label: () => t('disputed_up') },
  COMPLETED: { icon: 'checkmark-circle-outline', label: () => t('completed_up') },
  CANCELLED: { icon: 'close-circle-outline', label: () => t('cancelled_up') },
  // ── Reservation-specific ──
  PENDING: { icon: 'time-outline', label: () => 'PENDING CONFIRM' },
  CONFIRMED: { icon: 'calendar-outline', label: () => 'CONFIRMED' },
  ARRIVED: { icon: 'checkmark-done-outline', label: () => 'CHECKED IN' },
};

const getStatusStyle = (status: string, C: any) => {
  switch (status) {
    case 'PAID':
    case 'ORDER_PLACED':
      return { bg: C.primary + '15', text: C.primary, border: C.primary + '40' };
    case 'DISPATCHING':
    case 'PREPARING':
      return { bg: '#60a5fa15', text: '#60a5fa', border: '#60a5fa40' };
    case 'AGENT_ASSIGNED':
      return { bg: '#818cf815', text: '#818cf8', border: '#818cf840' };
    case 'SHIPPED':
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY':
      return { bg: '#f59e0b15', text: '#f59e0b', border: '#f59e0b40' };
    case 'AWAITING_PIN':
      return { bg: '#10b98115', text: '#10b981', border: '#10b98140' };
    case 'COMPLETED':
    case 'DELIVERED':
      return { bg: C.primary + '15', text: C.primary, border: C.primary + '40' };
    case 'CANCELLED':
      return { bg: '#64748b15', text: '#64748b', border: '#64748b40' };
    // ── Reservation-specific ──
    case 'PENDING':
      return { bg: '#f59e0b15', text: '#f59e0b', border: '#f59e0b40' };
    case 'CONFIRMED':
      return { bg: '#10b98115', text: '#10b981', border: '#10b98140' };
    case 'ARRIVED':
      return { bg: C.primary + '15', text: C.primary, border: C.primary + '40' };
    default:
      return { bg: C.surface, text: C.sub, border: C.edge };
  }
};

const EscrowStatus = ({ order, C }: { order: any; C: any }) => {
  const isReservation = (order as any).type === 'reservation';
  const config: Record<string, any> = {
    PAID: { icon: 'lock-closed', text: t('funds_locked_escrow'), color: '#f59e0b' },
    DISPATCHING: { icon: 'search', text: t('searching_delivery_partner'), color: '#60a5fa' },
    AGENT_ASSIGNED: { icon: 'person', text: t('agent_assigned_heading'), color: '#818cf8' },
    IN_TRANSIT: { icon: 'bicycle', text: t('agent_picked_up_msg'), color: '#f59e0b' },
    AWAITING_PIN: { icon: 'home', text: t('agent_arrived_msg'), color: '#10b981' },
    SHIPPED: { icon: 'bicycle', text: t('merchant_shipped_msg'), color: C.primary },
    COMPLETED: { icon: 'checkmark-circle', text: t('escrow_released_msg'), color: '#8b5cf6' },
    DISPUTED: { icon: 'shield', text: t('funds_frozen_dispute'), color: '#E8312A' },
    CANCELLED: { icon: 'arrow-undo', text: t('funds_refunded_wallet'), color: '#64748b' },
    // ── Reservation escrow states ──
    PENDING: { icon: 'lock-closed', text: 'Deposit held · Awaiting restaurant confirmation', color: '#f59e0b' },
    CONFIRMED: { icon: 'lock-closed', text: 'Deposit secured · Show PIN at restaurant', color: '#10b981' },
    ARRIVED: { icon: 'checkmark-circle', text: 'Checked in · Deposit released to restaurant', color: '#8b5cf6' },
  };
  const c = config[order.status] || config['PAID'];
  return (
    <View
      style={[styles.escrowRow, { backgroundColor: c.color + '12', borderColor: c.color + '30' }]}
    >
      <Ionicons name={c.icon} size={14} color={c.color} />
      <Text style={[styles.escrowText, { color: c.color }]}>{c.text}</Text>
    </View>
  );
};

export const OrderCard = ({
  order: initialOrder,
  C,
  onDispute,
  onCancel,
  onReject,
  onViewReceipt,
  navigation,
}: {
  order: MarketplaceOrder;
  C: any;
  onDispute: (order: MarketplaceOrder) => void;
  onCancel?: (order: MarketplaceOrder) => void;
  onReject?: (order: MarketplaceOrder) => void;
  onViewReceipt: (order: MarketplaceOrder) => void;
  navigation: any;
}) => {
  const [order, setOrder] = useState(initialOrder);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isPinRevealed, setIsPinRevealed] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pinError, setPinError] = useState<string>();

  const { currentUser: user } = useAuthStore();
  const { showToast } = useSystemStore();
  const countdownText = useCountdown(order);
  const statusStyle = getStatusStyle(order.status, C);
  const statusConf =
    STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['PAID'];

  const TRACKER_STEPS = [t('paid'), t('dispatched'), t('on_route'), t('arrived')];

  // ── Reservation countdown ────────────────────────────────────────────────
  const [resCountdown, setResCountdown] = useState('');
  useEffect(() => {
    if ((order as any).type !== 'reservation' || !['CONFIRMED', 'PENDING'].includes(order.status)) return;
    const calcLabel = () => {
      const target = new Date((order as any).reservation_time).getTime();
      const diff = target - Date.now();
      if (diff <= 0) return 'Time has passed';
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      if (hrs >= 24) return `in ${Math.floor(hrs / 24)}d ${hrs % 24}h`;
      if (hrs > 0) return `in ${hrs}h ${mins}m`;
      return `in ${mins} minutes`;
    };
    setResCountdown(calcLabel());
    const iv = setInterval(() => setResCountdown(calcLabel()), 30000);
    return () => clearInterval(iv);
  }, [(order as any).reservation_time, order.status]);

  const handleRevealPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isPinRevealed) {
      setIsPinRevealed(false);
      return;
    }

    // 1. Try Biometrics
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('verify_identity_reveal_pin'),
        fallbackLabel: t('use_wallet_pin'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        const hash = await getCurrentPinHash(user?.id || '');
        return executeReveal(hash || undefined);
      }
    }

    // 2. Fallback to Wallet PIN Modal
    const hasPin = await hasWalletPin(user?.id || '');
    if (!hasPin) {
      // 🛡️ User hasn't set up a wallet PIN.
      // Allow reveal via session-auth only (RPC handles this).
      return executeReveal();
    }

    setShowPinModal(true);
  };

  const executeReveal = async (walletPinHash?: string) => {
    setIsVerifying(true);
    try {
      if ((order as any).type === 'reservation') {
        setIsPinRevealed(true);
        setShowPinModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      const isFood = (order as any).type === 'food';
      const revealFn = isFood ? revealFoodOrderPin : revealMarketplaceOrderPin;
      
      const res = await revealFn(order.id, walletPinHash);
      if (res.data?.ok || (res as any).ok) {
        const pin = (res as any).delivery_pin || (res as any).data?.delivery_pin;
        setOrder({ ...order, delivery_pin: pin });
        setIsPinRevealed(true);
        setShowPinModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const err = res.data?.error || t('verification_failed');
        setPinError(
          err === 'rate_limit_exceeded' ? t('too_many_attempts_retry') : t('verification_failed')
        );
        if (err === 'rate_limit_exceeded') {
          showToast(t('security_lock_attempts'), 'error');
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setPinError(t('verification_service_error'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleWalletPinVerify = async (pin: string) => {
    if (!user?.id) return;
    setIsVerifying(true);
    setPinError(undefined);

    try {
      const { ok, hash } = await verifyWalletPinAndGetHash(user.id, pin);
      if (ok) {
        // 🛡️ Bulletproof Server-Side Binding: We pass the cryptographic hash
        // that the server already has stored in public.profiles.pin_hash.
        await executeReveal(hash);
      } else {
        setPinError(t('invalid_wallet_pin'));
        setIsVerifying(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setPinError(t('verification_service_error'));
      setIsVerifying(false);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Surface
        variant="card"
        padding={16}
        onPressIn={() =>
          Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()
        }
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
        style={{ marginBottom: 16 }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.orderIcon, { backgroundColor: statusStyle.bg }]}>
            <Ionicons
              name={(order as any).type === 'food' ? 'restaurant-outline' : (order as any).type === 'reservation' ? 'calendar-outline' : 'bag-handle-outline'}
              size={22}
              color={statusStyle.text}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.productName, { color: C.text }]} numberOfLines={1}>
              {(order as any).type === 'food'
                ? (order as any).items?.[0]?.name || t('food_order')
                : (order as any).type === 'reservation'
                  ? `Reservation at ${(order as any).merchant?.full_name || 'Restaurant'}`
                  : order.product_name || t('product')}
            </Text>
            {order.merchant_name && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
                <Ionicons
                  name="storefront-outline"
                  size={10}
                  color={C.sub}
                  style={{ marginRight: 4 }}
                />
                <Text style={{ fontSize: 11, fontFamily: Fonts.medium, color: C.sub }}>
                  {t('sold_by', { name: order.merchant_name })}
                </Text>
              </View>
            )}
            <Text style={[styles.orderId, { color: C.sub }]}>
              #{order.id?.slice(0, 8).toUpperCase()} ·{' '}
              {(order as any).type === 'food'
                ? `${(order as any).items_count || 1} ${t('items')}`
                : (order as any).type === 'reservation'
                  ? `${(order as any).guest_count || 1} Guests`
                  : `${t('qty')} ${order.qty || 1}`}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
            ]}
          >
            <Ionicons name={statusConf.icon as any} size={11} color={statusStyle.text} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {statusConf.label()}
            </Text>
          </View>
        </View>

        {order.status === 'PAID' && (
          <View
            style={[
              styles.countdownRow,
              { backgroundColor: '#f59e0b10', borderColor: '#f59e0b25' },
            ]}
          >
            <Ionicons name="hourglass-outline" size={13} color="#f59e0b" />
            <Text style={styles.countdownText}>{countdownText}</Text>
          </View>
        )}

        {['DISPATCHING', 'AGENT_ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'AWAITING_PIN'].includes(
          order.status
        ) && (
          <View style={styles.trackerContainer}>
            <View style={styles.trackerSteps}>
              {TRACKER_STEPS.map((step, idx) => {
                let isPassed = false;
                if (idx === 0) isPassed = true;
                else if (idx === 1)
                  isPassed = [
                    'DISPATCHING',
                    'AGENT_ASSIGNED',
                    'SHIPPED',
                    'IN_TRANSIT',
                    'AWAITING_PIN',
                    'COMPLETED',
                  ].includes(order.status);
                else if (idx === 2)
                  isPassed = ['SHIPPED', 'IN_TRANSIT', 'AWAITING_PIN', 'COMPLETED'].includes(
                    order.status
                  );
                else if (idx === 3) isPassed = ['AWAITING_PIN', 'COMPLETED'].includes(order.status);

                return (
                  <View key={idx} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={[
                        styles.trackerDot,
                        isPassed
                          ? { backgroundColor: C.primary, borderColor: C.primary }
                          : { borderColor: C.edge, backgroundColor: C.ink },
                      ]}
                    />
                    {idx < 3 && (
                      <View
                        style={[
                          styles.trackerLine,
                          isPassed ? { backgroundColor: C.primary } : { backgroundColor: C.edge },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
            <View style={styles.trackerLabels}>
              <Text style={[styles.trackerLabelText, { color: C.text, textAlign: 'left' }]}>
                {t('paid')}
              </Text>
              <Text style={[styles.trackerLabelText, { color: C.text, textAlign: 'center' }]}>
                {t('dispatched')}
              </Text>
              <Text style={[styles.trackerLabelText, { color: C.text, textAlign: 'center' }]}>
                {t('on_route')}
              </Text>
              <Text style={[styles.trackerLabelText, { color: C.text, textAlign: 'right' }]}>
                {t('arrived')}
              </Text>
            </View>

            <LinearGradient
              colors={[C.primary + '15', C.primary + '05']}
              style={[styles.pinBox, { borderColor: C.primary + '40' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.pinBoxTitle, { color: C.primary }]}>
                  {order.status === 'AWAITING_PIN'
                    ? t('agent_arrived_give_pin')
                    : t('delivery_pin_protected')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text
                    style={[
                      styles.pinBoxValue,
                      { color: C.text, letterSpacing: isPinRevealed ? 4 : 2 },
                    ]}
                  >
                    {isPinRevealed ? order.delivery_pin : '••••••'}
                  </Text>
                  <TouchableOpacity
                    style={{
                      marginLeft: 12,
                      padding: 8,
                      backgroundColor: C.primary + '20',
                      borderRadius: 20,
                    }}
                    onPress={handleRevealPress}
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <ActivityIndicator size="small" color={C.primary} />
                    ) : (
                      <Ionicons
                        name={isPinRevealed ? 'eye-off' : 'lock-closed'}
                        size={18}
                        color={C.primary}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              {['IN_TRANSIT', 'AGENT_ASSIGNED', 'AWAITING_PIN'].includes(order.status) && (
                <TouchableOpacity
                  style={[styles.mapBtn, { backgroundColor: C.primary }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    navigation.navigate('TrackOrder', { orderId: order.id, order });
                  }}
                >
                  <Ionicons name="map" size={18} color="#000" />
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>
        )}



        {/* Reservation countdown row */}
        {(order as any).type === 'reservation' && resCountdown && ['CONFIRMED', 'PENDING'].includes(order.status) && (
          <View
            style={[
              styles.countdownRow,
              { backgroundColor: '#10b98110', borderColor: '#10b98125' },
            ]}
          >
            <Ionicons name="calendar-outline" size={13} color="#10b981" />
            <Text style={[styles.countdownText, { color: '#10b981' }]}>
              Your reservation is {resCountdown}
            </Text>
          </View>
        )}

        {(order as any).type === 'reservation' && (order as any).service_pin && (order.status === 'CONFIRMED' || order.status === 'PENDING') && (
          <View style={[styles.trackerContainer, { marginTop: 12 }]}>
            <LinearGradient
              colors={[C.primary + '15', C.primary + '05']}
              style={[styles.pinBox, { borderColor: C.primary + '40' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.pinBoxTitle, { color: C.primary }]}>
                  RESERVATION CHECK-IN PIN
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text
                    style={[
                      styles.pinBoxValue,
                      { color: C.text, letterSpacing: isPinRevealed ? 4 : 2 },
                    ]}
                  >
                    {isPinRevealed ? (order as any).service_pin : '••••'}
                  </Text>
                  <TouchableOpacity
                    style={{
                      marginLeft: 12,
                      padding: 8,
                      backgroundColor: C.primary + '20',
                      borderRadius: 20,
                    }}
                    onPress={handleRevealPress}
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <ActivityIndicator size="small" color={C.primary} />
                    ) : (
                      <Ionicons
                        name={isPinRevealed ? 'eye-off' : 'lock-closed'}
                        size={18}
                        color={C.primary}
                      />
                    )}
                  </TouchableOpacity>
                </View>
                {isPinRevealed && (
                  <Text style={{ fontSize: 10, color: C.sub, marginTop: 6, fontFamily: Fonts.medium }}>
                    Show this PIN to restaurant staff at check-in
                  </Text>
                )}
              </View>
            </LinearGradient>
          </View>
        )}

          {/* Pre-ordered items for reservations */}
          {(order as any).type === 'reservation' && (order as any).items?.length > 0 && (
            <View style={{ marginTop: 10, padding: 10, backgroundColor: C.lift, borderRadius: 10, borderWidth: 1, borderColor: C.edge }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Ionicons name="fast-food-outline" size={12} color={C.sub} />
                <Text style={{ fontSize: 10, fontFamily: Fonts.bold, color: C.sub, letterSpacing: 1 }}>PRE-ORDERED</Text>
              </View>
              {(order as any).items.map((item: any, idx: number) => (
                <Text key={idx} style={{ fontSize: 12, fontFamily: Fonts.medium, color: C.text, marginTop: 2 }}>
                  {item.quantity}× {item.product?.name}
                </Text>
              ))}
            </View>
          )}

        <View style={[styles.divider, { backgroundColor: C.edge }]} />
        <EscrowStatus order={order} C={C} />

        <View style={styles.cardFooter}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.priceLabel, { color: C.sub }]}>{t('total_paid')}</Text>
            <Text style={[styles.priceValue, { color: C.text }]}>
              ETB {fmtETB((order as any).type === 'reservation' ? (order as any).deposit_amount : order.total, 0)}
            </Text>
            <Text style={[styles.dateText, { color: C.sub }]} numberOfLines={1}>
              {(order as any).type === 'reservation' && (order as any).reservation_time ? (
                `Reserved for: ${new Date((order as any).reservation_time).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}`
              ) : (
                new Date(order.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              )}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={{
                padding: 10,
                backgroundColor: C.lift,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.edge,
              }}
              onPress={() => onViewReceipt(order)}
            >
              <Ionicons name="receipt-outline" size={20} color={C.primary} />
            </TouchableOpacity>

            {(order as any).type === 'reservation' ? (
              // ── Reservation actions ──
              ['PENDING', 'CONFIRMED'].includes(order.status) ? (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E8312A40',
                    backgroundColor: '#E8312A0d',
                  }}
                  onPress={() => onCancel?.(order)}
                >
                  <Ionicons name="close-circle-outline" size={14} color="#E8312A" />
                  <Text style={{ fontFamily: Fonts.bold, fontSize: 12, color: '#E8312A' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                  ]}
                >
                  <Ionicons name={statusConf.icon as any} size={14} color={statusStyle.text} />
                  <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                    {statusConf.label()}
                  </Text>
                </View>
              )
            ) : ['SHIPPED', 'AWAITING_PIN', 'DISPATCHING', 'AGENT_ASSIGNED', 'IN_TRANSIT'].includes(
              order.status
            ) ? (
              // ── Delivery actions ──
              <View style={styles.actionRow}>
                {order.status === 'AWAITING_PIN' && (
                  <TouchableOpacity
                    style={[styles.ghostBtn, { borderColor: '#E8312A50', marginRight: 8 }]}
                    onPress={() => onReject?.(order)}
                  >
                    <Text style={[styles.ghostBtnText, { color: '#E8312A' }]}>
                      {t('reject_delivery')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.ghostBtn, { borderColor: '#E8312A50' }]}
                  onPress={() => onDispute(order)}
                >
                  <Text style={[styles.ghostBtnText, { color: '#E8312A' }]}>{t('dispute')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                ]}
              >
                <Ionicons name={statusConf.icon as any} size={14} color={statusStyle.text} />
                <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                  {order.status === 'COMPLETED' ? t('done') : statusConf.label()}
                </Text>
              </View>
            )}
          </View>
        </View>

        <WalletPinModal
          isVisible={showPinModal}
          onClose={() => setShowPinModal(false)}
          onVerify={handleWalletPinVerify}
          isVerifying={isVerifying}
          error={pinError}
          C={C}
        />
      </Surface>
    </Animated.View>
  );
};

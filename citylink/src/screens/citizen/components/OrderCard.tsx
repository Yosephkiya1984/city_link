import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { Fonts } from '../../../theme';
import { fmtETB } from '../../../utils';
import { useCountdown } from '../../../hooks/useCountdown';
import { myOrdersStyles as styles } from '../MyOrdersScreen.styles';
import { WalletPinModal } from '../../../components/WalletPinModal';
import { revealMarketplaceOrderPin } from '../../../services/marketplace.service';
import {
  verifyWalletPin,
  verifyWalletPinAndGetHash,
  getCurrentPinHash,
  hasWalletPin,
} from '../../../services/walletPin';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PAID: { icon: 'time-outline', label: 'READY FOR DISPATCH' },
  DISPATCHING: { icon: 'search-outline', label: 'FINDING AGENT' },
  AGENT_ASSIGNED: { icon: 'person-outline', label: 'AGENT EN ROUTE' },
  SHIPPED: { icon: 'bicycle-outline', label: 'PICKED UP' },
  IN_TRANSIT: { icon: 'bicycle-outline', label: 'ON THE WAY' },
  AWAITING_PIN: { icon: 'home-outline', label: 'ARRIVED' },
  DISPUTED: { icon: 'warning-outline', label: 'DISPUTED' },
  COMPLETED: { icon: 'checkmark-circle-outline', label: 'COMPLETED' },
  CANCELLED: { icon: 'close-circle-outline', label: 'CANCELLED' },
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
    default:
      return { bg: C.surface, text: C.sub, border: C.edge };
  }
};

const EscrowStatus = ({ order, C }: { order: any; C: any }) => {
  const config: Record<string, any> = {
    PAID: {
      icon: 'lock-closed',
      text: 'Funds locked in escrow — safe until delivery',
      color: '#f59e0b',
    },
    DISPATCHING: {
      icon: 'search',
      text: 'Searching for a nearby delivery partner',
      color: '#60a5fa',
    },
    AGENT_ASSIGNED: {
      icon: 'person',
      text: 'Delivery agent assigned and heading to merchant',
      color: '#818cf8',
    },
    IN_TRANSIT: {
      icon: 'bicycle',
      text: 'Agent has picked up your order and is on the way',
      color: '#f59e0b',
    },
    AWAITING_PIN: {
      icon: 'home',
      text: 'Agent is at your location — provide PIN to finish',
      color: '#10b981',
    },
    SHIPPED: { icon: 'bicycle', text: 'Merchant has shipped the order', color: C.primary },
    COMPLETED: {
      icon: 'checkmark-circle',
      text: 'Escrow released and order completed',
      color: '#8b5cf6',
    },
    DISPUTED: { icon: 'shield', text: 'Funds frozen — dispute under review', color: '#E8312A' },
    CANCELLED: { icon: 'arrow-undo', text: 'Funds refunded to your wallet', color: '#64748b' },
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
  navigation,
}: any) => {
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

  const TRACKER_STEPS = ['Paid', 'Dispatched', 'On Route', 'Arrived'];

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
        promptMessage: 'Verify identity to reveal Delivery PIN',
        fallbackLabel: 'Use Wallet PIN',
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
      const res = await revealMarketplaceOrderPin(order.id, walletPinHash);
      if (res.data?.ok) {
        setOrder({ ...order, delivery_pin: res.data.delivery_pin });
        setIsPinRevealed(true);
        setShowPinModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const err = res.data?.error || 'Failed to reveal PIN';
        setPinError(
          err === 'rate_limit_exceeded'
            ? 'Too many reveal attempts. Try again in 30 mins.'
            : 'Verification failed'
        );
        if (err === 'rate_limit_exceeded') {
          showToast('Security Lock: Too many reveal attempts', 'error');
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setPinError('Service unavailable');
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
        setPinError('Invalid Wallet PIN');
        setIsVerifying(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setPinError('Verification service error');
      setIsVerifying(false);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={() =>
          Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()
        }
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
        style={[styles.card, { backgroundColor: C.surface, borderColor: C.edge }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.orderIcon, { backgroundColor: statusStyle.bg }]}>
            <Ionicons
              name={order.type === 'food' ? 'restaurant-outline' : 'bag-handle-outline'}
              size={22}
              color={statusStyle.text}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.productName, { color: C.text }]} numberOfLines={1}>
              {order.type === 'food'
                ? order.items?.[0]?.name || 'Food Order'
                : order.product_name || 'Product'}
            </Text>
            <Text style={[styles.orderId, { color: C.sub }]}>
              #{order.id?.slice(0, 8).toUpperCase()} ·{' '}
              {order.type === 'food' ? `${order.items_count || 1} items` : `Qty ${order.qty || 1}`}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
            ]}
          >
            <Ionicons name={statusConf.icon as any} size={11} color={statusStyle.text} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusConf.label}</Text>
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
                Paid
              </Text>
              <Text style={[styles.trackerLabelText, { color: C.text, textAlign: 'center' }]}>
                Dispatched
              </Text>
              <Text style={[styles.trackerLabelText, { color: C.text, textAlign: 'center' }]}>
                On Route
              </Text>
              <Text style={[styles.trackerLabelText, { color: C.text, textAlign: 'right' }]}>
                Arrived
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
                    ? '⚠️ Agent arrived! Give PIN to driver:'
                    : 'Delivery PIN (Shield protected)'}
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

        <View style={[styles.divider, { backgroundColor: C.edge }]} />
        <EscrowStatus order={order} C={C} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={[styles.priceLabel, { color: C.sub }]}>TOTAL PAID</Text>
            <Text style={[styles.priceValue, { color: C.text }]}>ETB {fmtETB(order.total, 0)}</Text>
            <Text style={[styles.dateText, { color: C.sub }]}>
              {new Date(order.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>

          {['SHIPPED', 'AWAITING_PIN', 'DISPATCHING', 'AGENT_ASSIGNED', 'IN_TRANSIT'].includes(
            order.status
          ) ? (
            <View style={styles.actionRow}>
              {order.status === 'AWAITING_PIN' && (
                <TouchableOpacity
                  style={[styles.ghostBtn, { borderColor: '#E8312A50', marginRight: 8 }]}
                  onPress={() => onReject?.(order)}
                >
                  <Text style={[styles.ghostBtnText, { color: '#E8312A' }]}>Reject Delivery</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.ghostBtn, { borderColor: '#E8312A50' }]}
                onPress={() => onDispute(order)}
              >
                <Text style={[styles.ghostBtnText, { color: '#E8312A' }]}>Dispute</Text>
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
                {order.status === 'COMPLETED' ? 'Done' : order.status}
              </Text>
            </View>
          )}
        </View>

        <WalletPinModal
          isVisible={showPinModal}
          onClose={() => setShowPinModal(false)}
          onVerify={handleWalletPinVerify}
          isVerifying={isVerifying}
          error={pinError}
          C={C}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Fonts, Shadow } from '../../theme';
import { fmtETB } from '../../utils';
import { t } from '../../utils/i18n';
import {
  fetchMarketplaceOrdersByBuyer,
  openMarketplaceDispute,
  rpcCancelAndRefundOrder,
} from '../../services/marketplace.service';
import { fetchMyFoodOrders } from '../../services/food.service';
import { subscribeToTable, unsubscribe } from '../../services/supabase';

import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

function useTheme() {
  const isDark = useAppStore((s) => s.isDark);
  return isDark ? DarkColors : Colors;
}

// â”€â”€ Expiry Countdown (uses real expires_at from DB, falls back to estimate) â”€â”€
function useCountdown(order: any) {
  const getTarget = () => {
    if (order.expires_at) return new Date(order.expires_at);
    // Fallback: estimate 72h from creation
    return new Date(new Date(order.created_at).getTime() + 72 * 3600 * 1000);
  };

  const [msLeft, setMsLeft] = useState(() => Math.max(0, getTarget().getTime() - Date.now()));

  useEffect(() => {
    if (order.status !== 'PAID') return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, getTarget().getTime() - Date.now());
      setMsLeft(remaining);
    }, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [order.id, order.status]);

  if (msLeft <= 0) return 'Expired';
  const hrs = Math.floor(msLeft / 3600000);
  const mins = Math.floor((msLeft % 3600000) / 60000);
  if (hrs > 0) return `Auto-cancels in ${hrs}h`;
  return `Auto-cancels in ${mins}m`;
}

// â”€â”€ Status Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_CONFIG = {
  PAID: { icon: 'time-outline', label: 'READY FOR DISPATCH' },
  DISPATCHING: { icon: 'search-outline', label: 'FINDING AGENT' },
  AGENT_ASSIGNED: { icon: 'person-outline', label: 'AGENT EN ROUTE' }, // Heading to merchant
  SHIPPED: { icon: 'bicycle-outline', label: 'PICKED UP' }, // Merchant + Agent confirmed
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

// â”€â”€ Escrow Status Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EscrowStatus = ({ order, C }: { order: any, C: any }) => {
  const config: Record<string, any> = {
    PAID: {
      icon: 'lock-closed',
      text: 'Funds locked in escrow â€” safe until delivery',
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
      text: 'Agent is at your location â€” provide PIN to finish',
      color: '#10b981',
    },
    SHIPPED: { icon: 'bicycle', text: 'Merchant has shipped the order', color: C.primary },
    COMPLETED: {
      icon: 'checkmark-circle',
      text: 'Escrow released and order completed',
      color: '#8b5cf6',
    },
    DISPUTED: { icon: 'shield', text: 'Funds frozen â€” dispute under review', color: '#E8312A' },
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

// â”€â”€ Order Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AnimatedOrderCard = ({ order, C, onDispute, onCancel, navigation }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const countdownText = useCountdown(order);
  const statusStyle = getStatusStyle(order.status, C);
  const statusConf = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['PAID'];

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
        {/* Card Header */}
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
                ? order.items_json?.[0]?.name || 'Food Order'
                : order.product_name || 'Product'}
            </Text>
            <Text style={[styles.orderId, { color: C.sub }]}>
              #{order.id?.slice(0, 8).toUpperCase()} Â·{' '}
              {order.type === 'food'
                ? `${order.items_count || 1} items`
                : `Qty ${order.quantity || 1}`}
            </Text>
            {order.type === 'food' && (
              <Text
                style={{ fontFamily: Fonts.bold, fontSize: 10, color: C.primary, marginTop: 2 }}
              >
                ðŸ• {order.restaurant_name || 'Restaurant'}
              </Text>
            )}
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

        {/* Expiry countdown for PAID orders */}
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

        {/* Delivery Progress Tracker & PIN */}
        {['DISPATCHING', 'AGENT_ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'AWAITING_PIN'].includes(
          order.status
        ) && (
          <View style={styles.trackerContainer}>
            <View style={styles.trackerSteps}>
              {['Paid', 'Dispatched', 'On Route', 'Arrived'].map((step, idx) => {
                let isActive = false;
                let isPassed = false;

                if (idx === 0) {
                  isActive = order.status === 'PAID';
                  isPassed = true;
                } else if (idx === 1) {
                  isActive = ['DISPATCHING', 'AGENT_ASSIGNED'].includes(order.status);
                  isPassed = [
                    'DISPATCHING',
                    'AGENT_ASSIGNED',
                    'SHIPPED',
                    'IN_TRANSIT',
                    'AWAITING_PIN',
                    'COMPLETED',
                  ].includes(order.status);
                } else if (idx === 2) {
                  isActive = ['SHIPPED', 'IN_TRANSIT'].includes(order.status);
                  isPassed = ['SHIPPED', 'IN_TRANSIT', 'AWAITING_PIN', 'COMPLETED'].includes(
                    order.status
                  );
                } else if (idx === 3) {
                  isActive = order.status === 'AWAITING_PIN';
                  isPassed = ['AWAITING_PIN', 'COMPLETED'].includes(order.status);
                }

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
                          isPassed && !isActive
                            ? { backgroundColor: C.primary }
                            : { backgroundColor: C.edge },
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

            {/* Prominent PIN Display */}
            {order.delivery_pin && (
              <LinearGradient
                colors={[C.primary + '15', C.primary + '05']}
                style={[styles.pinBox, { borderColor: C.primary + '40' }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View>
                  <Text style={[styles.pinBoxTitle, { color: C.primary }]}>
                    {order.status === 'AWAITING_PIN'
                      ? 'âš ï¸ Agent arrived! Give this PIN to driver:'
                      : 'Delivery PIN (Keep safe)'}
                  </Text>
                  <Text style={[styles.pinBoxValue, { color: C.text }]}>{order.delivery_pin}</Text>
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
            )}
          </View>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: C.edge }]} />

        {/* Escrow Status */}
        <EscrowStatus order={order} C={C} />

        {/* Footer */}
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
              <TouchableOpacity
                style={[styles.ghostBtn, { borderColor: '#E8312A50' }]}
                onPress={() => onDispute(order)}
              >
                <Text style={[styles.ghostBtnText, { color: '#E8312A' }]}>Dispute</Text>
              </TouchableOpacity>
            </View>
          ) : order.status === 'PAID' ? (
            <TouchableOpacity
              style={[styles.ghostBtn, { borderColor: C.edge }]}
              onPress={() => onCancel(order)}
            >
              <Text style={[styles.ghostBtnText, { color: C.sub }]}>Cancel Order</Text>
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
                {order.status === 'COMPLETED' ? 'Done' : order.status}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function MyOrdersScreen() {
  const navigation = useNavigation();
  const C = useTheme();
  const user = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);

  const [tab, setTab] = useState('active');
  const tabAnim = useRef(new Animated.Value(0)).current;
  const [mktOrders, setMktOrders] = useState([]);
  const [foodOrders, setFoodOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [promptConfig, setPromptConfig] = useState(null);
  const [promptInput, setPromptInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      console.log('🔧 Fetching consolidated orders for user:', user.id);
      const [mktRes, foodRes] = await Promise.all([
        fetchMarketplaceOrdersByBuyer(user.id),
        fetchMyFoodOrders(user.id),
      ]);

      if (mktRes.error) console.error('🔧 Mkt orders error:', mktRes.error);
      if (foodRes.error) console.error('🔧 Food orders error:', foodRes.error);

      setMktOrders((mktRes.data || []).map((o: any) => ({ ...o, type: 'marketplace' })));
      setFoodOrders((foodRes.data || []).map((o: any) => ({ ...o, type: 'food' })));
    } catch (e) {
      console.error('🔧 loadOrders crash:', e);
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadOrders();
    const ch = subscribeToTable(
      `buyer-orders-${user?.id}`,
      'marketplace_orders',
      `buyer_id=eq.${user?.id}`,
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          setMktOrders((prev) =>
            prev.map((o) =>
              o.id === payload.new.id ? { ...o, ...payload.new, type: 'marketplace' } : o
            )
          );
        } else if (payload.eventType === 'INSERT') {
          setMktOrders((prev) => [{ ...payload.new, type: 'marketplace' }, ...prev]);
        }
      }
    );

    const foodCh = subscribeToTable(
      `buyer-food-${user?.id}`,
      'food_orders',
      `citizen_id=eq.${user?.id}`,
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          setFoodOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new, type: 'food' } : o))
          );
        } else if (payload.eventType === 'INSERT') {
          setFoodOrders((prev) => [{ ...payload.new, type: 'food' }, ...prev]);
        }
      }
    );

    return () => {
      unsubscribe(ch);
      unsubscribe(foodCh);
    };
  }, [loadOrders, user?.id]);

  const switchTab = (newTab: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(tabAnim, {
      toValue: newTab === 'active' ? 0 : 1,
      useNativeDriver: false,
    }).start();
    setTab(newTab);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleDispute = (order: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPromptInput('');
    setPromptConfig({ type: 'dispute', order });
  };

  const handleCancelOrder = (order: any) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? Your funds will be fully returned to your wallet.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await rpcCancelAndRefundOrder(order.id, 'buyer_cancellation');
              showToast('Order cancelled and refunded', 'success');
            } catch (e) {
              showToast('Failed to cancel', 'error');
            }
          },
        },
      ]
    );
  };

  const executePromptAction = async () => {
    if (!promptConfig) return;
    const { type, order } = promptConfig;

    if (type === 'dispute') {
      if (!promptInput.trim()) {
        showToast('Please describe the issue', 'error');
        return;
      }
      setSubmitting(true);
      try {
        const res = await openMarketplaceDispute(order.id, user.id, promptInput.trim());
        if (res.ok) {
          showToast('Dispute raised. A CityLink agent will review it shortly.', 'success');
          setMktOrders((prev) =>
            prev.map((o) => (o.id === order.id ? { ...o, status: 'DISPUTED' } : o))
          );
          setPromptConfig(null);
        } else {
          showToast('Failed to raise dispute', 'error');
        }
      } catch (e) {
        showToast('Connection error', 'error');
      }
      setSubmitting(false);
    }
  };

  const combined = [...mktOrders, ...foodOrders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const activeOrders = combined.filter(
    (o) => !['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(o.status)
  );
  const historyOrders = combined.filter((o) =>
    ['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(o.status)
  );
  const displayed = tab === 'active' ? activeOrders : historyOrders;

  const tabIndicatorLeft = tabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '50%'] });

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title={t('orders') || 'My Orders'} />

      {/* Summary row */}
      <View style={[styles.summaryRow, { backgroundColor: C.surface, borderBottomColor: C.edge }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: C.text }]}>{activeOrders.length}</Text>
          <Text style={[styles.summaryLabel, { color: C.sub }]}>Active</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: C.edge }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: C.text }]}>{historyOrders.length}</Text>
          <Text style={[styles.summaryLabel, { color: C.sub }]}>Completed</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: C.edge }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: C.primary }]}>
            ETB{' '}
            {fmtETB(
              historyOrders.reduce((s, o) => s + Number(o.total || 0), 0),
              0
            )}
          </Text>
          <Text style={[styles.summaryLabel, { color: C.sub }]}>Total Spent</Text>
        </View>
      </View>

      {/* Animated Tab Switcher */}
      <View
        style={[styles.tabContainer, { backgroundColor: C.surface, borderBottomColor: C.edge }]}
      >
        <View style={[styles.segmentedControl, { backgroundColor: C.lift }]}>
          <Animated.View
            style={[styles.tabIndicator, { left: tabIndicatorLeft, backgroundColor: C.surface }]}
          />
          {['active', 'history'].map((tabKey) => {
            const isActive = tab === tabKey;
            return (
              <TouchableOpacity
                key={tabKey}
                onPress={() => switchTab(tabKey)}
                style={styles.segment}
              >
                <Text style={[styles.segmentText, { color: isActive ? C.text : C.sub }]}>
                  {tabKey === 'active'
                    ? `ACTIVE (${activeOrders.length})`
                    : `HISTORY (${historyOrders.length})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {displayed.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={64}
                color={C.edge}
                style={{ marginBottom: 16 }}
              />
              <Text style={[styles.emptyStateTitle, { color: C.text }]}>
                {tab === 'active' ? 'No Active Orders' : 'No Order History'}
              </Text>
              <Text style={[styles.emptyStateSub, { color: C.sub }]}>
                {tab === 'active'
                  ? 'Browse the marketplace and make your first purchase!'
                  : 'Your completed orders will appear here.'}
              </Text>
            </View>
          ) : (
            displayed.map((o) => (
              <AnimatedOrderCard
                key={o.id}
                order={o}
                C={C}
                onDispute={handleDispute}
                onCancel={handleCancelOrder}
                navigation={navigation}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Action Modal â€” raise dispute */}
      <Modal visible={!!promptConfig} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontFamily: Fonts.black, fontSize: 18, color: C.text }}>
                âš ï¸ Raise Dispute
              </Text>
              <TouchableOpacity onPress={() => setPromptConfig(null)} disabled={submitting}>
                <Ionicons name="close" size={22} color={C.sub} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 14,
                color: C.sub,
                marginBottom: 20,
                lineHeight: 20,
              }}
            >
              Describe your issue clearly. Escrow funds will be frozen until resolved.
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: C.lift, color: C.text }]}
              placeholder="e.g. Item not delivered, wrong item..."
              placeholderTextColor={C.sub}
              value={promptInput}
              onChangeText={setPromptInput}
              maxLength={200}
              autoFocus
              multiline
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPromptConfig(null)}
                disabled={submitting}
              >
                <Text style={{ color: C.sub, fontFamily: Fonts.bold }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: '#E8312A' },
                  submitting && { opacity: 0.6 },
                ]}
                onPress={executePromptAction}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontFamily: Fonts.bold }}>Submit Dispute</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontFamily: Fonts.black, fontSize: 18, marginBottom: 2 },
  summaryLabel: { fontFamily: Fonts.medium, fontSize: 11 },
  summaryDivider: { width: 1, height: 30 },

  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    width: '50%',
    top: 4,
    bottom: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', zIndex: 1 },
  segmentText: { fontFamily: Fonts.black, fontSize: 11, letterSpacing: 0.5 },

  scrollContent: { padding: 16, paddingBottom: 80 },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyStateTitle: { fontFamily: Fonts.black, fontSize: 18, marginBottom: 6 },
  emptyStateSub: { fontFamily: Fonts.medium, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    ...Shadow.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  orderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: { flex: 1 },
  productName: { fontFamily: Fonts.black, fontSize: 15, marginBottom: 3 },
  orderId: { fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 0.3 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: { fontFamily: Fonts.black, fontSize: 8, letterSpacing: 0.5 },

  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  countdownText: { fontFamily: Fonts.bold, fontSize: 12, color: '#f59e0b' },

  trackerContainer: { marginBottom: 16 },
  trackerSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    paddingRight: 10,
  },
  trackerDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  trackerLine: { flex: 1, height: 2, marginHorizontal: -2 },
  trackerLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginHorizontal: 5,
  },
  trackerLabelText: { fontFamily: Fonts.bold, fontSize: 10, width: 60 },
  pinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  pinBoxTitle: { fontFamily: Fonts.bold, fontSize: 11, marginBottom: 2 },
  pinBoxValue: { fontFamily: Fonts.black, fontSize: 24, letterSpacing: 4 },
  mapBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  divider: { height: 1, marginVertical: 14 },

  escrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  escrowText: { flex: 1, fontFamily: Fonts.bold, fontSize: 12, lineHeight: 16 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontFamily: Fonts.black, fontSize: 9, letterSpacing: 1, marginBottom: 2 },
  priceValue: { fontFamily: Fonts.black, fontSize: 20 },
  dateText: { fontFamily: Fonts.medium, fontSize: 10, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  ghostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: { fontFamily: Fonts.bold, fontSize: 13 },

  primaryBtn: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontFamily: Fonts.black, fontSize: 13 },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillText: { fontFamily: Fonts.bold, fontSize: 12 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalSheet: { borderRadius: 20, padding: 24 },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    fontFamily: Fonts.medium,
    fontSize: 15,
    marginBottom: 20,
    minHeight: 52,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 130,
    alignItems: 'center',
  },
});

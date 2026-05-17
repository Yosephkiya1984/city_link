import React, { useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { FlashList } from '@shopify/flash-list';
import { Typography, GlassCard, GlassView } from '../../../components';
import { fmtETB, fmtDateTime } from '../../../utils';
import { useTheme } from '../../../hooks/useTheme';
import { Radius, Spacing, Fonts, Shadow, D } from '../../../components/hospitality/HospitalityTheme';
import { MarketplaceOrder, Dispute, FoodOrder } from '../../../types/domain_types';
import { useRenderCount } from '../../../utils/debug/performanceMonitor';
import { t } from '../../../utils';

export interface DashboardOrdersTabProps {
  orders: (MarketplaceOrder | FoodOrder | any)[];
  openDisputes?: Dispute[];
  loading?: boolean;
  shipping?: boolean;
  handleMarkShipped?: (id: string) => void;
  handleConfirmPickup?: (id: string) => void;
  handleRetryDispatch?: (id: string) => void;
  handleCancelOrder?: (id: string) => void;
  onUpdateStatus?: (id: string, status: string) => void;
  handleMessageBuyer?: (id: string) => void;
  handleViewReceipt?: (order: any) => void;
  loadData?: () => void;
  isWaiter?: boolean;
}

export const DashboardOrdersTab = memo(function DashboardOrdersTab(props: DashboardOrdersTabProps) {
  useRenderCount('DashboardOrdersTab');
  const { 
    orders, 
    loading, 
    openDisputes,
    onUpdateStatus, 
    handleRetryDispatch, 
    handleCancelOrder,
    handleMarkShipped,
    handleMessageBuyer,
    handleViewReceipt,
    isWaiter = false
  } = props;
  
  const { isDark } = useTheme();
  const [filter, setFilter] = React.useState('ALL');
  const [visiblePins, setVisiblePins] = React.useState<Record<string, boolean>>({});

  const filteredOrders = useMemo(() => {
    if (filter === 'ALL') return orders;
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  if (loading) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={D.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 12 }}>
        <Typography variant="h2">Orders</Typography>
        <TouchableOpacity onPress={props.loadData} style={{ padding: 8 }}>
          <Ionicons name="refresh" size={20} color={D.primary} />
        </TouchableOpacity>
      </View>
      {/* Filter Bar */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.filterBar} 
        style={styles.filterBarScroll}
      >
        {['ALL', 'PENDING', 'PAID', 'DISPATCHING', 'AGENT_ASSIGNED', 'PREPARING', 'READY', 'SHIPPED', 'COMPLETED', 'CANCELLED'].map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && { backgroundColor: D.primary }]}
          >
            <Typography variant="label" style={{ color: filter === f ? D.ink : D.sub }}>{f}</Typography>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {openDisputes && openDisputes.length > 0 && (
        <View style={styles.disputeBanner}>
          <Ionicons name="warning" size={20} color={D.red} />
          <View style={{ marginLeft: 12 }}>
            <Typography variant="h3" style={{ color: D.blue }}>{openDisputes.length} Open Dispute{openDisputes.length > 1 ? 's' : ''}</Typography>
            <Typography variant="body" style={{ color: D.blue }}>{openDisputes[0].id.slice(0, 5)}</Typography>
          </View>
        </View>
      )}
      
      {orders.length > 0 && (
        <Typography variant="hint" style={{ marginBottom: 16, marginLeft: 4 }}>
          {orders.filter(o => ['PAID', 'PENDING', 'PREPARING', 'READY'].includes(o.status)).length} active shipments
        </Typography>
      )}

      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={64} color={D.sub} />
          <Typography variant="body" style={{ color: D.sub, marginTop: 10 }}>No orders yet</Typography>
        </View>
      ) : (
        <FlashList
          data={filteredOrders}
          estimatedItemSize={250}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isShopOrder = 
              !!item.product_name || 
              !!item.product_id || 
              item.type === 'product' || 
              item.type === 'MARKETPLACE' || 
              item._source?.toUpperCase() === 'MARKETPLACE' ||
              (!!item.buyer_id && !item.citizen_id);

            return (
              <GlassCard style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Typography variant="h3">{item.order_number || item.id.slice(0, 8).toUpperCase()}</Typography>
                    <Typography variant="hint">• {fmtDateTime(item.created_at).split(',')[0]}</Typography>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Typography variant="label" style={{ color: getStatusColor(item.status) }}>{item.status}</Typography>
                  </View>
                </View>

                {/* 🔑 Handover PIN Section - Inline Reveal */}
                {item.pickup_pin && visiblePins[item.id] && !['COMPLETED', 'CANCELLED', 'REJECTED', 'DELIVERED'].includes(item.status?.trim().toUpperCase()) && (
                  <MotiView 
                    from={{ opacity: 0, translateY: -10 }} 
                    animate={{ opacity: 1, translateY: 0 }}
                    style={{ 
                      backgroundColor: D.gold + '15', 
                      borderRadius: 16, 
                      padding: 16, 
                      marginTop: 16,
                      marginHorizontal: 16,
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: D.gold,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                    <View>
                      <Typography variant="hint" style={{ color: D.gold, letterSpacing: 1, fontSize: 10 }}>{t('pickup_pin_up') || 'PICKUP PIN (FOR AGENT)'}</Typography>
                      <Typography variant="h1" style={{ color: D.gold, fontSize: 32, letterSpacing: 6, fontWeight: '900' }}>{item.pickup_pin}</Typography>
                      <Typography variant="hint" style={{ marginTop: 4, fontSize: 10, opacity: 0.8 }}>
                        {t('give_secure_code_rider') || 'Give this secure code to the rider'}
                      </Typography>
                    </View>
                    <View style={{ backgroundColor: D.gold + '20', padding: 12, borderRadius: 12 }}>
                      <Ionicons name="key" size={28} color={D.gold} />
                    </View>
                  </MotiView>
                )}


                {isShopOrder ? (
                  <>
                    <View style={{ flexDirection: 'row', marginTop: 16, gap: 16 }}>
                      <View style={{ width: 48, height: 48, borderRadius: Radius.md, backgroundColor: D.green + '20', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="cube" size={24} color={D.green} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Typography variant="h2" style={{ fontSize: 18 }}>{item.product_name || 'Marketplace Item'}</Typography>
                        <Typography variant="hint" style={{ marginTop: 2 }}>
                          Quantity: {item.qty !== undefined ? item.qty : (item.items_count || 1)}
                        </Typography>
                        <Typography variant="h2" style={{ color: D.green, marginTop: 4 }}>{fmtETB(item.total || item.total_amount || 0)}</Typography>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Typography variant="hint" style={{ fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>
                          SHIPPING ADDRESS IS REQUIRED
                        </Typography>
                        <Typography variant="body" style={{ color: D.sub }}>
                          {item.shipping_address || 'Not provided'}
                        </Typography>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Typography variant="hint" style={{ fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>
                          ESCROW STATUS
                        </Typography>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="lock-closed" size={14} color={D.gold} />
                          <Typography variant="body" style={{ color: D.gold, fontWeight: 'bold' }}>
                            Funds Secured
                          </Typography>
                        </View>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.divider} />

                    <View style={styles.orderDetails}>
                      <Typography variant="body">
                        {item.items_summary ||
                          (item.items_count && item.items_count > 0
                            ? `${item.items_count} Item${item.items_count > 1 ? 's' : ''}`
                            : `${Math.max(1, (item.items || (item as any).order_items || []).length)} Item(s)`)}
                      </Typography>
                      <Typography variant="h2" style={{ color: D.primary }}>{fmtETB(item.total || item.total_amount || 0)}</Typography>
                    </View>
                  </>
                )}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {/* RESTAURANT ACTIONS */}
                  {item.status === 'PENDING' && !isShopOrder && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: D.green }]}
                      onPress={() => onUpdateStatus?.(item.id, 'PREPARING')}
                    >
                      <Typography variant="label" style={{ color: D.white }}>Accept</Typography>
                    </TouchableOpacity>
                  )}
                  {item.status === 'PREPARING' && !isShopOrder && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: D.primary }]}
                      onPress={() => onUpdateStatus?.(item.id, 'READY')}
                    >
                      <Typography variant="label" style={{ color: D.ink }}>Mark Ready</Typography>
                    </TouchableOpacity>
                  )}
                  {item.status === 'READY' && item._source === 'delivery' && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: D.gold }]}
                      onPress={() => handleRetryDispatch?.(item.id)}
                    >
                      <Typography variant="label" style={{ color: D.ink }}>Retry Dispatch</Typography>
                    </TouchableOpacity>
                  )}

                  {/* SHOP ACTIONS */}
                  {item.status === 'PAID' && isShopOrder && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: D.green, flexDirection: 'row', gap: 6 }]}
                      onPress={() => handleMarkShipped?.(item.id)}
                    >
                      <Ionicons name="cube-outline" size={18} color={D.ink} />
                      <Typography variant="label" style={{ color: D.ink }}>Mark Shipped</Typography>
                    </TouchableOpacity>
                  )}
                  
                  {['AGENT_ASSIGNED', 'DISPATCHING', 'READY'].includes(item.status) && isShopOrder && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: D.gold, flexDirection: 'row', gap: 6 }]}
                      onPress={() => {
                        if (item.pickup_pin) {
                          setVisiblePins(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                        } else {
                          props.handleConfirmPickup?.(item.id);
                        }
                      }}
                    >
                      <Ionicons name={item.pickup_pin && visiblePins[item.id] ? "eye-off" : "shield-checkmark"} size={18} color={D.ink} />
                      <Typography variant="label" style={{ color: D.ink }}>
                        {item.pickup_pin 
                          ? (visiblePins[item.id] ? "Hide Handover PIN" : "Show Handover PIN") 
                          : "Confirm Handover"}
                      </Typography>
                    </TouchableOpacity>
                  )}
                  
                  {['PAID', 'PENDING', 'PREPARING'].includes(item.status) && !isWaiter && (
                    <TouchableOpacity 
                      style={[styles.actionBtnOutline, { borderColor: D.red + '50' }]}
                      onPress={() => handleCancelOrder?.(item.id)}
                    >
                      <Typography variant="label" style={{ color: D.red }}>Cancel</Typography>
                    </TouchableOpacity>
                  )}
                  
                  {isShopOrder && (
                    <TouchableOpacity 
                      style={[styles.actionBtnOutline, { borderColor: D.green + '50', flexDirection: 'row', alignItems: 'center' }]}
                      onPress={() => handleMessageBuyer?.(item.id)}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color={D.green} />
                      <Typography variant="label" style={{ color: D.green, marginLeft: 4 }}>Message</Typography>
                    </TouchableOpacity>
                  )}
                  
                  {isShopOrder && (
                    <TouchableOpacity 
                      style={[styles.actionBtnOutline, { borderColor: D.sub + '50' }]}
                      onPress={() => handleViewReceipt?.(item)}
                    >
                      <Typography variant="label" style={{ color: D.sub }}>Details</Typography>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </GlassCard>
            );
          }}
        />
      )}
    </View>
  );
});

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return D.gold;
    case 'PAID': return D.green;
    case 'PREPARING': return D.primary;
    case 'READY': return D.green;
    case 'SHIPPED': return D.blue;
    case 'COMPLETED': return D.green;
    case 'CANCELLED': return D.red;
    default: return D.sub;
  }
};

const styles = StyleSheet.create({
  filterBarScroll: { 
    marginBottom: 20, 
    flexGrow: 0, 
    maxHeight: 50, // Prevent vertical stretching on web
  },
  filterBar: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 4,
  },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: D.surface, marginRight: 8, borderWidth: 1, borderColor: D.edge },
  orderCard: { padding: 16, borderRadius: Radius.lg, marginBottom: 16, backgroundColor: '#131A22', borderColor: D.edge, borderWidth: 1 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  divider: { height: 1, backgroundColor: D.edge, marginVertical: 16 },
  orderDetails: { marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  actionBtn: { paddingHorizontal: 24, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  actionBtnOutline: { paddingHorizontal: 20, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: 'transparent' },
  empty: { padding: 60, alignItems: 'center' },
  disputeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B1E36', padding: 16, borderRadius: Radius.lg, marginBottom: 16, borderWidth: 1, borderColor: '#1C3A5E' },
});

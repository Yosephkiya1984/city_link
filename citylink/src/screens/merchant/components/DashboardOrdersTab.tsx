import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { D, Radius, Fonts, Shadow } from './StitchTheme';
import { Typography, Surface } from '../../../components';
import { fmtETB, fmtDateTime } from '../../../utils';

export function DashboardOrdersTab({
  orders = [],
  openDisputes = [],
  loading = false,
  shipping = false,
  handleMarkShipped,
  handleConfirmPickup,
  handleRetryDispatch,
  handleCancelOrder,
  handleCompleteOrder,
  handleSettlePayment,
  handleMessageBuyer,
  handleFireReservation,
  handleViewReceipt,
  mode = 'shop',
  styles,
  t,
}: any) {
  const [filter, setFilter] = React.useState('all');

  const filtered = orders.filter((o: any) => {
    if (filter === 'all') return true;
    return o.status?.toLowerCase() === filter.toLowerCase();
  });

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (['pending', 'paid', 'placed'].includes(s)) return D.gold;
    if (['confirmed', 'shipped', 'preparing', 'accepted'].includes(s)) return D.blue;
    if (['processing', 'ready', 'dispatching', 'agent_assigned', 'in_transit'].includes(s)) return D.primary;
    if (['completed', 'delivered', 'settled'].includes(s)) return D.green;
    if (['cancelled', 'rejected'].includes(s)) return D.red;
    return D.sub;
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={localStyles.filterBar} contentContainerStyle={{ gap: 8 }}>
        {['all', 'pending', 'paid', 'confirmed', 'ready', 'dispatching', 'completed'].map((f: string) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[localStyles.filterChip, filter === f && { backgroundColor: D.primary }]}
          >
            <Typography variant="hint" style={{ color: filter === f ? D.ink : D.sub, textTransform: 'uppercase' }}>{f}</Typography>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {openDisputes?.length > 0 && (
        <Surface variant="lift" style={localStyles.alertBanner}>
          <Ionicons name="warning" size={20} color={D.red} />
          <Typography variant="hint" style={{ color: D.red, marginLeft: 8 }}>
            {openDisputes.length} OPEN DISPUTES
          </Typography>
        </Surface>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {filtered.length === 0 ? (
          <View style={localStyles.empty}>
            <Ionicons name="basket-outline" size={64} color={D.lift} />
            <Typography variant="title" color="sub">No orders found.</Typography>
          </View>
        ) : (
          filtered.map((order: any, i: number) => {
            const s = order.status?.toLowerCase();
            const isDelivery = order._source === 'delivery' || !!order.shipping_address;
            const isPreOrder = order.type === 'preorder' || order.order_type === 'pickup' || order.type === 'pickup';
            
            // KDS Header Color: Red (Delivery), Blue (Pre-order/Pickup), White (Default)
            const kdsHeaderColor = mode === 'restaurant' 
              ? (isDelivery ? D.red : isPreOrder ? D.blue : D.surface)
              : D.surface;

            return (
              <MotiView
                key={order.id}
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 50 }}
              >
                <Surface variant="lift" style={[localStyles.orderCard, mode === 'restaurant' && { borderLeftColor: kdsHeaderColor, borderLeftWidth: 8 }]}>
                  <View style={[localStyles.orderHeader, mode === 'restaurant' && { backgroundColor: kdsHeaderColor + '10', padding: 12, margin: -16, marginBottom: 12, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg }]}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {isDelivery && <Ionicons name="bicycle" size={16} color={D.red} />}
                        {isPreOrder && <Ionicons name="time" size={16} color={D.blue} />}
                        <Typography variant="title">Order #{order.id.slice(0, 8)}</Typography>
                        {order.status === 'FIRED' && (
                          <MotiView
                            from={{ opacity: 0.4, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1.1 }}
                            transition={{ loop: true, type: 'timing', duration: 1000 }}
                            style={{ backgroundColor: D.blue, width: 8, height: 8, borderRadius: 4 }}
                          />
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Typography variant="hint" color="sub">{fmtDateTime(order.created_at)}</Typography>
                        {order.fired_at && (
                          <Typography variant="hint" style={{ color: D.blue, fontWeight: 'bold' }}>
                            • {Math.floor((new Date().getTime() - new Date(order.fired_at).getTime()) / 60000)}m ago
                          </Typography>
                        )}
                      </View>
                    </View>
                    <View style={[localStyles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                      <View style={[localStyles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
                      <Typography variant="hint" style={{ color: getStatusColor(order.status) }}>{order.status?.toUpperCase()}</Typography>
                    </View>
                  </View>

                  <View style={localStyles.divider} />

                  <View style={localStyles.orderDetails}>
                    <Typography variant="body">
                      {order.items?.length || 0} items • {fmtETB(order.total_amount || order.total)}
                    </Typography>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Typography variant="hint" color="sub" numberOfLines={1}>
                        {order.shipping_address || 'Dine-In'}
                      </Typography>
                      {order.metadata?.arrival_preference && (
                        <View style={{ backgroundColor: D.blue + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm }}>
                          <Typography variant="hint" style={{ color: D.blue, fontSize: 10 }}>
                            ⏱ {order.metadata.arrival_preference === 'IMMEDIATE' ? 'Serve Now' : order.metadata.arrival_preference}
                          </Typography>
                        </View>
                      )}
                      {order.commission_amount > 0 && (
                        <View style={{ backgroundColor: D.gold + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm }}>
                          <Typography variant="hint" style={{ color: D.gold, fontSize: 10 }}>
                            🤝 Broker Attached
                          </Typography>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={localStyles.actions}>
                    {/* Action logic based on mode and status */}
                    {(s === 'pending' || s === 'paid' || s === 'placed') && handleMarkShipped && (
                      <TouchableOpacity 
                        style={[localStyles.actionBtn, { backgroundColor: D.primary }]}
                        onPress={() => handleMarkShipped(order.id)}
                        disabled={shipping}
                      >
                        <Typography variant="h3" style={{ color: D.ink }}>
                          {mode === 'restaurant' ? 'CONFIRM' : 'MARK SHIPPED'}
                        </Typography>
                      </TouchableOpacity>
                    )}

                    {(s === 'confirmed' || s === 'preparing' || s === 'accepted' || s === 'agent_assigned') && handleConfirmPickup && (
                      <TouchableOpacity 
                        style={[localStyles.actionBtn, { backgroundColor: s === 'agent_assigned' ? D.blue : D.gold }]}
                        onPress={() => handleConfirmPickup(order.id)}
                        disabled={shipping}
                      >
                        <Typography variant="h3" style={{ color: D.ink }}>
                          {mode === 'restaurant' 
                            ? (s === 'agent_assigned' ? 'HANDOVER' : 'READY') 
                            : 'CONFIRM PICKUP'}
                        </Typography>
                      </TouchableOpacity>
                    )}

                    {s === 'ready' && handleCompleteOrder && (
                      <TouchableOpacity 
                        style={[localStyles.actionBtn, { backgroundColor: D.green }]}
                        onPress={() => handleCompleteOrder(order.id)}
                        disabled={shipping}
                      >
                        <Typography variant="h3" style={{ color: D.white }}>COMPLETE</Typography>
                      </TouchableOpacity>
                    )}

                    {s === 'ready' && handleSettlePayment && (
                      <TouchableOpacity 
                        style={[localStyles.actionBtn, { backgroundColor: D.blue }]}
                        onPress={() => handleSettlePayment(order)}
                        disabled={shipping}
                      >
                        <Typography variant="h3" style={{ color: D.white }}>SETTLE</Typography>
                      </TouchableOpacity>
                    )}

                    {s === 'confirmed' && order.order_type === 'preorder' && handleFireReservation && (
                      <TouchableOpacity 
                        style={[localStyles.actionBtn, { backgroundColor: D.red }]}
                        onPress={() => handleFireReservation(order.id)}
                        disabled={shipping}
                      >
                        <Typography variant="h3" style={{ color: D.white }}>🔥 FIRE</Typography>
                      </TouchableOpacity>
                    )}

                    {s === 'dispatching' && handleRetryDispatch && (
                      <TouchableOpacity 
                        style={[localStyles.actionBtn, { backgroundColor: D.gold }]}
                        onPress={() => handleRetryDispatch(order.id, order._source === 'delivery' ? 'FOOD' : 'MARKETPLACE')}
                        disabled={shipping}
                      >
                        <Typography variant="h3" style={{ color: D.ink }}>RETRY</Typography>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                      style={[localStyles.actionBtn, { backgroundColor: D.surface, borderWidth: 1, borderColor: D.edge, flex: 0, paddingHorizontal: 12 }]}
                      onPress={() => handleMessageBuyer(order)}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color={D.text} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[localStyles.actionBtn, { backgroundColor: D.surface, borderWidth: 1, borderColor: D.edge, flex: 0, paddingHorizontal: 12 }]}
                      onPress={() => handleViewReceipt?.(order)}
                    >
                      <Ionicons name="receipt-outline" size={18} color={D.text} />
                    </TouchableOpacity>

                    {(s === 'pending' || s === 'paid') && handleCancelOrder && (
                      <TouchableOpacity 
                        style={[localStyles.actionBtn, { backgroundColor: D.red + '15', flex: 0, paddingHorizontal: 12 }]}
                        onPress={() => handleCancelOrder(order.id)}
                      >
                        <Ionicons name="close" size={18} color={D.red} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Surface>
              </MotiView>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  filterBar: { flexDirection: 'row', marginBottom: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: D.surface, marginRight: 8, borderWidth: 1, borderColor: D.edge },
  alertBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: Radius.md, backgroundColor: D.red + '10', marginBottom: 16, borderLeftWidth: 4, borderLeftColor: D.red },
  orderCard: { padding: 16, borderRadius: Radius.lg, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: D.primary },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  divider: { height: 1, backgroundColor: D.edge, marginVertical: 12 },
  orderDetails: { marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  actionBtn: { flex: 1, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 60, alignItems: 'center' },
});

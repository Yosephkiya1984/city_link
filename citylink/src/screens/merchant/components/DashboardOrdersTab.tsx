import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { FlashList } from '@shopify/flash-list';
import { Typography, GlassCard, GlassView } from '../../../components';
import { fmtETB, fmtDateTime } from '../../../utils';
import { useTheme } from '../../../hooks/useTheme';
import { Radius, Spacing, Fonts, Shadow, D } from '../../../components/hospitality/HospitalityTheme';

// Status color helper outside to avoid re-creation
const getStatusColor = (status: string, C: any) => {
  const s = status?.toLowerCase();
  if (['pending', 'paid', 'placed'].includes(s)) return C.gold;
  if (['confirmed', 'shipped', 'preparing', 'accepted'].includes(s)) return C.blue;
  if (['processing', 'ready', 'dispatching', 'agent_assigned', 'in_transit'].includes(s)) return C.primary;
  if (['completed', 'delivered', 'settled'].includes(s)) return C.green;
  if (['cancelled', 'rejected'].includes(s)) return C.red;
  return C.sub;
};

const OrderItem = React.memo(({ 
  order, 
  index, 
  C, 
  D, 
  mode, 
  shipping,
  handleMarkShipped,
  handleConfirmPickup,
  handleCompleteOrder,
  handleSettlePayment,
  handleFireReservation,
  handleRetryDispatch,
  handleMessageBuyer,
  handleViewReceipt,
  handleCancelOrder 
}: any) => {
  const s = order.status?.toLowerCase();
  const isDelivery = order._source === 'delivery' || !!order.shipping_address;
  const isPreOrder = order.type === 'preorder' || order.order_type === 'pickup' || order.type === 'pickup';
  const statusColor = getStatusColor(order.status, C);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: Math.min(index * 30, 300) }}
    >
      <GlassCard accentColor={statusColor} glow style={localStyles.orderCard}>
        <View style={{ padding: 16 }}>
          <View style={localStyles.orderHeader}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {isDelivery && <Ionicons name="bicycle" size={16} color={C.red} />}
                {isPreOrder && <Ionicons name="time" size={16} color={C.blue} />}
                <Typography variant="title">Order #{order.id.slice(0, 8)}</Typography>
                {order.status === 'FIRED' && (
                  <MotiView
                    from={{ opacity: 0.4, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1.1 }}
                    transition={{ loop: true, type: 'timing', duration: 1000 }}
                    style={{ backgroundColor: C.blue, width: 8, height: 8, borderRadius: 4 }}
                  />
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Typography variant="hint" color="sub">{fmtDateTime(order.created_at)}</Typography>
                {order.fired_at && (
                  <Typography variant="hint" style={{ color: C.blue, fontWeight: 'bold' }}>
                    • {Math.floor((new Date().getTime() - new Date(order.fired_at).getTime()) / 60000)}m ago
                  </Typography>
                )}
              </View>
            </View>
            <View style={[localStyles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <View style={[localStyles.statusDot, { backgroundColor: statusColor }]} />
              <Typography variant="hint" style={{ color: statusColor }}>{order.status?.toUpperCase()}</Typography>
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
            </View>
          </View>

          <View style={localStyles.actions}>
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
        </View>
      </GlassCard>
    </MotiView>
  );
});

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
  t,
}: any) {
  const C = useTheme();
  const [filter, setFilter] = React.useState('all');

  const filtered = useMemo(() => orders.filter((o: any) => {
    if (filter === 'all') return true;
    return o.status?.toLowerCase() === filter.toLowerCase();
  }), [orders, filter]);

  return (
    <View style={{ flex: 1 }}>
      <View>
        <FlashList
          horizontal
          data={['all', 'pending', 'paid', 'confirmed', 'ready', 'dispatching', 'completed']}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              onPress={() => setFilter(f)}
              style={[localStyles.filterChip, { borderColor: C.edge }, filter === f && { backgroundColor: C.primary, borderColor: C.primary }]}
            >
              <Typography variant="hint" style={{ color: filter === f ? '#000' : C.sub, textTransform: 'uppercase' }}>{f}</Typography>
            </TouchableOpacity>
          )}
          keyExtractor={f => f}
          estimatedItemSize={80}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}
          style={{ maxHeight: 60 }}
        />
      </View>

      {openDisputes?.length > 0 && (
        <GlassView variant="lift" style={[localStyles.alertBanner, { backgroundColor: C.red + '10' }]}>
          <Ionicons name="warning" size={20} color={C.red} />
          <Typography variant="hint" style={{ color: C.red, marginLeft: 8 }}>
            {openDisputes.length} OPEN DISPUTES
          </Typography>
        </GlassView>
      )}

      <FlashList
        data={filtered}
        renderItem={({ item, index }) => (
          <OrderItem 
            order={item}
            index={index}
            C={C}
            D={D}
            mode={mode}
            shipping={shipping}
            handleMarkShipped={handleMarkShipped}
            handleConfirmPickup={handleConfirmPickup}
            handleCompleteOrder={handleCompleteOrder}
            handleSettlePayment={handleSettlePayment}
            handleFireReservation={handleFireReservation}
            handleRetryDispatch={handleRetryDispatch}
            handleMessageBuyer={handleMessageBuyer}
            handleViewReceipt={handleViewReceipt}
            handleCancelOrder={handleCancelOrder}
          />
        )}
        keyExtractor={item => item.id}
        estimatedItemSize={200}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        ListEmptyComponent={!loading ? (
          <View style={localStyles.empty}>
            <Ionicons name="basket-outline" size={64} color={D.lift} />
            <Typography variant="title" color="sub">No orders found.</Typography>
          </View>
        ) : null}
      />
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

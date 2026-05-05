import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { D, Radius, Fonts, Shadow, Spacing } from './StitchTheme';
import { Typography, Surface } from '../../../components';
import { fmtDateTime } from '../../../utils';

const { width } = Dimensions.get('window');

export function RestaurantKDSTab({ orders, loading, onUpdateStatus, onRetryDispatch, t }: any) {
  const kitchenOrders = orders.filter((o: any) => 
    ['FIRED', 'COOKING', 'PREPARING', 'READY', 'PLACED', 'PAID', 'PENDING', 'DISPATCHING', 'AGENT_ASSIGNED'].includes(o.status?.toUpperCase())
  );

  // Calculate Aggregate Prep List (Chef's summary)
  const prepList = useMemo(() => {
    const list: Record<string, number> = {};
    kitchenOrders.forEach((o: any) => {
      if (o.status === 'READY') return;
      (o.items || []).forEach((item: any) => {
        list[item.name] = (list[item.name] || 0) + (item.quantity || 1);
      });
    });
    return Object.entries(list).sort((a, b) => b[1] - a[1]);
  }, [kitchenOrders]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={D.primary} />
      </View>
    );
  }

  if (kitchenOrders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MotiView
          from={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring' }}
        >
          <Ionicons name="restaurant-outline" size={80} color={D.lift} />
        </MotiView>
        <Typography variant="h2" color="sub" style={{ marginTop: 24 }}>Kitchen is Clear</Typography>
        <Typography variant="body" color="sub">No active orders in the queue.</Typography>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.kdsHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.statusDot} />
            <Typography variant="h3">KITCHEN MONITOR</Typography>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{kitchenOrders.length} TICKETS</Text>
            </View>
          </View>
        </View>
        <Typography variant="hint" color="sub">{fmtDateTime(new Date().toISOString())}</Typography>
      </View>

      {/* Aggregate Prep List - The "What to cook now" summary */}
      {prepList.length > 0 && (
        <Surface variant="flat" style={styles.prepSummary}>
          <Typography variant="hint" color="primary" style={styles.prepTitle}>CHEF'S PREP LIST (BULK)</Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prepScroll}>
            {prepList.map(([name, qty], idx) => (
              <View key={idx} style={styles.prepItem}>
                <Text style={styles.prepQty}>{qty}x</Text>
                <Text style={styles.prepName} numberOfLines={1}>{name}</Text>
              </View>
            ))}
          </ScrollView>
        </Surface>
      )}

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {kitchenOrders.map((order: any, index: number) => (
          <KDSTicket 
            key={order.id} 
            order={order} 
            index={index} 
            onUpdateStatus={onUpdateStatus}
            onRetryDispatch={onRetryDispatch}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function KDSTicket({ order, index, onUpdateStatus, onRetryDispatch }: any) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const firedAt = order.fired_at || order.created_at;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(firedAt).getTime()) / 1000 / 60);
      setElapsed(diff);
    }, 10000);
    
    setElapsed(Math.floor((Date.now() - new Date(firedAt).getTime()) / 1000 / 60));
    return () => clearInterval(interval);
  }, [order.fired_at, order.created_at]);

  const isLate = elapsed > 20;
  const isWarning = elapsed > 12;

  const statusColor = order.status === 'READY' ? D.green : isLate ? D.red : isWarning ? D.gold : D.blue;

  return (
    <MotiView
      from={{ opacity: 0, translateX: 50 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ delay: index * 100, type: 'spring' }}
      style={[styles.ticket, { borderTopColor: statusColor }]}
    >
      <View style={[styles.ticketHeader, isLate && { backgroundColor: D.red + '10' }]}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
             <Typography variant="h3">#{order.id.slice(-4).toUpperCase()}</Typography>
             {order.is_priority && <Ionicons name="flash" size={14} color={D.gold} style={{ marginLeft: 6 }} />}
          </View>
          <Typography variant="hint" color="sub">
            {order._source === 'delivery' || !!order.shipping_address ? '🚀 DELIVERY' : (order.table_number ? 'TABLE ' + order.table_number : 'WALK-IN')}
          </Typography>
        </View>
        <View style={[styles.timer, isLate && styles.timerLate, isWarning && !isLate && styles.timerWarning]}>
          <Text style={[styles.timerText, (isLate || isWarning) && { color: D.ink }]}>{elapsed}m</Text>
        </View>
      </View>

      <ScrollView style={styles.itemsScroll} showsVerticalScrollIndicator={false}>
        {(order.items || []).map((item: any, i: number) => (
          <View key={i} style={styles.itemRow}>
            <View style={[styles.itemQtyBox, { backgroundColor: statusColor + '15' }]}>
              <Text style={[styles.itemQtyText, { color: statusColor }]}>{item.quantity || 1}x</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemNameText}>{item.name}</Text>
              {item.notes && (
                <View style={styles.noteBox}>
                  <Ionicons name="information-circle" size={10} color={D.red} />
                  <Text style={styles.itemNotes}>{item.notes}</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.ticketFooter}>
        {order.status === 'DISPATCHING' ? (
          <TouchableOpacity 
            style={[styles.doneBtn, { backgroundColor: D.gold }]}
            onPress={() => onRetryDispatch?.(order.id, order._source === 'delivery' ? 'FOOD' : 'MARKETPLACE')}
          >
            <Ionicons name="refresh" size={20} color={D.ink} />
            <Text style={[styles.doneBtnText, { color: D.ink }]}>RETRY</Text>
          </TouchableOpacity>
        ) : order.status === 'AGENT_ASSIGNED' ? (
          <TouchableOpacity 
            style={[styles.doneBtn, { backgroundColor: D.blue }]}
            onPress={() => onUpdateStatus(order.id, 'READY')}
          >
            <Ionicons name="bicycle-outline" size={20} color={D.white} />
            <Text style={styles.doneBtnText}>HANDOVER</Text>
          </TouchableOpacity>
        ) : order.status === 'READY' ? (
          <TouchableOpacity 
            style={[styles.doneBtn, { backgroundColor: D.green }]}
            onPress={() => onUpdateStatus(order.id, 'COMPLETED')}
          >
            <Ionicons name="checkmark-done-circle" size={20} color={D.white} />
            <Text style={styles.doneBtnText}>COMPLETE</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.doneBtn, { backgroundColor: statusColor }]}
            onPress={() => onUpdateStatus(order.id, 'READY')}
          >
            <Ionicons name="checkmark-circle" size={20} color={D.white} />
            <Text style={styles.doneBtnText}>BUMP</Text>
          </TouchableOpacity>
        )}
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.ink, padding: Spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  kdsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: D.primary, marginRight: 10 },
  badge: { backgroundColor: D.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 12 },
  badgeText: { color: D.sub, fontSize: 10, fontFamily: Fonts.bold },
  
  // Prep Summary
  prepSummary: { 
    backgroundColor: D.surface, 
    borderRadius: Radius.l, 
    padding: 12, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: D.edge
  },
  prepTitle: { fontSize: 9, fontFamily: Fonts.black, letterSpacing: 1, marginBottom: 8 },
  prepScroll: { gap: 12 },
  prepItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: D.ink, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: D.edge
  },
  prepQty: { color: D.primary, fontFamily: Fonts.black, fontSize: 14, marginRight: 8 },
  prepName: { color: D.white, fontFamily: Fonts.bold, fontSize: 13 },

  scrollContent: { paddingRight: 40, paddingVertical: 10 },
  ticket: {
    width: width * 0.75,
    backgroundColor: D.surface,
    borderRadius: Radius.lg,
    marginRight: 16,
    borderTopWidth: 8,
    ...Shadow.lift,
    maxHeight: '90%'
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: D.edge
  },
  timer: {
    backgroundColor: D.lift,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center'
  },
  timerLate: { backgroundColor: D.red },
  timerWarning: { backgroundColor: D.gold },
  timerText: { fontSize: 16, fontFamily: Fonts.black, color: D.text },
  itemsScroll: { padding: 16, minHeight: 150 },
  itemRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  itemQtyBox: { 
    width: 32, 
    height: 32, 
    borderRadius: 6, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12
  },
  itemQtyText: { fontFamily: Fonts.black, fontSize: 12 },
  itemNameText: { color: D.text, fontFamily: Fonts.bold, fontSize: 16 },
  noteBox: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  itemNotes: { color: D.red, fontSize: 11, fontFamily: Fonts.medium },
  ticketFooter: { padding: 16, borderTopWidth: 1, borderTopColor: D.edge },
  doneBtn: { 
    height: 50, 
    borderRadius: Radius.md, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8
  },
  doneBtnText: { color: D.white, fontFamily: Fonts.black, fontSize: 16, letterSpacing: 1 },
});


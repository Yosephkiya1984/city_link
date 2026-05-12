import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, GlassCard, GlassView } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { fmtDate, fmtTime } from '../../../utils';
import { Radius, Spacing, Fonts, Shadow, D } from '../../../components/hospitality/HospitalityTheme';

export function HospitalityReservationsTab({ reservations, loading, onUpdateStatus, tables, merchantId, t }: any) {
  const C = useTheme();

  const pending = reservations.filter((r: any) => r.status === 'PENDING');
  const confirmed = reservations.filter((r: any) => r.status === 'CONFIRMED');

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: C.bg }]} contentContainerStyle={styles.content}>
        <View style={styles.topHeader}>
          <View>
            <Typography variant="h2">Reservations</Typography>
            <Typography variant="body" color="sub">{reservations.length} Active Bookings</Typography>
          </View>
        </View>

        <View style={styles.statsRow}>
          <GlassCard variant="outline" style={styles.statCard}>
            <Typography variant="h2">{pending.length}</Typography>
            <Typography variant="hint" color="sub">PENDING</Typography>
          </GlassCard>
          <GlassCard variant="outline" style={styles.statCard}>
            <Typography variant="h2">{confirmed.length}</Typography>
            <Typography variant="hint" color="sub">CONFIRMED</Typography>
          </GlassCard>
        </View>

        <Typography variant="hint" style={[styles.sectionTitle, { color: C.sub }]}>UPCOMING RESERVATIONS</Typography>

        {reservations.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={64} color={C.text} opacity={0.3} />
            <Typography variant="body" color="sub" style={{ marginTop: 16 }}>No reservations found</Typography>
          </View>
        ) : (
          reservations.map((res: any) => (
            <GlassCard key={res.id} accentColor={getStatusColor(res.status, C)} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.timeBox, { backgroundColor: C.primary }]}>
                  <Typography variant="body" style={[styles.timeText, { color: C.surface }]}>
                    {fmtTime(res.reservation_time)}
                  </Typography>
                  <Typography variant="hint" style={[styles.dateText, { color: C.surface }]}>
                    {fmtDate(res.reservation_time)}
                  </Typography>
                </View>
                <View style={styles.guestInfo}>
                  <Typography variant="title">{res.metadata?.guest_name || res.citizen?.full_name || 'Guest'}</Typography>
                  <View style={styles.tagRow}>
                    <View style={[styles.tag, { backgroundColor: C.glass2 }]}>
                      <Ionicons name="people" size={12} color={C.text} />
                      <Typography variant="hint">{res.guest_count}</Typography>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: getStatusColor(res.status, C) + '20' }]}>
                      <Typography variant="hint" style={[styles.statusText, { color: getStatusColor(res.status, C) }]}>{res.status}</Typography>
                    </View>
                  </View>
                </View>
                {res.table_number && (
                  <View style={styles.tableBadge}>
                    <Typography variant="hint" color="sub">TABLE</Typography>
                    <Typography variant="h3">{res.table_number}</Typography>
                  </View>
                )}
              </View>

              {res.items && res.items.length > 0 && (
                <GlassView variant="outline" style={styles.preOrderBox}>
                  <Typography variant="hint" color="sub">PRE-ORDERED ITEMS:</Typography>
                  {res.items.map((item: any, idx: number) => (
                    <Typography variant="body" key={idx} style={styles.itemText}>
                      {item.quantity}x {item.product?.name}
                    </Typography>
                  ))}
                </GlassView>
              )}

              <View style={styles.actions}>
                {res.status === 'PENDING' && (
                  <TouchableOpacity 
                    style={[styles.btn, { backgroundColor: C.primary }]}
                    onPress={() => onUpdateStatus(res.id, 'CONFIRMED')}
                  >
                    <Typography variant="body" style={{ color: '#000', fontWeight: 'bold' }}>CONFIRM</Typography>
                  </TouchableOpacity>
                )}
                {res.status === 'CONFIRMED' && (
                  <TouchableOpacity 
                    style={[styles.btn, { backgroundColor: C.secondary }]}
                    onPress={() => onUpdateStatus(res.id, 'ARRIVED')}
                  >
                    <Typography variant="body" style={{ color: '#000', fontWeight: 'bold' }}>MARK ARRIVED</Typography>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.iconBtn, { borderColor: C.edge }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={C.text} />
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function getStatusColor(status: string, C: any) {
  switch (status) {
    case 'PENDING': return C.secondary;
    case 'CONFIRMED': return C.primary;
    case 'ARRIVED': return '#4CAF50';
    case 'SEATED': return '#2196F3';
    case 'CANCELLED': return C.red;
    default: return C.sub;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  statCard: { flex: 1, padding: Spacing.lg, alignItems: 'center', borderRadius: Radius.lg },
  sectionTitle: {
    fontFamily: Fonts.black,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  card: { padding: Spacing.lg, borderRadius: Radius.xl, marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeBox: {
    padding: 8,
    borderRadius: Radius.md,
    alignItems: 'center',
    minWidth: 60,
  },
  timeText: { fontFamily: Fonts.black, fontSize: 16 },
  dateText: { fontFamily: Fonts.bold, fontSize: 10 },
  guestInfo: { flex: 1 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  tagText: { fontFamily: Fonts.bold, fontSize: 10 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  statusText: { fontFamily: Fonts.black, fontSize: 8 },
  tableBadge: { alignItems: 'center' },
  tableLabel: { fontFamily: Fonts.bold, fontSize: 8 },
  tableVal: { fontFamily: Fonts.black, fontSize: 18 },
  preOrderBox: { marginTop: Spacing.md, padding: Spacing.sm, borderRadius: Radius.md },
  itemText: { fontFamily: Fonts.medium, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  btn: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.md },
  btnText: { fontFamily: Fonts.black, fontSize: 12 },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.md, borderWidth: 1 },
  empty: { alignItems: 'center', paddingVertical: 100, opacity: 0.5 },
  emptyText: { fontFamily: Fonts.bold, marginTop: Spacing.md },
});

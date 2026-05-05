import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { D, Spacing, Radius, Fonts, Shadow } from './StitchTheme';
import { Typography, Surface } from '../../../components';
import { fmtDate, fmtTime } from '../../../utils';

export function HospitalityReservationsTab({ reservations, loading, onUpdateStatus, t }: any) {
  const pending = reservations.filter((r: any) => r.status === 'PENDING');
  const confirmed = reservations.filter((r: any) => r.status === 'CONFIRMED');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statsRow}>
        <Surface variant="lift" style={styles.statCard}>
          <Typography variant="h2">{pending.length}</Typography>
          <Typography variant="hint" color="sub">PENDING</Typography>
        </Surface>
        <Surface variant="lift" style={styles.statCard}>
          <Typography variant="h2">{confirmed.length}</Typography>
          <Typography variant="hint" color="sub">CONFIRMED</Typography>
        </Surface>
      </View>

      <Text style={styles.sectionTitle}>UPCOMING RESERVATIONS</Text>

      {reservations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={64} color={D.edge} />
          <Text style={styles.emptyText}>No reservations found</Text>
        </View>
      ) : (
        reservations.map((res: any) => (
          <Surface key={res.id} variant="lift" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.timeBox}>
                <Text style={styles.timeText}>
                  {fmtTime(res.reservation_time)}
                </Text>
                <Text style={styles.dateText}>
                  {fmtDate(res.reservation_time)}
                </Text>
              </View>
              <View style={styles.guestInfo}>
                <Typography variant="title">{res.citizen?.full_name || 'Guest'}</Typography>
                <View style={styles.tagRow}>
                  <View style={styles.tag}>
                    <Ionicons name="people" size={12} color={D.text} />
                    <Text style={styles.tagText}>{res.guest_count}</Text>
                  </View>
                  <View style={[styles.statusTag, { backgroundColor: getStatusColor(res.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(res.status) }]}>{res.status}</Text>
                  </View>
                </View>
              </View>
              {res.table_number && (
                <View style={styles.tableBadge}>
                  <Text style={styles.tableLabel}>TABLE</Text>
                  <Text style={styles.tableVal}>{res.table_number}</Text>
                </View>
              )}
            </View>

            {res.items && res.items.length > 0 && (
              <View style={styles.preOrderBox}>
                <Typography variant="hint" color="sub">PRE-ORDERED ITEMS:</Typography>
                {res.items.map((item: any, idx: number) => (
                  <Text key={idx} style={styles.itemText}>
                    {item.quantity}x {item.product?.name}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.actions}>
              {res.status === 'PENDING' && (
                <TouchableOpacity 
                  style={[styles.btn, { backgroundColor: D.primary }]}
                  onPress={() => onUpdateStatus(res.id, 'CONFIRMED')}
                >
                  <Text style={styles.btnText}>CONFIRM</Text>
                </TouchableOpacity>
              )}
              {res.status === 'CONFIRMED' && (
                <TouchableOpacity 
                  style={[styles.btn, { backgroundColor: D.secondary }]}
                  onPress={() => onUpdateStatus(res.id, 'ARRIVED')}
                >
                  <Text style={styles.btnText}>MARK ARRIVED</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={D.text} />
              </TouchableOpacity>
            </View>
          </Surface>
        ))
      )}
    </ScrollView>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'PENDING': return D.secondary;
    case 'CONFIRMED': return D.primary;
    case 'ARRIVED': return '#4CAF50';
    case 'SEATED': return '#2196F3';
    case 'CANCELLED': return D.error;
    default: return D.sub;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.base },
  content: { padding: Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  statCard: { flex: 1, padding: Spacing.lg, alignItems: 'center', borderRadius: Radius.l },
  sectionTitle: {
    fontFamily: Fonts.black,
    fontSize: 12,
    color: D.textSecondary,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  card: { padding: Spacing.lg, borderRadius: Radius.xl, marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeBox: {
    backgroundColor: D.text,
    padding: 8,
    borderRadius: Radius.m,
    alignItems: 'center',
    minWidth: 60,
  },
  timeText: { fontFamily: Fonts.black, color: D.base, fontSize: 16 },
  dateText: { fontFamily: Fonts.bold, color: D.base, fontSize: 10 },
  guestInfo: { flex: 1 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: D.edge, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.s },
  tagText: { fontFamily: Fonts.bold, fontSize: 10 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.s },
  statusText: { fontFamily: Fonts.black, fontSize: 8 },
  tableBadge: { alignItems: 'center' },
  tableLabel: { fontFamily: Fonts.bold, fontSize: 8, color: D.textSecondary },
  tableVal: { fontFamily: Fonts.black, fontSize: 18, color: D.text },
  preOrderBox: { marginTop: Spacing.md, padding: Spacing.sm, backgroundColor: D.edge, borderRadius: Radius.m },
  itemText: { fontFamily: Fonts.medium, fontSize: 12, color: D.text, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  btn: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.m },
  btnText: { fontFamily: Fonts.black, color: D.base, fontSize: 12 },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.m, borderWidth: 1, borderColor: D.edge },
  empty: { alignItems: 'center', paddingVertical: 100, opacity: 0.5 },
  emptyText: { fontFamily: Fonts.bold, color: D.textSecondary, marginTop: Spacing.md },
});

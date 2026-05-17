import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, GlassCard, GlassView } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { fmtDate, fmtTime } from '../../../utils';
import { Radius, Spacing, Fonts, D } from '../../../components/hospitality/HospitalityTheme';
import { BookingModal } from './BookingModal';

// ── Relative time helper ──────────────────────────────────────────────────────
function getRelativeTime(dateStr: string): { label: string; urgent: boolean; overdue: boolean } {
  const now = Date.now();
  const target = new Date(dateStr).getTime();
  const diffMs = target - now;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMs < 0) {
    const overMin = Math.abs(diffMin);
    return {
      label: overMin < 60 ? `${overMin}m overdue` : `${Math.floor(overMin / 60)}h overdue`,
      urgent: true,
      overdue: true,
    };
  }
  if (diffHr >= 24) {
    const days = Math.floor(diffHr / 24);
    return { label: `in ${days}d`, urgent: false, overdue: false };
  }
  if (diffHr >= 1) return { label: `in ${diffHr}h ${diffMin % 60}m`, urgent: diffHr < 2, overdue: false };
  return { label: `in ${diffMin}m`, urgent: true, overdue: false };
}

// ── Live countdown badge ──────────────────────────────────────────────────────
function CountdownBadge({ reservationTime, C }: { reservationTime: string; C: any }) {
  const [info, setInfo] = useState(() => getRelativeTime(reservationTime));

  useEffect(() => {
    const tick = setInterval(() => setInfo(getRelativeTime(reservationTime)), 30000);
    return () => clearInterval(tick);
  }, [reservationTime]);

  const bg = info.overdue ? '#E8312A20' : info.urgent ? '#f59e0b20' : C.glass2;
  const color = info.overdue ? '#E8312A' : info.urgent ? '#f59e0b' : C.sub;

  return (
    <View style={[styles.countdownBadge, { backgroundColor: bg }]}>
      <Ionicons name={info.overdue ? 'warning' : 'time-outline'} size={11} color={color} />
      <Text style={[styles.countdownText, { color }]}>{info.label}</Text>
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function HospitalityReservationsTab({
  reservations, loading, onUpdateStatus, onCreateReservation,
  onReleaseEscrow, onNoShow, tables, merchantId, t,
}: any) {
  const C = useTheme();

  const pending   = reservations.filter((r: any) => r.status === 'PENDING');
  const confirmed = reservations.filter((r: any) => r.status === 'CONFIRMED');
  const active    = [...pending, ...confirmed].sort(
    (a: any, b: any) => new Date(a.reservation_time).getTime() - new Date(b.reservation_time).getTime()
  );
  const past = reservations.filter((r: any) => !['PENDING', 'CONFIRMED'].includes(r.status));

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activePinInput, setActivePinInput] = useState<string | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleCheckIn = async (res: any) => {
    if (!pinValue || pinValue.length !== 4) {
      setPinError('Enter the 4-digit PIN');
      return;
    }
    setPinError('');
    setVerifying(true);
    try {
      const success = await onReleaseEscrow(pinValue, 'RESERVATION');
      if (success) {
        setActivePinInput(null);
        setPinValue('');
      } else {
        setPinError('Wrong PIN. Ask the guest to reveal theirs.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleNoShow = (res: any) => {
    Alert.alert(
      'Mark as No-Show',
      `${res.metadata?.guest_name || res.citizen?.full_name || 'Guest'} has not arrived. Deposit will be retained by the restaurant.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark No-Show',
          style: 'destructive',
          onPress: () => onNoShow?.(res.id),
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: C.bg }]}
        contentContainerStyle={styles.content}
      >
        {/* ── Header ── */}
        <View style={styles.topHeader}>
          <View>
            <Typography variant="h2">Reservations</Typography>
            <Typography variant="body" color="sub">
              {active.length} upcoming · {past.length} past
            </Typography>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: C.primary }]}
            onPress={() => setShowBookingModal(true)}
          >
            <Ionicons name="add" size={20} color={C.surface} />
            <Typography variant="title" style={{ color: C.surface, marginLeft: 4 }}>
              Add Booking
            </Typography>
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <GlassCard variant="outline" style={styles.statCard}>
            <Typography variant="h2">{pending.length}</Typography>
            <Typography variant="hint" color="sub">PENDING</Typography>
          </GlassCard>
          <GlassCard variant="outline" style={styles.statCard}>
            <Typography variant="h2">{confirmed.length}</Typography>
            <Typography variant="hint" color="sub">CONFIRMED</Typography>
          </GlassCard>
          <GlassCard variant="outline" style={[styles.statCard, { borderColor: '#E8312A40' }]}>
            <Typography variant="h2" style={{ color: '#E8312A' }}>
              {active.filter((r: any) => getRelativeTime(r.reservation_time).overdue).length}
            </Typography>
            <Typography variant="hint" style={{ color: '#E8312A' }}>OVERDUE</Typography>
          </GlassCard>
        </View>

        {/* ── Upcoming reservations ── */}
        <Typography variant="hint" style={[styles.sectionTitle, { color: C.sub }]}>
          UPCOMING RESERVATIONS
        </Typography>

        {active.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={64} color={C.text} opacity={0.3} />
            <Typography variant="body" color="sub" style={{ marginTop: 16 }}>
              No upcoming reservations
            </Typography>
          </View>
        ) : (
          active.map((res: any) => {
            const timing = getRelativeTime(res.reservation_time);
            const accentColor = timing.overdue
              ? '#E8312A'
              : timing.urgent
              ? '#f59e0b'
              : getStatusColor(res.status, C);

            return (
              <GlassCard key={res.id} accentColor={accentColor} style={styles.card}>
                {/* Card header */}
                <View style={styles.cardHeader}>
                  <View style={[styles.timeBox, { backgroundColor: accentColor }]}>
                    <Typography variant="body" style={[styles.timeText, { color: '#fff' }]}>
                      {fmtTime(res.reservation_time)}
                    </Typography>
                    <Typography variant="hint" style={[styles.dateText, { color: '#fff' }]}>
                      {fmtDate(res.reservation_time)}
                    </Typography>
                  </View>

                  <View style={styles.guestInfo}>
                    <Typography variant="title">
                      {res.metadata?.guest_name || res.citizen?.full_name || 'Guest'}
                    </Typography>
                    <View style={styles.tagRow}>
                      <View style={[styles.tag, { backgroundColor: C.glass2 }]}>
                        <Ionicons name="people" size={12} color={C.text} />
                        <Typography variant="hint"> {res.guest_count}</Typography>
                      </View>
                      <View style={[styles.statusTag, { backgroundColor: getStatusColor(res.status, C) + '20' }]}>
                        <Typography
                          variant="hint"
                          style={[styles.statusText, { color: getStatusColor(res.status, C) }]}
                        >
                          {res.status}
                        </Typography>
                      </View>
                      <CountdownBadge reservationTime={res.reservation_time} C={C} />
                    </View>
                    {res.citizen?.phone && (
                      <Typography variant="hint" color="sub" style={{ marginTop: 2 }}>
                        📞 {res.citizen.phone}
                      </Typography>
                    )}
                  </View>

                  {res.table_number && (
                    <View style={styles.tableBadge}>
                      <Typography variant="hint" color="sub">TABLE</Typography>
                      <Typography variant="h3">{res.table_number}</Typography>
                    </View>
                  )}
                </View>

                {/* Pre-ordered items */}
                {res.items && res.items.length > 0 && (
                  <GlassView variant="outline" style={styles.preOrderBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Ionicons name="fast-food-outline" size={12} color={C.sub} />
                      <Typography variant="hint" color="sub">PRE-ORDERED:</Typography>
                    </View>
                    {res.items.map((item: any, idx: number) => (
                      <Typography variant="body" key={idx} style={styles.itemText}>
                        {item.quantity}× {item.product?.name}
                      </Typography>
                    ))}
                  </GlassView>
                )}

                {/* Special requests */}
                {res.metadata?.special_requests && (
                  <View style={[styles.preOrderBox, { backgroundColor: '#f59e0b10', borderColor: '#f59e0b30', borderWidth: 1, borderRadius: Radius.md, marginTop: 8, padding: Spacing.sm }]}>
                    <Typography variant="hint" color="sub">💬 {res.metadata.special_requests}</Typography>
                  </View>
                )}

                {/* PIN input for check-in */}
                {activePinInput === res.id ? (
                  <View style={{ marginTop: 12, padding: 12, backgroundColor: C.glass2, borderRadius: 12 }}>
                    <Typography variant="hint" color="sub" style={{ marginBottom: 8 }}>
                      Ask the guest to reveal their PIN, then enter it below:
                    </Typography>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TextInput
                        style={{
                          flex: 1, color: C.text, fontSize: 24,
                          letterSpacing: 8, fontWeight: 'bold',
                          backgroundColor: C.lift, borderRadius: 8, padding: 10,
                        }}
                        placeholder="• • • •"
                        placeholderTextColor={C.sub}
                        keyboardType="number-pad"
                        maxLength={4}
                        value={pinValue}
                        onChangeText={(v) => { setPinValue(v); setPinError(''); }}
                        secureTextEntry
                        autoFocus
                      />
                      <TouchableOpacity
                        style={{
                          backgroundColor: verifying ? C.sub : C.primary,
                          paddingHorizontal: 16, paddingVertical: 12,
                          borderRadius: 8, marginLeft: 10,
                        }}
                        onPress={() => handleCheckIn(res)}
                        disabled={verifying}
                      >
                        <Typography variant="body" style={{ color: '#000', fontWeight: 'bold' }}>
                          {verifying ? '...' : 'Verify'}
                        </Typography>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ padding: 10, marginLeft: 6 }}
                        onPress={() => { setActivePinInput(null); setPinValue(''); setPinError(''); }}
                      >
                        <Ionicons name="close" size={24} color={C.text} />
                      </TouchableOpacity>
                    </View>
                    {pinError ? (
                      <Typography variant="hint" style={{ color: '#E8312A', marginTop: 6 }}>
                        ⚠ {pinError}
                      </Typography>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.actions}>
                    {res.status === 'PENDING' && (
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: C.primary }]}
                        onPress={() => onUpdateStatus(res.id, 'CONFIRMED')}
                      >
                        <Ionicons name="checkmark" size={16} color="#000" style={{ marginRight: 4 }} />
                        <Typography variant="body" style={{ color: '#000', fontWeight: 'bold' }}>CONFIRM</Typography>
                      </TouchableOpacity>
                    )}
                    {res.status === 'CONFIRMED' && (
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: '#10b981' }]}
                        onPress={() => setActivePinInput(res.id)}
                      >
                        <Ionicons name="shield-checkmark" size={16} color="#fff" style={{ marginRight: 4 }} />
                        <Typography variant="body" style={{ color: '#fff', fontWeight: 'bold' }}>CHECK IN</Typography>
                      </TouchableOpacity>
                    )}
                    {/* No-show button — only for overdue CONFIRMED bookings */}
                    {res.status === 'CONFIRMED' && timing.overdue && (
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: '#E8312A20', borderWidth: 1, borderColor: '#E8312A50' }]}
                        onPress={() => handleNoShow(res)}
                      >
                        <Typography variant="body" style={{ color: '#E8312A', fontWeight: 'bold' }}>NO SHOW</Typography>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.iconBtn, { borderColor: C.edge }]}>
                      <Ionicons name="chatbubble-ellipses-outline" size={20} color={C.text} />
                    </TouchableOpacity>
                  </View>
                )}
              </GlassCard>
            );
          })
        )}

        {/* ── Past reservations ── */}
        {past.length > 0 && (
          <>
            <Typography variant="hint" style={[styles.sectionTitle, { color: C.sub, marginTop: Spacing.xl }]}>
              PAST / COMPLETED
            </Typography>
            {past.map((res: any) => (
              <GlassCard key={res.id} accentColor={getStatusColor(res.status, C)} style={[styles.card, { opacity: 0.7 }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.timeBox, { backgroundColor: getStatusColor(res.status, C) }]}>
                    <Typography variant="body" style={[styles.timeText, { color: '#fff' }]}>
                      {fmtTime(res.reservation_time)}
                    </Typography>
                    <Typography variant="hint" style={[styles.dateText, { color: '#fff' }]}>
                      {fmtDate(res.reservation_time)}
                    </Typography>
                  </View>
                  <View style={styles.guestInfo}>
                    <Typography variant="title">
                      {res.metadata?.guest_name || res.citizen?.full_name || 'Guest'}
                    </Typography>
                    <View style={styles.tagRow}>
                      <View style={[styles.tag, { backgroundColor: C.glass2 }]}>
                        <Ionicons name="people" size={12} color={C.text} />
                        <Typography variant="hint"> {res.guest_count}</Typography>
                      </View>
                      <View style={[styles.statusTag, { backgroundColor: getStatusColor(res.status, C) + '20' }]}>
                        <Typography variant="hint" style={[styles.statusText, { color: getStatusColor(res.status, C) }]}>
                          {res.metadata?.no_show ? 'NO SHOW' : res.status}
                        </Typography>
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
              </GlassCard>
            ))}
          </>
        )}
      </ScrollView>

      <BookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onSubmit={async (payload: any) => {
          const success = await onCreateReservation(payload);
          if (success) setShowBookingModal(false);
        }}
        tables={tables}
        merchantId={merchantId}
      />
    </View>
  );
}

function getStatusColor(status: string, C: any) {
  switch (status) {
    case 'PENDING':   return C.secondary;
    case 'CONFIRMED': return '#10b981';
    case 'ARRIVED':   return C.primary;
    case 'SEATED':    return '#2196F3';
    case 'CANCELLED': return C.red || '#E8312A';
    default:          return C.sub;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 40 },
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
    minWidth: 58,
  },
  timeText: { fontFamily: Fonts.black, fontSize: 15 },
  dateText: { fontFamily: Fonts.bold, fontSize: 9 },
  guestInfo: { flex: 1 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  statusText: { fontFamily: Fonts.black, fontSize: 8 },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  countdownText: { fontFamily: Fonts.bold, fontSize: 9 },
  tableBadge: { alignItems: 'center' },
  preOrderBox: { marginTop: Spacing.md, padding: Spacing.sm, borderRadius: Radius.md },
  itemText: { fontFamily: Fonts.medium, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: Spacing.md, flexWrap: 'wrap' },
  btn: {
    flex: 1,
    minWidth: 100,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  empty: { alignItems: 'center', paddingVertical: 80, opacity: 0.5 },
});

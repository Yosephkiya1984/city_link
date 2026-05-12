import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, GlassCard, GlassView, SectionTitle } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { fmtETB, fmtDateTime } from '../../../utils';
import { Radius, Spacing, Fonts, Shadow, D } from '../../../components/hospitality/HospitalityTheme';

export function HospitalityEventsTab({ events, loading, onUpdateStatus, onCreateEvent, t }: any) {
  const C = useTheme();
  return (
    <ScrollView style={[styles.container, { backgroundColor: C.bg }]} contentContainerStyle={styles.content}>
      <SectionTitle 
        title="SPECIAL EVENTS" 
        rightLabel="CREATE EVENT" 
        onRightPress={onCreateEvent} 
      />

      {events.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={64} color={C.text} opacity={0.3} />
          <Typography variant="body" color="sub" style={{ marginTop: 16 }}>No events scheduled</Typography>
        </View>
      ) : (
        events.map((event: any) => (
          <GlassCard key={event.id} style={styles.card}>
            <Image 
              source={{ uri: event.cover_url || 'https://images.unsplash.com/photo-1514525253361-bee43883a1a2?q=80&w=1000&auto=format&fit=crop' }} 
              style={styles.cover}
            />
            <View style={[styles.statusBadge, { backgroundColor: C.primary }]}>
              <Typography variant="hint" style={[styles.statusText, { color: C.surface }]}>{event.status}</Typography>
            </View>

            <View style={styles.cardBody}>
              <Typography variant="h2">{event.title}</Typography>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color={C.sub} />
                <Typography variant="hint" style={[styles.infoText, { color: C.sub }]}>
                  {fmtDateTime(event.event_date)}
                </Typography>
              </View>

              <GlassView variant="outline" style={[styles.statsGrid, { borderColor: C.edge }]}>
                <View style={styles.miniStat}>
                  <Typography variant="h3">{event.tickets_sold || 0}</Typography>
                  <Typography variant="hint" color="sub" style={styles.miniLabel}>SOLD</Typography>
                </View>
                <View style={styles.miniStat}>
                  <Typography variant="h3">{event.capacity - (event.tickets_sold || 0)}</Typography>
                  <Typography variant="hint" color="sub" style={styles.miniLabel}>LEFT</Typography>
                </View>
                <View style={styles.miniStat}>
                  <Typography variant="h3">ETB {fmtETB(event.cover_charge)}</Typography>
                  <Typography variant="hint" color="sub" style={styles.miniLabel}>PRICE</Typography>
                </View>
              </GlassView>

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btn, { backgroundColor: C.primary }]}>
                  <Typography variant="body" style={{ color: '#000', fontWeight: 'bold' }}>MANAGE TICKETS</Typography>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { borderColor: C.edge }]}>
                  <Ionicons name="share-social-outline" size={20} color={C.text} />
                </TouchableOpacity>
                {event.status === 'UPCOMING' && (
                  <TouchableOpacity 
                    style={[styles.btn, { backgroundColor: C.red }]}
                    onPress={() => onUpdateStatus(event.id, 'CANCELLED')}
                  >
                    <Typography variant="body" style={{ color: '#000', fontWeight: 'bold' }}>CANCEL</Typography>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </GlassCard>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md },
  card: { borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing.xl },
  cover: { width: '100%', height: 180 },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  statusText: { fontFamily: Fonts.black, fontSize: 10, letterSpacing: 1 },
  cardBody: { padding: Spacing.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  infoText: { fontFamily: Fonts.medium, fontSize: 13 },
  statsGrid: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg, padding: Spacing.md, borderRadius: Radius.lg },
  miniStat: { flex: 1, alignItems: 'center' },
  miniVal: { fontFamily: Fonts.black, fontSize: 14 },
  miniLabel: { fontFamily: Fonts.bold, fontSize: 8, letterSpacing: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: Spacing.xl },
  btn: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.lg },
  btnText: { fontFamily: Fonts.black, fontSize: 12, letterSpacing: 1 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1 },
  empty: { alignItems: 'center', paddingVertical: 100, opacity: 0.5 },
  emptyText: { fontFamily: Fonts.bold, marginTop: Spacing.md },
});

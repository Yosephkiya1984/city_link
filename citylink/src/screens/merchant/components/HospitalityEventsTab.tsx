import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { D, Spacing, Radius, Fonts, Shadow } from './StitchTheme';
import { Typography, Surface, SectionTitle } from '../../../components';
import { fmtETB, fmtDateTime } from '../../../utils';

export function HospitalityEventsTab({ events, loading, onUpdateStatus, onCreateEvent, t }: any) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionTitle 
        title="SPECIAL EVENTS" 
        rightLabel="CREATE EVENT" 
        onRightPress={onCreateEvent} 
      />

      {events.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={64} color={D.edge} />
          <Text style={styles.emptyText}>No events scheduled</Text>
        </View>
      ) : (
        events.map((event: any) => (
          <Surface key={event.id} variant="lift" style={styles.card}>
            <Image 
              source={{ uri: event.cover_url || 'https://images.unsplash.com/photo-1514525253361-bee43883a1a2?q=80&w=1000&auto=format&fit=crop' }} 
              style={styles.cover}
            />
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{event.status}</Text>
            </View>

            <View style={styles.cardBody}>
              <Typography variant="h2">{event.title}</Typography>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color={D.textSecondary} />
                <Text style={styles.infoText}>
                  {fmtDateTime(event.event_date)}
                </Text>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.miniStat}>
                  <Text style={styles.miniVal}>{event.tickets_sold || 0}</Text>
                  <Text style={styles.miniLabel}>SOLD</Text>
                </View>
                <View style={styles.miniStat}>
                  <Text style={styles.miniVal}>{event.capacity - (event.tickets_sold || 0)}</Text>
                  <Text style={styles.miniLabel}>LEFT</Text>
                </View>
                <View style={styles.miniStat}>
                  <Text style={styles.miniVal}>ETB {fmtETB(event.cover_charge)}</Text>
                  <Text style={styles.miniLabel}>PRICE</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btn, { backgroundColor: D.primary }]}>
                  <Text style={styles.btnText}>MANAGE TICKETS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn}>
                  <Ionicons name="share-social-outline" size={20} color={D.text} />
                </TouchableOpacity>
                {event.status === 'UPCOMING' && (
                  <TouchableOpacity 
                    style={[styles.btn, { backgroundColor: D.error }]}
                    onPress={() => onUpdateStatus(event.id, 'CANCELLED')}
                  >
                    <Text style={styles.btnText}>CANCEL</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Surface>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.base },
  content: { padding: Spacing.md },
  card: { borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing.xl },
  cover: { width: '100%', height: 180 },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: D.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.m,
  },
  statusText: { fontFamily: Fonts.black, color: D.base, fontSize: 10, letterSpacing: 1 },
  cardBody: { padding: Spacing.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  infoText: { fontFamily: Fonts.medium, fontSize: 13, color: D.textSecondary },
  statsGrid: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg, padding: Spacing.md, backgroundColor: D.edge, borderRadius: Radius.l },
  miniStat: { flex: 1, alignItems: 'center' },
  miniVal: { fontFamily: Fonts.black, fontSize: 14, color: D.text },
  miniLabel: { fontFamily: Fonts.bold, fontSize: 8, color: D.textSecondary, letterSpacing: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: Spacing.xl },
  btn: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.l },
  btnText: { fontFamily: Fonts.black, color: D.base, fontSize: 12, letterSpacing: 1 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.l, borderWidth: 1, borderColor: D.edge },
  empty: { alignItems: 'center', paddingVertical: 100, opacity: 0.5 },
  emptyText: { fontFamily: Fonts.bold, color: D.textSecondary, marginTop: Spacing.md },
});

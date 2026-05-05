import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { D, Spacing, Radius, Fonts, Shadow } from './StitchTheme';
import { timeAgo } from '../../../utils';

interface WaitlistEntry {
  id: string;
  guest_name: string;
  phone_number: string;
  party_size: number;
  status: 'WAITING' | 'NOTIFIED' | 'SEATED' | 'CANCELLED';
  estimated_wait_minutes: number;
  created_at: string;
  notified_at?: string;
}

export function HospitalityWaitlistTab({ 
  waitlist, 
  loading, 
  onAction,
  t 
}: { 
  waitlist: WaitlistEntry[]; 
  loading: boolean; 
  onAction: (id: string, action: 'NOTIFY' | 'SEAT' | 'CANCEL') => void;
  t: any;
}) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={D.primary} />
      </View>
    );
  }

  const waiting = waitlist.filter(w => w.status === 'WAITING');
  const notified = waitlist.filter(w => w.status === 'NOTIFIED');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Stats Header */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { borderColor: D.secondary }]}>
          <Text style={styles.statVal}>{waiting.length}</Text>
          <Text style={styles.statLabel}>WAITING</Text>
        </View>
        <View style={[styles.statBox, { borderColor: D.primary }]}>
          <Text style={styles.statVal}>{notified.length}</Text>
          <Text style={styles.statLabel}>NOTIFIED</Text>
        </View>
        <View style={[styles.statBox, { borderColor: D.text }]}>
          <Text style={styles.statVal}>
            {waitlist.length > 0 ? Math.round(waitlist.reduce((acc, curr) => acc + curr.estimated_wait_minutes, 0) / waitlist.length) : 0}
          </Text>
          <Text style={styles.statLabel}>AVG WAIT</Text>
        </View>
      </View>

      {/* Quick Add (Visual Only for now) */}
      <TouchableOpacity style={styles.addBtn}>
        <Ionicons name="person-add" size={24} color={D.text} />
        <Text style={styles.addBtnText}>ADD GUEST TO WAITLIST</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>ACTIVE WAITLIST</Text>

      {waitlist.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={64} color={D.edge} />
          <Text style={styles.emptyText}>Waitlist is currently empty</Text>
        </View>
      ) : (
        waitlist.map((item) => (
          <View key={item.id} style={[styles.card, item.status === 'NOTIFIED' && styles.notifiedCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.guestInfo}>
                <Text style={styles.guestName}>{item.guest_name.toUpperCase()}</Text>
                <View style={styles.tagRow}>
                  <View style={styles.partyTag}>
                    <Ionicons name="people" size={14} color={D.text} />
                    <Text style={styles.tagText}>{item.party_size}</Text>
                  </View>
                  <Text style={styles.timeTag}>
                    {timeAgo(item.created_at)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.waitBadge}>
                <Text style={styles.waitVal}>{item.estimated_wait_minutes}</Text>
                <Text style={styles.waitUnit}>MIN</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.actions}>
              {item.status === 'WAITING' ? (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.notifyBtn]} 
                  onPress={() => onAction(item.id, 'NOTIFY')}
                >
                  <Ionicons name="notifications" size={20} color={D.base} />
                  <Text style={styles.btnText}>NOTIFY GUEST</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.notifiedStatus}>
                  <Ionicons name="mail-open-outline" size={20} color={D.primary} />
                  <Text style={[styles.btnText, { color: D.primary, marginLeft: 8 }]}>NOTIFIED</Text>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.actionBtn, styles.seatBtn]} 
                onPress={() => onAction(item.id, 'SEAT')}
              >
                <Ionicons name="restaurant" size={20} color={D.base} />
                <Text style={styles.btnText}>SEAT NOW</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => onAction(item.id, 'CANCEL')}
              >
                <Ionicons name="close-circle-outline" size={24} color={D.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.base },
  content: { padding: Spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: D.base,
    borderRadius: Radius.l,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    ...Shadow.sm,
  },
  statVal: {
    fontSize: 28,
    fontFamily: Fonts.black,
    color: D.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: D.textSecondary,
    letterSpacing: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: D.base,
    borderWidth: 2,
    borderColor: D.text,
    borderStyle: 'dashed',
    borderRadius: Radius.l,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  addBtnText: {
    fontFamily: Fonts.black,
    marginLeft: Spacing.sm,
    color: D.text,
    letterSpacing: 1,
  },
  sectionTitle: {
    fontFamily: Fonts.black,
    fontSize: 14,
    color: D.textSecondary,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: D.base,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: D.edge,
    ...Shadow.md,
  },
  notifiedCard: {
    borderColor: D.primary,
    backgroundColor: D.primary + '05',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestInfo: { flex: 1 },
  guestName: {
    fontSize: 20,
    fontFamily: Fonts.black,
    color: D.text,
    marginBottom: 4,
  },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  partyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.edge,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.s,
  },
  tagText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: D.text,
    marginLeft: 4,
  },
  timeTag: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: D.textSecondary,
  },
  waitBadge: {
    alignItems: 'center',
    backgroundColor: D.text,
    padding: 8,
    borderRadius: Radius.m,
    minWidth: 50,
  },
  waitVal: {
    fontSize: 18,
    fontFamily: Fonts.black,
    color: D.base,
  },
  waitUnit: {
    fontSize: 8,
    fontFamily: Fonts.black,
    color: D.base,
  },
  divider: {
    height: 1,
    backgroundColor: D.edge,
    marginVertical: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.l,
  },
  notifyBtn: { backgroundColor: D.secondary },
  seatBtn: { backgroundColor: D.primary },
  btnText: {
    fontSize: 12,
    fontFamily: Fonts.black,
    color: D.base,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  notifiedStatus: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    padding: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 100,
    opacity: 0.5,
  },
  emptyText: {
    fontFamily: Fonts.bold,
    color: D.textSecondary,
    marginTop: Spacing.md,
  },
});

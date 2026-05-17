import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, GlassCard, GlassView, SectionTitle } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { MotiView } from 'moti';
import { Radius, Spacing, Fonts, Shadow, D } from '../../../components/hospitality/HospitalityTheme';

import { WaitlistEntry } from '../../../types/domain_types';

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
  const C = useTheme();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionTitle title="CURRENT WAITLIST" />

      {waitlist.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={64} color={C.text} opacity={0.3} />
          <Typography variant="body" color="sub" style={{ marginTop: 16 }}>Waitlist is currently empty</Typography>
        </View>
      ) : (
        waitlist.map((entry, i) => (
          <MotiView
            key={entry.id || i}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ delay: i * 50 }}
          >
            <GlassCard 
              accentColor={entry.priority ? C.gold : C.primary} 
              glow={entry.priority}
              style={{ marginBottom: 12 }}
            >
              <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.queueNumber, { backgroundColor: (entry.priority ? C.gold : C.primary) + '20' }]}>
                  <Typography variant="h3" style={{ color: entry.priority ? C.gold : C.primary }}>
                    #{i + 1}
                  </Typography>
                </View>
                
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Typography variant="title">{entry.customer_name.toUpperCase()}</Typography>
                    {entry.priority && (
                      <View style={{ backgroundColor: C.gold + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Typography variant="hint" style={{ color: C.gold, fontSize: 10, fontWeight: '800' }}>VIP</Typography>
                      </View>
                    )}
                  </View>
                  <Typography variant="hint" color="sub">
                    {entry.party_size} People • {entry.estimated_wait}m wait
                  </Typography>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity 
                    style={[styles.actionCircle, { borderColor: C.green + '40' }]}
                    onPress={() => onAction(entry.id, 'SEAT')}
                  >
                    <Ionicons name="restaurant" size={18} color={C.green} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionCircle, { borderColor: C.red + '40' }]}
                    onPress={() => onAction(entry.id, 'CANCEL')}
                  >
                    <Ionicons name="close" size={18} color={C.red} />
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          </MotiView>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  queueNumber: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 100,
  },
});

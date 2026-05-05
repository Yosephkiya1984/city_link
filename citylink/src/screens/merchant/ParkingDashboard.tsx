import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TextInput,
  Dimensions,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';

import { useParkingData } from './hooks/useParkingData';
import { useParkingActions } from './hooks/useParkingActions';
import { useAuthStore } from '../../store/AuthStore';
import { D, Radius, Fonts, Spacing, Shadow } from './components/StitchTheme';
import { fmtETB } from '../../utils';
import { styles } from './components/ParkingDashboardStyles';
import { useT } from '../../utils/i18n';
import { Typography, Surface, SectionTitle } from '../../components';
import { VisualLotMap } from './components/VisualLotMap';

const { width } = Dimensions.get('window');

export default function ParkingDashboard() {
  const t = useT();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = useState<'live' | 'sessions' | 'lots' | 'finance'>('live');

  const data = useParkingData();
  const actions = useParkingActions(data);

  const { sessions, lots, loading, refreshing, loadData } = data;
  const { onUpdateSession: handleEndSession, onWithdraw: handleWithdraw } = actions;

  const activeSessions = useMemo(() => sessions.filter((s) => s.status === 'active'), [sessions]);
  const occupiedCount = activeSessions.length;
  const totalSpots = lots.reduce((acc, l) => acc + (l.total_spots || 0), 0);
  const dailyRev = sessions
    .filter(
      (s) =>
        s.status === 'completed' &&
        new Date(s.end_time).toDateString() === new Date().toDateString()
    )
    .reduce((acc, s) => acc + (s.total_amount || 0), 0);

  // Mock spots for the visual map (until backend supports grid coords)
  const visualSpots = useMemo(() => {
    return Array.from({ length: totalSpots || 24 }).map((_, i) => ({
      id: `spot_${i}`,
      number: `${i + 1}`,
      status: i < occupiedCount ? 'occupied' : 'available' as any,
      x: i % 8,
      y: Math.floor(i / 8),
    }));
  }, [totalSpots, occupiedCount]);

  const handleTabPress = (id: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(id);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.ink }}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        
        {/* Command Center Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Typography variant="h2">{currentUser?.business_name || 'Parking Lot'}</Typography>
              <View style={localStyles.statusRow}>
                <Ionicons name="location" size={12} color={D.gold} />
                <Typography variant="hint" style={{ color: D.gold, marginLeft: 4 }}>OPERATIONAL</Typography>
              </View>
            </View>
            <TouchableOpacity style={localStyles.alertBtn}>
              <Ionicons name="notifications-outline" size={24} color={D.white} />
              <View style={localStyles.alertBadge} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          {[
            { id: 'live', label: 'LIVE MAP' },
            { id: 'sessions', label: 'HISTORY' },
            { id: 'lots', label: 'LOTS' },
            { id: 'finance', label: 'FINANCE' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => handleTabPress(tab.id)}
              style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={D.gold} />
          }
        >
          <AnimatePresence exitBeforeEnter>
            <MotiView
              key={activeTab}
              from={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ paddingBottom: 100 }}
            >
              {activeTab === 'live' && (
                <View style={{ padding: Spacing.xl }}>
                  <View style={localStyles.heroStats}>
                    <Surface variant="lift" style={localStyles.heroCard}>
                      <Typography variant="h1" style={{ color: D.gold }}>{occupiedCount}</Typography>
                      <Typography variant="hint" color="sub">OCCUPIED</Typography>
                    </Surface>
                    <Surface variant="lift" style={localStyles.heroCard}>
                      <Typography variant="h1">{totalSpots - occupiedCount}</Typography>
                      <Typography variant="hint" color="sub">AVAILABLE</Typography>
                    </Surface>
                  </View>

                  <SectionTitle title="Live Lot Grid" rightLabel="Edit Map" />
                  <VisualLotMap 
                    spots={visualSpots} 
                    onSpotPress={(s) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      // Action logic for spot
                    }}
                    editMode={false}
                  />

                  <SectionTitle title="Active Sessions" />
                  {activeSessions.length === 0 ? (
                    <View style={localStyles.emptyState}>
                      <Ionicons name="car-outline" size={48} color={D.lift} />
                      <Typography variant="body" color="sub">No vehicles currently parked.</Typography>
                    </View>
                  ) : (
                    activeSessions.map((s, i) => (
                      <Surface key={s.id} variant="lift" style={localStyles.sessionCard}>
                        <View style={localStyles.carIcon}>
                          <Ionicons name="car-sport" size={24} color={D.gold} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Typography variant="title">{s.plate_number || 'B-12345'}</Typography>
                          <Typography variant="hint" color="sub">In: {new Date(s.start_time).toLocaleTimeString()}</Typography>
                        </View>
                        <TouchableOpacity style={localStyles.endBtn} onPress={() => handleEndSession(s.id, 'completed')}>
                          <Typography variant="h3" style={{ color: D.ink }}>End</Typography>
                        </TouchableOpacity>
                      </Surface>
                    ))
                  )}
                </View>
              )}

              {activeTab === 'sessions' && (
                <View style={{ padding: Spacing.xl }}>
                  <SectionTitle title="Today's Log" />
                  {sessions.map((s, i) => (
                    <Surface key={s.id} variant="lift" style={[localStyles.logCard, { borderLeftColor: s.status === 'active' ? D.gold : D.edge }]}>
                      <View style={{ flex: 1 }}>
                        <Typography variant="title">{s.plate_number}</Typography>
                        <Typography variant="hint" color="sub">{new Date(s.start_time).toLocaleDateString()}</Typography>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Typography variant="title" color={s.status === 'completed' ? "primary" : "sub"}>
                          {s.total_amount ? fmtETB(s.total_amount) : '---'}
                        </Typography>
                        <Typography variant="hint" style={{ color: s.status === 'active' ? D.gold : D.sub }}>{s.status.toUpperCase()}</Typography>
                      </View>
                    </Surface>
                  ))}
                </View>
              )}

              {activeTab === 'finance' && (
                <View style={{ padding: Spacing.xl }}>
                  <Surface variant="lift" style={localStyles.financeHero}>
                    <Typography variant="h2">Withdrawable Balance</Typography>
                    <Typography variant="h1" color="primary" style={{ fontSize: 40, marginVertical: 12 }}>{fmtETB(dailyRev * 42.5)}</Typography>
                    <TouchableOpacity style={localStyles.withdrawBtn} onPress={handleWithdraw}>
                      <Typography variant="h2" style={{ color: D.ink }}>Request Payout</Typography>
                    </TouchableOpacity>
                  </Surface>
                  
                  <SectionTitle title="Revenue Breakdown" />
                  <Surface variant="flat" style={localStyles.breakdownCard}>
                    <View style={localStyles.breakdownRow}>
                      <Typography variant="body">Total Sales</Typography>
                      <Typography variant="title">{fmtETB(dailyRev * 50)}</Typography>
                    </View>
                    <View style={localStyles.breakdownRow}>
                      <Typography variant="body">Platform Fee (15%)</Typography>
                      <Typography variant="title" color="red">-{fmtETB(dailyRev * 7.5)}</Typography>
                    </View>
                    <View style={[localStyles.breakdownRow, { borderTopWidth: 1, borderColor: D.edge, marginTop: 8, paddingTop: 8 }]}>
                      <Typography variant="h3">Net Earnings</Typography>
                      <Typography variant="h3" color="primary">{fmtETB(dailyRev * 42.5)}</Typography>
                    </View>
                  </Surface>
                </View>
              )}
            </MotiView>
          </AnimatePresence>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  alertBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: D.base, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.edge },
  alertBadge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: D.red, borderWidth: 2, borderColor: D.ink },
  heroStats: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  heroCard: { flex: 1, padding: 16, borderRadius: Radius.lg, alignItems: 'center', backgroundColor: D.surface },
  sessionCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: Radius.lg, marginBottom: 12 },
  carIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: D.gold + '20', alignItems: 'center', justifyContent: 'center' },
  endBtn: { backgroundColor: D.gold, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.md, ...Shadow.primary },
  logCard: { flexDirection: 'row', padding: 16, borderRadius: Radius.lg, marginBottom: 10, borderLeftWidth: 4 },
  emptyState: { padding: 40, alignItems: 'center' },
  financeHero: { padding: 32, borderRadius: Radius['2xl'], alignItems: 'center', marginBottom: 24, backgroundColor: D.primary + '05' },
  withdrawBtn: { backgroundColor: D.primary, paddingVertical: 16, paddingHorizontal: 40, borderRadius: Radius['2xl'], ...Shadow.primary },
  breakdownCard: { padding: 20, borderRadius: Radius.lg },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
});

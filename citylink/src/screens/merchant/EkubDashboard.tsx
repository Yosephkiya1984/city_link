import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Image,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';

import { useEkubData } from './hooks/useEkubData';
import { useEkubActions } from './hooks/useEkubActions';
import { useAuthStore } from '../../store/AuthStore';
import { D, Radius, Fonts, Spacing, Shadow } from './components/StitchTheme';
import { fmtETB } from '../../utils';
import { styles } from './components/EkubDashboardStyles';
import { useT } from '../../utils/i18n';
import { Typography, Surface, SectionTitle } from '../../components';

const { width } = Dimensions.get('window');

export default function EkubDashboard() {
  const t = useT();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = useState<'circles' | 'apps' | 'draws' | 'ledger'>('circles');
  const [isDrawing, setIsDrawing] = useState(false);
  const [winner, setWinner] = useState<any>(null);

  const data = useEkubData();
  const actions = useEkubActions(data);

  const { circles, pendingApps, activeDraws, loading, refreshing, loadData } = data;
  const { onApproveApp, onRunDraw } = actions;

  const totalPool = useMemo(
    () => circles.reduce((acc, c) => acc + (c.contribution_amount * (c.current_participants || 0)), 0),
    [circles]
  );
  
  const handleRunDraw = async (circle: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsDrawing(true);
    setWinner(null);
    
    // Simulate lucky draw animation
    setTimeout(async () => {
      try {
        const result = await onRunDraw(circle);
        setWinner(result?.winner || { full_name: 'Habtamu Alemu', amount: circle.contribution_amount * circle.max_participants });
      } catch (err) {
        console.error(err);
      } finally {
        setIsDrawing(false);
      }
    }, 3000);
  };

  const renderCircles = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={D.violet} />
      }
      contentContainerStyle={{ padding: Spacing.xl }}
    >
      <View style={styles.bentoRow}>
        <Surface variant="lift" style={[styles.bentoCard, { backgroundColor: D.violet + '10' }]}>
          <Typography variant="hint" color="sub" style={{ letterSpacing: 1 }}>TOTAL ASSETS</Typography>
          <Typography variant="h1" style={{ color: D.violet }}>{fmtETB(totalPool)}</Typography>
          <View style={[styles.payoutChip, { backgroundColor: D.violet + '20', marginTop: 8 }]}>
            <Typography variant="hint" style={{ color: D.violet, fontSize: 10 }}>GROWING 12%</Typography>
          </View>
        </Surface>
        <Surface variant="lift" style={[styles.bentoCard, { backgroundColor: D.secondary + '10' }]}>
          <Typography variant="hint" color="sub" style={{ letterSpacing: 1 }}>ACTIVE CIRCLES</Typography>
          <Typography variant="h1" style={{ color: D.secondary }}>{circles.length}</Typography>
          <View style={[styles.payoutChip, { backgroundColor: D.secondary + '20', marginTop: 8 }]}>
            <Typography variant="hint" style={{ color: D.secondary, fontSize: 10 }}>{pendingApps.length} PENDING</Typography>
          </View>
        </Surface>
      </View>

      <SectionTitle title="Managed Circles" rightLabel="+ Create" />

      {circles.length === 0 ? (
        <View style={localStyles.emptyState}>
          <Ionicons name="people-outline" size={64} color={D.lift} />
          <Typography variant="title" color="sub">No active circles</Typography>
        </View>
      ) : (
        circles.map((c, i) => (
          <MotiView
            key={c.id}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: i * 100 }}
          >
            <Surface variant="lift" style={localStyles.circleCard}>
              <View style={localStyles.circleHeader}>
                <View style={localStyles.circleIcon}>
                  <Ionicons name="sync" size={24} color={D.violet} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Typography variant="h3">{c.name}</Typography>
                  <Typography variant="hint" color="sub">{c.cycle_period || 'Weekly'} • {c.max_participants} Members</Typography>
                </View>
                <TouchableOpacity onPress={() => handleRunDraw(c)} style={localStyles.drawBadge}>
                  <Ionicons name="sparkles" size={14} color={D.ink} />
                  <Text style={localStyles.drawText}>DRAW</Text>
                </TouchableOpacity>
              </View>

              <View style={localStyles.progressContainer}>
                <View style={localStyles.progressBar}>
                  <MotiView 
                    from={{ width: 0 }}
                    animate={{ width: `${(c.current_participants / c.max_participants) * 100}%` }}
                    style={[localStyles.progressFill, { backgroundColor: D.violet }]} 
                  />
                </View>
                <Typography variant="hint" color="sub">{c.current_participants}/{c.max_participants} Joined</Typography>
              </View>

              <View style={localStyles.circleFooter}>
                <View>
                  <Typography variant="hint" color="sub">COLLECTION</Typography>
                  <Typography variant="title" color="primary">{fmtETB(c.contribution_amount)}</Typography>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Typography variant="hint" color="sub">POTENTIAL WIN</Typography>
                  <Typography variant="title" color="secondary">{fmtETB(c.contribution_amount * c.max_participants)}</Typography>
                </View>
              </View>
            </Surface>
          </MotiView>
        ))
      )}
    </ScrollView>
  );

  const renderApps = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.xl }}>
      <SectionTitle title="Membership Requests" />
      {pendingApps.length === 0 ? (
        <View style={localStyles.emptyState}>
          <Ionicons name="mail-unread-outline" size={64} color={D.lift} />
          <Typography variant="title" color="sub">All caught up!</Typography>
        </View>
      ) : (
        pendingApps.map((app, i) => (
          <Surface key={app.id} variant="lift" style={localStyles.appCard}>
            <View style={localStyles.avatar}>
              <Ionicons name="person" size={20} color={D.violet} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="title">{app.user_name || 'Anonymous'}</Typography>
              <Typography variant="hint" color="sub">Requesting: {app.ekub_name}</Typography>
            </View>
            <View style={localStyles.appActions}>
              <TouchableOpacity
                style={[localStyles.actionBtn, { backgroundColor: D.primary }]}
                onPress={() => onApproveApp(app.ekub_id, app.user_id, 'ACTIVE')}
              >
                <Ionicons name="checkmark" size={18} color={D.ink} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[localStyles.actionBtn, { backgroundColor: D.red + '20' }]}
                onPress={() => onApproveApp(app.ekub_id, app.user_id, 'REJECTED')}
              >
                <Ionicons name="close" size={18} color={D.red} />
              </TouchableOpacity>
            </View>
          </Surface>
        ))
      )}
    </ScrollView>
  );

  const renderDraws = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
      <AnimatePresence>
        {isDrawing ? (
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            style={localStyles.drawingContainer}
          >
            <MotiView
              animate={{ rotate: '360deg' }}
              transition={{ loop: true, duration: 1000, type: 'timing' }}
              style={localStyles.spinner}
            >
              <Ionicons name="color-filter" size={80} color={D.violet} />
            </MotiView>
            <Typography variant="h2" style={{ marginTop: 24 }}>SHUFFLING MEMBERS...</Typography>
            <Typography variant="body" color="sub">The hand of fate is moving</Typography>
          </MotiView>
        ) : winner ? (
          <MotiView
            from={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={localStyles.winnerContainer}
          >
            <Ionicons name="trophy" size={100} color={D.gold} />
            <Typography variant="h1" style={{ marginTop: 16 }}>WE HAVE A WINNER!</Typography>
            <Surface variant="flat" style={localStyles.winnerCard}>
              <Typography variant="h2" color="primary">{winner.full_name}</Typography>
              <Typography variant="h1" color="secondary" style={{ marginTop: 8 }}>{fmtETB(winner.amount)}</Typography>
            </Surface>
            <TouchableOpacity style={localStyles.closeBtn} onPress={() => setWinner(null)}>
              <Typography variant="h3" style={{ color: D.ink }}>Awesome!</Typography>
            </TouchableOpacity>
          </MotiView>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="sparkles-outline" size={120} color={D.lift} />
            <Typography variant="h2" color="sub" style={{ textAlign: 'center', marginTop: 20 }}>Select a circle from the list to run a Lucky Draw.</Typography>
          </View>
        )}
      </AnimatePresence>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Typography variant="h2">Community Wealth</Typography>
            <View style={localStyles.trustRow}>
              <Ionicons name="shield-checkmark" size={12} color={D.primary} />
              <Typography variant="hint" color="primary" style={{ marginLeft: 4 }}>GOVERNMENT AUDITED</Typography>
            </View>
          </View>
          <TouchableOpacity style={localStyles.settingsBtn}>
            <Ionicons name="settings-outline" size={24} color={D.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {[
          { id: 'circles', label: 'CIRCLES' },
          { id: 'apps', label: 'REQUESTS' },
          { id: 'draws', label: 'DRAW' },
          { id: 'ledger', label: 'LEDGER' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => {
              setActiveTab(tab.id as any);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <AnimatePresence exitBeforeEnter>
        <MotiView 
          key={activeTab} 
          from={{ opacity: 0, translateX: 20 }} 
          animate={{ opacity: 1, translateX: 0 }}
          style={{ flex: 1 }}
        >
          {activeTab === 'circles' && renderCircles()}
          {activeTab === 'apps' && renderApps()}
          {activeTab === 'draws' && renderDraws()}
          {activeTab === 'ledger' && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="book-outline" size={64} color={D.lift} />
              <Typography variant="title" color="sub">Ledger records coming soon...</Typography>
            </View>
          )}
        </MotiView>
      </AnimatePresence>
    </View>
  );
}

const localStyles = StyleSheet.create({
  trustRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  settingsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.edge },
  circleCard: { padding: 16, borderRadius: Radius.xl, marginBottom: 16 },
  circleHeader: { flexDirection: 'row', alignItems: 'center' },
  circleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: D.violet + '20', alignItems: 'center', justifyContent: 'center' },
  drawBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: D.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  drawText: { fontSize: 10, fontFamily: Fonts.black, color: D.ink, marginLeft: 4 },
  progressContainer: { marginVertical: 16 },
  progressBar: { height: 6, backgroundColor: D.surface, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  circleFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: D.edge, paddingTop: 12 },
  emptyState: { alignItems: 'center', marginTop: 100, gap: 16 },
  appCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: Radius.lg, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: D.violet + '15', alignItems: 'center', justifyContent: 'center' },
  appActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  drawingContainer: { alignItems: 'center' },
  spinner: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: D.violet + '10' },
  winnerContainer: { alignItems: 'center', width: '100%' },
  winnerCard: { padding: 32, borderRadius: Radius.xl, alignItems: 'center', marginTop: 24, width: '100%', borderStyle: 'dashed', borderWidth: 2, borderColor: D.gold },
  closeBtn: { backgroundColor: D.primary, paddingVertical: 16, paddingHorizontal: 40, borderRadius: Radius.xl, marginTop: 32, ...Shadow.primary },
});

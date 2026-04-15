import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '../../store/AuthStore';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { 
  fetchEkubs, 
  fetchMyEkubs, 
  submitEkubApplication, 
  contributeToEkub, 
  signWinnerConsent, 
  submitVouch, 
  fetchPendingVouches,
  fetchWinnerDraw
} from '../../services/ekub.service';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Shadow, Fonts } from '../../theme';

// Modular Components
import { COLORS } from '../../components/ekub/constants';
import { ReliabilityScore, TotalSaved } from '../../components/ekub/EkubStats';
import ActiveCircleItem from '../../components/ekub/ActiveCircleItem';
import { VerifiedCircleCard, VouchCard } from '../../components/ekub/EkubCards';
import { LiveDrawBanner } from '../../components/ekub/EkubDraws';

// ——————————————————————————————————————————————————————————————————————————————————————————————————
// Top Bar Component
// ——————————————————————————————————————————————————————————————————————————————————————————————————
const EnhancedTopBar = React.memo(({ balance, C }: { balance: number, C: any }) => (
  <View style={[styles.topBar, { backgroundColor: C.ink }]}>
    <View style={styles.topBarLeft}>
      <Text style={[styles.brandName, { color: C.primary, fontFamily: Fonts.headline }]}>Digital Ekub</Text>
    </View>
    <View style={[styles.balanceContainer, { backgroundColor: C.surface, borderColor: C.edge2, borderWidth: 1.5 }]}>
      <Text style={[styles.balanceLabel, { color: C.sub, fontFamily: Fonts.label }]}>Wallet</Text>
      <Text style={[styles.balanceAmount, { color: C.primary, fontFamily: Fonts.headline }]}>ETB {balance.toLocaleString()}</Text>
    </View>
  </View>
));

// ——————————————————————————————————————————————————————————————————————————————————————————————————
// Main Screen
// ——————————————————————————————————————————————————————————————————————————————————————————————————
export default function EkubScreen() {
  const [activeTab, setActiveTab] = useState<'browse' | 'mine' | 'vouch'>('browse');
  const [loading, setLoading] = useState(true);
  const [ekubs, setEkubs] = useState<any[]>([]);
  const [myEkubs, setMyEkubs] = useState<any[]>([]);
  const [pendingVouches, setPendingVouches] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const C = useTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const balance = useWalletStore((s) => s.balance);
  const setBalance = useWalletStore((s) => s.setBalance);
  const showToast = useSystemStore((s) => s.showToast);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [allRes, myRes, vouchRes] = await Promise.all([
      fetchEkubs(), 
      fetchMyEkubs(currentUser?.id || ''),
      fetchPendingVouches(currentUser?.id || '')
    ]);

    if (allRes.data) setEkubs(allRes.data);
    if (myRes.data) setMyEkubs(myRes.data);
    if (vouchRes.data) setPendingVouches(vouchRes.data);
    
    setLoading(false);
  }, [currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Handlers
  const handleJoin = useCallback(async (circle: any) => {
    if (currentUser?.kyc_status !== 'VERIFIED') {
      showToast('Electronic Ekub requires verified KYC', 'error');
      return;
    }
    const res = await submitEkubApplication(circle.id, currentUser.id, 'Joining for circle growth');
    if (!res.error) {
      showToast(`Application sent!`, 'success');
      loadData();
    }
  }, [currentUser?.id, currentUser?.kyc_status, showToast, loadData]);

  const handleContribute = useCallback(async (circle: any) => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await contributeToEkub(currentUser.id, circle.id, circle.current_round || 1);
    if (res.data?.ok) {
      showToast('Contribution successful!', 'success');
      if (res.data.new_balance !== undefined) setBalance(res.data.new_balance);
      loadData();
    } else {
      showToast(res.data?.error || 'Contribution failed', 'error');
    }
  }, [currentUser?.id, setBalance, showToast, loadData]);

  const handleVouch = useCallback(async (draw: any, approved: boolean) => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const res = await submitVouch(
      draw.id,
      draw.ekub_id,
      currentUser.id,
      currentUser.full_name || 'Voucher',
      approved,
      approved ? 'Regular vouch' : 'Dispute raised'
    );
    if (!res.error) {
      showToast(approved ? 'Vouch submitted ⭐' : 'Dispute raised 🚨', approved ? 'success' : 'warning');
      loadData();
    }
  }, [currentUser?.id, currentUser?.full_name, showToast, loadData]);

  const handleSignConsent = useCallback(async (circle: any) => {
    if (!currentUser?.id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { data: draw } = await fetchWinnerDraw(currentUser.id, circle.id);
    if (draw) {
      const res = await signWinnerConsent(draw.id);
      if (!res.error) {
        showToast('Consent signed!', 'success');
        loadData();
      }
    }
  }, [currentUser?.id, showToast, loadData]);

  // Virtualized List Config
  const listData = useMemo(() => {
    if (activeTab === 'browse') return ekubs;
    if (activeTab === 'mine') return myEkubs;
    return pendingVouches;
  }, [activeTab, ekubs, myEkubs, pendingVouches]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (activeTab === 'browse') {
      return <VerifiedCircleCard circle={item} onJoin={handleJoin} />;
    }
    if (activeTab === 'mine') {
      return (
        <ActiveCircleItem 
          circle={item.ekubs} 
          onContribute={handleContribute} 
          onSignConsent={handleSignConsent} 
        />
      );
    }
    return <VouchCard draw={item} onVouch={(approved) => handleVouch(item, approved)} />;
  }, [activeTab, handleJoin, handleContribute, handleSignConsent, handleVouch]);

  const ListHeader = useMemo(() => (
    <View style={styles.headerContainer}>
      <View style={styles.tabSwitcher}>
        {(['browse', 'mine', 'vouch'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'browse' ? 'Browse' : tab === 'mine' ? 'My Circles' : 'Vouching'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'browse' && (
        <>
          <LiveDrawBanner onEnterDraw={() => {}} />
          <View style={styles.bentoRow}>
            <ReliabilityScore score={currentUser?.credit_score ?? 300} />
            <TotalSaved amount={myEkubs.reduce((acc, m) => acc + (m.ekubs?.pot_balance || 0), 0)} />
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>
        {activeTab === 'browse' ? 'Available Circles' : activeTab === 'mine' ? 'My Circles' : 'Pending Vouches'}
      </Text>
    </View>
  ), [activeTab, currentUser?.credit_score, myEkubs]);

  const EmptyState = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="leaf-outline" size={64} color={COLORS.outline} />
      <Text style={styles.emptyTitle}>Nothing here yet</Text>
      <Text style={styles.emptySubtitle}>Check back later for updates</Text>
    </View>
  ), []);

  return (
    <View style={[styles.container, { backgroundColor: C.ink }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />
      <EnhancedTopBar balance={balance} C={C} />

      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={loading ? null : EmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        removeClippedSubviews={true}
        initialNumToRender={6}
        ListFooterComponent={loading ? <ActivityIndicator color={COLORS.primary} style={{ margin: 20 }} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { 
    height: 100, 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    justifyContent: 'space-between', 
    paddingHorizontal: 24, 
    paddingBottom: 16,
    zIndex: 10,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center' },
  brandName: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  balanceContainer: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: Radius.xl, 
    alignItems: 'flex-end',
    ...Shadow.sm,
  },
  balanceLabel: { fontSize: 10, textTransform: 'uppercase', fontWeight: '800', letterSpacing: 1 },
  balanceAmount: { fontSize: 16, fontWeight: '900' },
  
  headerContainer: { paddingHorizontal: 20, paddingTop: 28 },
  tabSwitcher: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  tab: { 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: Radius.full, 
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeTab: { backgroundColor: '#00A86B' }, // Primary Green
  tabText: { fontSize: 13, fontWeight: '800' },
  activeTabText: { color: '#080B10' }, // Ink Black
  
  bentoRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  sectionTitle: { fontSize: 26, fontWeight: '900', marginBottom: 20, letterSpacing: -0.8 },
  listContent: { paddingBottom: 120 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '900', marginTop: 24 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});

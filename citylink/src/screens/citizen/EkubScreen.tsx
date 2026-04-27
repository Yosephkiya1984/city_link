import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';

import { useEkub } from '../../hooks/useEkub';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Shadow, Fonts, DarkColors as T } from '../../theme';
import { fmtETB } from '../../utils';

// Modular Components
import { COLORS } from '../../components/ekub/constants';
import { ReliabilityScore, TotalSaved } from '../../components/ekub/EkubStats';
import ActiveCircleItem from '../../components/ekub/ActiveCircleItem';
import { VerifiedCircleCard, VouchCard } from '../../components/ekub/EkubCards';
import { LiveDrawBanner } from '../../components/ekub/EkubDraws';

import { GlassView } from '../../components/GlassView';
import { SkiaEkubDrum } from '../../components/ekub/SkiaEkubDrum';
import { SuccessOverlay } from '../../components/layout/SuccessOverlay';
import { ProcessingOverlay } from '../../components/layout/ProcessingOverlay';

// ——————————————————————————————————————————————————————————————————————————————————————————————————
// Top Bar Component
// ——————————————————————————————————————————————————————————————————————————————————————————————————
const EnhancedTopBar = React.memo(({ balance, C }: { balance: number; C: any }) => (
  <View
    style={[
      styles.topBar,
      { backgroundColor: C.surface, borderBottomWidth: 1, borderColor: C.edge },
    ]}
  >
    <View style={styles.topBarLeft}>
      <Text style={[styles.brandName, { color: C.primary, fontFamily: Fonts.headline }]}>
        EKUB POOL
      </Text>
    </View>
    <View
      style={[
        styles.balanceContainer,
        { backgroundColor: C.ink, borderColor: C.edge, borderWidth: 1, borderRadius: Radius.card },
      ]}
    >
      <Text style={[styles.balanceLabel, { color: C.sub, fontFamily: Fonts.bold }]}>LIQUIDITY</Text>
      <Text style={[styles.balanceAmount, { color: C.text, fontFamily: Fonts.headline }]}>
        {fmtETB(balance)}
      </Text>
    </View>
  </View>
));

// ——————————————————————————————————————————————————————————————————————————————————————————————————
// Main Screen
// ——————————————————————————————————————————————————————————————————————————————————————————————————
export default function EkubScreen() {
  const {
    activeTab,
    setActiveTab,
    loading,
    ekubs,
    myEkubs,
    pendingVouches,
    refreshing,
    onRefresh,
    currentUser,
    balance,
    showSuccess,
    setShowSuccess,
    successMsg,
    submitting,
    isDrawing,
    winnerIndex,
    drawMembers,
    startDraw,
    onDrawFinished,
    handleJoin,
    handleContribute,
    handleVouch,
    handleSignConsent,
    listData,
  } = useEkub();

  const C = useTheme();

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
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
    },
    [activeTab, handleJoin, handleContribute, handleSignConsent, handleVouch]
  );

  const ListHeader = useMemo(
    () => (
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
            {isDrawing ? (
              <SkiaEkubDrum
                members={drawMembers}
                winnerIndex={winnerIndex}
                isSpinning={isDrawing}
                onFinished={onDrawFinished}
              />
            ) : (
              <LiveDrawBanner onEnterDraw={startDraw} />
            )}

            <View style={styles.bentoRow}>
              <ReliabilityScore score={currentUser?.credit_score ?? 300} />
              <TotalSaved
                amount={myEkubs.reduce((acc, m) => acc + (m.ekubs?.pot_balance || 0), 0)}
              />
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: C.text, fontFamily: Fonts.headline }]}>
          {activeTab === 'browse'
            ? 'Available Circles'
            : activeTab === 'mine'
              ? 'My Circles'
              : 'Pending Vouches'}
        </Text>
      </View>
    ),
    [activeTab, currentUser?.credit_score, myEkubs]
  );

  const EmptyState = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="leaf-outline" size={64} color={COLORS.outline} />
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptySubtitle}>Check back later for updates</Text>
      </View>
    ),
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: C.ink }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />
      <EnhancedTopBar balance={balance} C={C} />

      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={loading ? null : EmptyState}
        contentContainerStyle={styles.listContent}
        estimatedItemSize={180}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        removeClippedSubviews={true}
        initialNumToRender={6}
        ListFooterComponent={
          loading ? <ActivityIndicator color={COLORS.primary} style={{ margin: 20 }} /> : null
        }
      />

      <SuccessOverlay
        visible={showSuccess}
        title={successMsg.title}
        subtitle={successMsg.sub}
        onClose={() => setShowSuccess(false)}
      />

      <ProcessingOverlay visible={submitting} message="Processing request..." />
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
  activeTab: { backgroundColor: T.primary },
  tabText: { fontSize: 13, fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.4)' },
  activeTabText: { color: '#FFFFFF' }, 

  bentoRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  sectionTitle: { fontSize: 26, fontWeight: '900', marginBottom: 20, letterSpacing: -0.8 },
  listContent: { paddingBottom: 120 },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: '900', marginTop: 24 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Image,
  StyleSheet,
  StatusBar,
  Dimensions,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Svg, Circle } from 'react-native-svg';

import { useAppStore } from '../../store/AppStore';
import { Fonts, Shadow } from '../../theme';
import { 
  fetchEkubs, 
  fetchMyEkubs, 
  submitEkubApplication, 
  contributeToEkub, 
  signWinnerConsent, 
  submitVouch, 
  fetchCircleMembers,
  fetchPendingVouches,
  fetchWinnerDraw
} from '../../services/ekub.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Material Design 3 color system EXACT match
const COLORS = {
  surface: '#101319',
  'surface-container-lowest': '#0b0e13',
  'surface-container-low': '#191c21',
  'surface-container': '#1d2025',
  'surface-container-high': '#272a30',
  'surface-container-highest': '#32353b',
  'on-surface': '#e1e2ea',
  'on-surface-variant': '#bccabe',
  outline: '#869489',
  'outline-variant': '#3d4a41',
  primary: '#59de9b',
  'primary-container': '#00a86b',
  'primary-fixed': '#78fbb6',
  'on-primary': '#003921',
  'on-primary-container': '#00331d',
  secondary: '#ffd887',
  'secondary-container': '#f4b700',
  'on-secondary': '#402d00',
  'on-secondary-container': '#654a00',
  'inverse-surface': '#e1e2ea',
  'inverse-primary': '#006d43',
  error: '#ffb4ab',
  tertiary: '#ffb4aa',
  'tertiary-container': '#ff5a4c',
  'on-tertiary': '#690004',
  'on-tertiary-container': '#600003',
  background: '#101319',
  'on-background': '#e1e2ea',
};

// â”€â”€ Top Bar Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EnhancedTopBar = ({ balance }: { balance: number }) => {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        <Text style={styles.brandName}>Digital Ekub</Text>
      </View>
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Wallet</Text>
        <Text style={styles.balanceAmount}>ETB {balance.toLocaleString()}</Text>
      </View>
    </View>
  );
};

// â”€â”€ Active Circle Item Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ActiveCircleItem = ({ 
  circle, 
  onContribute, 
  onSignConsent 
}: { 
  circle: any, 
  onContribute: (c: any) => void, 
  onSignConsent: (c: any) => void 
}) => {
  const progress =
    (circle.pot_balance / (circle.contribution_amount * (circle.max_members || 10))) * 100;

  // Mock logic for "Winner" state - in production this comes from the draw data
  const isWinnerAwaitingConsent = circle.status === 'ESCROW_LOCKED' || circle.status === 'AWAITING_CONSENT';

  return (
    <TouchableOpacity style={styles.activeCircleItem}>
      <View style={styles.circleProgressContainer}>
        <CircularProgress percentage={Math.round(progress)} color={COLORS.primary} />
      </View>
      <View style={styles.circleInfo}>
        <Text style={styles.circleName}>{circle.name}</Text>
        <Text style={styles.circleDetails}>
          Round {circle.current_round || 1} â€¢ ETB {circle.contribution_amount?.toLocaleString()}
        </Text>
      </View>
      <View style={styles.circleActions}>
        {isWinnerAwaitingConsent ? (
          <TouchableOpacity style={styles.consentButton} onPress={() => onSignConsent(circle)}>
            <Text style={styles.consentButtonText}>SIGN</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.payButton} onPress={() => onContribute(circle)}>
            <Text style={styles.payButtonText}>PAY</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// â”€â”€ Verified Circle Card Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VerifiedCircleCard = ({ 
  circle, 
  onJoin 
}: { 
  circle: any, 
  onJoin: (c: any) => void 
}) => {
  return (
    <View style={styles.verifiedCircleCard}>
      <View style={styles.verifiedCircleHeader}>
        <View style={styles.verifiedCircleInfo}>
          <Text style={styles.verifiedCircleName}>{circle.name}</Text>
          <Text style={styles.verifiedCircleGrade}>Official Institutional Circle</Text>
        </View>
      </View>
      <View style={styles.verifiedCircleStats}>
        <View style={styles.verifiedCircleStat}>
          <Text style={styles.verifiedCircleStatLabel}>Monthly</Text>
          <Text style={styles.verifiedCircleStatValue}>
            ETB {circle.contribution_amount?.toLocaleString()}
          </Text>
        </View>
        <View style={styles.verifiedCircleStat}>
          <Text style={styles.verifiedCircleStatLabel}>Members</Text>
          <Text style={styles.verifiedCircleStatValue}>
            {circle.total_members || 'Verified Only'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.verifiedCircleButton} onPress={() => onJoin(circle)}>
        <Text style={styles.verifiedCircleButtonText}>Join Circle</Text>
        <Ionicons name="arrow-forward" size={14} color={COLORS['on-surface']} />
      </TouchableOpacity>
    </View>
  );
};

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function EkubScreen() {
  const [activeTab, setActiveTab] = useState<'browse' | 'mine' | 'vouch'>('browse');
  const [loading, setLoading] = useState(true);
  const [ekubs, setEkubs] = useState([]);
  const [myEkubs, setMyEkubs] = useState([]);
  const [pendingVouches, setPendingVouches] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const { currentUser, balance, setBalance, showToast } = useAppStore((s) => s);

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

  const handleJoin = async (circle: any) => {
    if (currentUser?.kyc_status !== 'VERIFIED') {
      showToast('Electronic Ekub requires verified KYC', 'error');
      return;
    }
    const res = await submitEkubApplication(circle.id, currentUser.id, 'Joining for circle growth');
    if (!res.error) {
      showToast(`Application sent to organiser!`, 'success');
      loadData();
    } else {
      showToast('Failed to apply to circle', 'error');
    }
  };

  const handleContribute = async (circle: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await contributeToEkub(currentUser.id, circle.id, circle.current_round || 1);

    if (res.data?.ok) {
      showToast('Contribution successful!', 'success');
      setBalance(res.data.new_balance);
      loadData();
    } else {
      showToast(res.data?.error || 'Contribution failed', 'error');
    }
  };

  const handleVouch = async (draw: any, approved: boolean) => {
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
    } else {
      showToast('Failed to submit vouch', 'error');
    }
  };

  const handleSignConsent = async (circle: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Find the actual draw record for this member in this circle
    const { data: draw } = await fetchWinnerDraw(currentUser.id, circle.id);
    
    if (draw) {
      const res = await signWinnerConsent(draw.id);
      if (!res.error) {
        showToast('Consent signed! Pot disbursed after vouch.', 'success');
        loadData();
      } else {
        showToast('Failed to sign consent', 'error');
      }
    } else {
      showToast('No active draw found to sign', 'error');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      <EnhancedTopBar balance={balance} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
              onPress={() => setActiveTab('browse')}
            >
              <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
                Browse
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'mine' && styles.activeTab]}
              onPress={() => setActiveTab('mine')}
            >
              <Text style={[styles.tabText, activeTab === 'mine' && styles.activeTabText]}>
                My Circles
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'vouch' && styles.activeTab]}
              onPress={() => setActiveTab('vouch')}
            >
              <Text style={[styles.tabText, activeTab === 'vouch' && styles.activeTabText]}>
                Vouching
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
          ) : (
            <>
              {activeTab === 'browse' ? (
                <View style={{ paddingHorizontal: 24 }}>
                  <LiveDrawBanner
                    onEnterDraw={() => showToast('Draw entry processing...', 'info')}
                  />

                  <View style={styles.bentoRow}>
                    <ReliabilityScore score={currentUser?.credit_score ?? 300} />
                    <TotalSaved amount={myEkubs.reduce((acc, m) => acc + (m.ekubs?.pot_balance || 0), 0)} />
                  </View>

                  <Text style={styles.sectionTitle}>Available Circles</Text>
                  <View style={styles.verifiedCirclesGrid}>
                    {ekubs.map((circle) => (
                      <VerifiedCircleCard key={circle.id} circle={circle} onJoin={handleJoin} />
                    ))}
                  </View>
                </View>
              ) : activeTab === 'mine' ? (
                <View style={{ paddingHorizontal: 24 }}>
                  <Text style={styles.sectionTitle}>My Circles</Text>
                  {myEkubs.length > 0 ? (
                    <View style={styles.circlesList}>
                      {myEkubs.map((m) => (
                        <ActiveCircleItem 
                          key={m.id} 
                          circle={m.ekubs} 
                          onContribute={handleContribute} 
                          onSignConsent={handleSignConsent}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons name="people" size={64} color={COLORS.outline} />
                      <Text style={styles.emptyStateTitle}>No Joined Circles</Text>
                      <Text style={styles.emptyStateSubtitle}>
                        Join verified circles to start saving
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ paddingHorizontal: 24 }}>
                  <Text style={styles.sectionTitle}>Pending Vouches</Text>
                  {pendingVouches.length > 0 ? (
                    <View style={styles.circlesList}>
                      {pendingVouches.map((v) => (
                        <VouchCard 
                          key={v.id} 
                          draw={v} 
                          onVouch={(approved) => handleVouch(v, approved)} 
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons name="shield-checkmark" size={64} color={COLORS.outline} />
                      <Text style={styles.emptyStateTitle}>All Clear</Text>
                      <Text style={styles.emptyStateSubtitle}>
                        You have no pending vouches at this time
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Top Bar
  topBar: {
    position: 'absolute',
    top: 50, // Moved down from 0 to 50
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(16, 19, 25, 0.7)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS['surface-container-high'],
    borderWidth: 1,
    borderColor: 'rgba(134, 148, 137, 0.15)',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Fonts.headline,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(134, 148, 137, 0.1)',
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.outline,
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  balanceAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Fonts.headline,
  },

  // Tab Switcher
  tabSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.outline,
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  activeTabText: {
    color: COLORS['on-primary'],
  },

  // Content
  scrollView: {
    flex: 1,
    marginTop: 130, // Increased from 80 to account for moved top bar
  },
  scrollContent: {
    paddingBottom: 32,
  },
  content: {
    flex: 1,
  },

  // Bento Row (Reliability Score + Total Saved)
  bentoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Live Draw Banner
  liveDrawBanner: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
    ...Shadow.xl,
  },
  ekubGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  campaignIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  bannerContent: {
    position: 'relative',
    zIndex: 10,
    flexDirection: 'column',
    gap: 16,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerTitle: {
    flex: 1,
    gap: 4,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS['on-primary'],
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  bannerTitleText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS['on-primary'],
    fontFamily: Fonts.headline,
  },
  bannerStatus: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: Fonts.body,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.secondary,
    fontFamily: Fonts.headline,
  },
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: -12,
  },
  participant: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS['surface-container-high'],
    overflow: 'hidden',
  },
  participantImage: {
    width: '100%',
    height: '100%',
  },
  participantsPlus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS['surface-container-highest'],
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantsPlusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.headline,
    color: COLORS['on-surface'],
  },
  enterDrawButton: {
    alignSelf: 'flex-start',
  },
  enterDrawTouchable: {
    backgroundColor: COLORS['on-primary'],
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  enterDrawText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.background,
    fontFamily: Fonts.label,
  },

  // Reliability Score
  reliabilityCard: {
    flex: 1,
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(134, 148, 137, 0.05)',
    position: 'relative',
    overflow: 'hidden',
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  patternStar: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: COLORS.secondary,
    borderRadius: 1,
  },
  reliabilityContent: {
    position: 'relative',
    zIndex: 10,
  },
  reliabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reliabilityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.outline,
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  reliabilityScoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 16,
  },
  reliabilityScoreNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
  },
  reliabilityScoreChange: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  reliabilityProgress: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS['surface-container-highest'],
    borderRadius: 3,
    overflow: 'hidden',
  },
  reliabilityProgressCircle: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },

  // Total Saved
  totalSaved: {
    flex: 1,
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(134, 148, 137, 0.05)',
    justifyContent: 'center',
  },
  totalSavedContent: {
    gap: 4,
  },
  totalSavedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalSavedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.outline,
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  totalSavedNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
  },
  totalSavedSubtext: {
    fontSize: 10,
    color: COLORS.outline,
    fontFamily: Fonts.body,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },

  // Active Circle Item
  activeCircleItem: {
    backgroundColor: COLORS['surface-container'],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  circleProgressContainer: {
    width: 56,
    height: 56,
    flexShrink: 0,
  },
  circleProgressText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleProgressNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
  },
  circleInfo: {
    flex: 1,
  },
  circleName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
  },
  circleDetails: {
    fontSize: 12,
    color: COLORS.outline,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  circleAmount: {
    alignItems: 'flex-end',
  },
  circleAmountNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
  },
  circleAmountLabel: {
    fontSize: 10,
    color: COLORS.outline,
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  circleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  consentButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  consentButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS['on-secondary'],
  },
  payButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS['on-primary'],
  },


  // Verified Circle Card
  verifiedCircleCard: {
    backgroundColor: COLORS['surface-container-low'],
    borderWidth: 1,
    borderColor: 'rgba(134, 148, 137, 0.05)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 96,
    height: 96,
    borderRadius: 96,
    marginRight: -32,
    marginTop: -32,
  },
  verifiedCircleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  verifiedCircleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verifiedCircleIcon: {
    width: 48,
    height: 48,
    backgroundColor: COLORS['surface-container-highest'],
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCircleInfo: {
    flex: 1,
  },
  verifiedCircleName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
  },
  verifiedCircleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verifiedCircleGrade: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.outline,
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  verifiedCircleStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  verifiedCircleStat: {
    flex: 1,
    backgroundColor: COLORS['surface-container'],
    borderRadius: 8,
    padding: 12,
  },
  verifiedCircleStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.outline,
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    marginBottom: 4,
  },
  verifiedCircleStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
  },
  verifiedCircleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS['surface-container-high'],
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  verifiedCircleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.label,
  },

  // Lists
  circlesList: {
    gap: 12,
  },
  verifiedCirclesGrid: {
    gap: 16,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.outline,
    fontFamily: Fonts.headline,
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: COLORS.outline,
    fontFamily: Fonts.body,
    textAlign: 'center',
    marginTop: 8,
  },

  // Vouching
  vouchCard: {
    backgroundColor: COLORS['surface-container'],
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  vouchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vouchTitleContainer: {
    flex: 1,
  },
  vouchTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
  },
  vouchSubtitle: {
    fontSize: 12,
    color: COLORS.outline,
    marginTop: 2,
  },
  vouchAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Fonts.headline,
  },
  vouchBody: {
    gap: 16,
  },
  winnerSection: {
    backgroundColor: COLORS['surface-container-low'],
    padding: 12,
    borderRadius: 12,
  },
  winnerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.outline,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  winnerNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS['on-surface'],
  },
  vouchActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  vouchSmallButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS['surface-container-high'],
  },
  vouchDeny: {
    borderColor: 'rgba(255, 180, 171, 0.2)',
    borderWidth: 1,
  },
  vouchApprove: {
    borderColor: 'rgba(89, 222, 155, 0.2)',
    borderWidth: 1,
  },
  vouchActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  circularProgress: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  progressText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
  },
});

// â”€â”€ Live Draw Banner Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LiveDrawBanner = ({ onEnterDraw }: { onEnterDraw: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.liveDrawBanner}>
      <LinearGradient
        colors={['#6366f1', '#a855f7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ekubGradient}
      />

      {/* Campaign Icon */}
      <View style={styles.campaignIcon}>
        <Ionicons name="megaphone" size={60} color="#ffffff" style={{ opacity: 0.1 }} />
      </View>

      <View style={styles.bannerContent}>
        <View style={styles.bannerHeader}>
          <View style={styles.bannerTitle}>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>Live Draw</Text>
            </View>
            <Text style={styles.bannerTitleText}>Merchant Circle B</Text>
          </View>

          <View style={styles.bannerStatus}>
            <Text style={styles.statusText}>Draw Status</Text>
            <Text style={styles.statusValue}>2/2 VOUCHES</Text>
          </View>
        </View>

        <View style={styles.participants}>
          <View style={styles.participant}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIkAjegzXnN12qnI8XKQqxGAy8gRqGh-vvtf0aJanZf0LJKjVYoSU4hRPhdByS7krpMb5TqvmloOtrAlesQE5UW6MpuxkO9USeQ45O4Jb9Gpc3if974FjQCqzanIVj96VVCWLDQVqnDwZOLzDACeyOEi-91FdSWWofB1ru_dr2CKfLqmB15NPBP005YMrK0Y-1ULgLuJ_zfKPV5bGFBm3XYwcQyU41Bhd1kHjToq4PL3crgsU4lNxHNNoy-hC4O6HLWhKLgGZECS_l',
              }}
              style={styles.participantImage}
            />
          </View>
          <View style={styles.participant}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYAMffzBbdeY7wFDdUuv0y-dCnU1s-pPr8EW43aR1vzRy-Zy3b6U7lj53QKkedfuScwFoAjWnuxCyUfHYMGuFD0BBIS7L1dkQfMZ7AablY5hd7lU33pNbVw7PR7LQ-WBGJhq484NzP3s4S2XExf6mg0sFOB08eECwPluTH8PRYWGoekkgRMoLUemOdNRI5XGlCUbGBu0cIrApI5wSopB9PM_0ZzohXHGMsaCvoauGwb0MfNrryZeZrrQH7Gkd6kaQyvrvtwQaHPYo',
              }}
              style={styles.participantImage}
            />
          </View>
          <View style={styles.participantsPlus}>
            <Text style={styles.participantsPlusText}>+18</Text>
          </View>
        </View>

        <Animated.View style={[styles.enterDrawButton, { transform: [{ scale: scaleAnim }] }]}>
          <TouchableOpacity
            onPress={onEnterDraw}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.enterDrawTouchable}
          >
            <Text style={styles.enterDrawText}>ENTER DRAW</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

// â”€â”€ Circular Progress Component (EXACT SVG MATCH) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CircularProgress = ({ percentage, color, size = 56, strokeWidth = 4 }: { percentage: number, color: string, size?: number, strokeWidth?: number }) => {
  const radius = 24; // Fixed radius from design
  const circumference = 150; // Fixed stroke-dasharray from design
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={[styles.circularProgress, { width: size, height: size }]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background circle */}
        <Circle
          cx="28"
          cy="28"
          r={radius}
          stroke={COLORS['surface-container-highest']}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx="28"
          cy="28"
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View style={styles.progressText}>
        <Text style={styles.progressNumber}>{percentage}%</Text>
      </View>
    </View>
  );
};

// â”€â”€ Reliability Score Component (WITH PATTERN OVERLAY) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ReliabilityScore = ({ score }: { score: number }) => {
  const percentage = Math.max(0, Math.min(100, (score / 850) * 100));

  return (
    <View style={styles.reliabilityCard}>
      {/* Pattern Overlay */}
      <View style={styles.patternOverlay}>
        {Array.from({ length: 50 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.patternStar,
              {
                left: (i % 10) * 20,
                top: Math.floor(i / 10) * 20,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.reliabilityContent}>
        <View style={styles.reliabilityHeader}>
          <Text style={styles.reliabilityLabel}>Reliability Score</Text>
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={COLORS.secondary}
          />
        </View>

        <View style={styles.reliabilityScoreRow}>
          <Text style={styles.reliabilityScoreNumber}>{score}</Text>
          <Text style={styles.reliabilityScoreChange}>Verified Account</Text>
        </View>

        <View style={styles.reliabilityProgress}>
          <View style={[styles.reliabilityProgressCircle, { width: `${percentage}%` }]} />
        </View>
      </View>
    </View>
  );
};

const TotalSaved = ({ amount }: { amount: number }) => {
  return (
    <View style={styles.totalSaved}>
      <View style={styles.totalSavedContent}>
        <View style={styles.totalSavedHeader}>
          <Text style={styles.totalSavedLabel}>Total Pot Saved</Text>
          <Ionicons name="stats-chart" size={16} color={COLORS.primary} />
        </View>
        <Text style={styles.totalSavedNumber}>ETB {amount.toLocaleString()}</Text>
        <Text style={styles.totalSavedSubtext}>Across all joined circles</Text>
      </View>
    </View>
  );
};

// â”€â”€ Vouch Card Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VouchCard = ({ draw, onVouch }: { draw: any, onVouch: (approved: boolean) => void }) => {
  return (
    <View style={styles.vouchCard}>
      <View style={styles.vouchHeader}>
        <View style={styles.vouchTitleContainer}>
          <Text style={styles.vouchTitle}>Vouch Request</Text>
          <Text style={styles.vouchSubtitle}>
            {draw.ekubs?.name || 'Ekub Circle'} â€¢ Round {draw.round_number}
          </Text>
        </View>
        <Text style={styles.vouchAmount}>ETB {draw.pot_amount?.toLocaleString()}</Text>
      </View>
      
      <View style={styles.vouchBody}>
        <View style={styles.winnerSection}>
          <Text style={styles.winnerLabel}>Potential Winner</Text>
          <View style={styles.winnerRow}>
            <Ionicons name="person-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.winnerNameText}>{draw.winner_name || 'Anonymous Member'}</Text>
          </View>
        </View>
        
        <View style={styles.vouchActionRow}>
          <TouchableOpacity 
            style={[styles.vouchSmallButton, styles.vouchDeny]} 
            onPress={() => onVouch(false)}
          >
            <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
            <Text style={[styles.vouchActionText, { color: COLORS.error }]}>Deny</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.vouchSmallButton, styles.vouchApprove]} 
            onPress={() => onVouch(true)}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.vouchActionText, { color: COLORS.primary }]}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};


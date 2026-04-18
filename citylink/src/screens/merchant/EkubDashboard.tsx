import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Shadow, Fonts, FontSize } from '../../theme';
import { CButton } from '../../components';
import {
  fetchEkubs,
  handleEkubApplication,
  performEkubDraw,
  releaseEkubPot,
  fetchCircleMembers,
  fetchPendingApplications,
  fetchActiveDraws,
} from '../../services/ekub.service';
import { EkubCircle, EkubMember, EkubDraw } from '../../types';

export default function EkubDashboard() {
  const C = useTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'circles' | 'apps' | 'draws'>('circles');
  const [circles, setCircles] = useState<EkubCircle[]>([]);
  const [pendingApps, setPendingApps] = useState<EkubMember[]>([]);
  const [activeDraws, setActiveDraws] = useState<EkubDraw[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [circleRes, appRes, drawRes] = await Promise.all([
        fetchEkubs(),
        fetchPendingApplications(currentUser?.id || ''),
        fetchActiveDraws(currentUser?.id || ''),
      ]);

      if (circleRes.data) {
        const myCircles = circleRes.data.filter((c: any) => c.organiser_id === currentUser?.id);
        setCircles(myCircles);
      }
      if (appRes.data) setPendingApps(appRes.data);
      if (drawRes.data) setActiveDraws(drawRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const onApproveApp = async (ekubId: string, userId: string) => {
    const res = await handleEkubApplication(ekubId, userId, 'ACTIVE');
    if (!res.error) {
      showToast('Member approved! 🤝', 'success');
      loadData();
    }
  };

  const onRunDraw = async (circle: EkubCircle) => {
    Alert.alert(
      'Run Round Draw?',
      `This will select a winner for Round ${circle.current_round} of ${circle.name}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Draw',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // In production, we'd fetch actual eligible IDs
            const membersRes = await fetchCircleMembers(circle.id);
            const eligibleIds = (membersRes.data || []).map((m: any) => m.user_id);

            const res = await performEkubDraw(
              circle.id,
              circle.current_round,
              eligibleIds,
              circle.pot_balance
            );
            if (!res.error) {
              showToast('Draw completed! Winner notified. 🏆', 'success');
              loadData();
            }
          },
        },
      ]
    );
  };

  const onReleasePayout = async (drawId: string) => {
    const res = await releaseEkubPot(drawId);
    if (!res.error) {
      showToast('Pot released to winner wallet! 💸', 'success');
      loadData();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <View style={{ padding: 16, paddingTop: 60, backgroundColor: C.surface }}>
        <Text style={{ color: C.text, fontSize: 24, fontFamily: Fonts.black }}>Ekub Manager</Text>
        <Text style={{ color: C.sub, fontSize: 14 }}>{currentUser?.business_name}</Text>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: C.surface, paddingHorizontal: 16 }}>
        {(['circles', 'apps', 'draws'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setActiveTab(t)}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === t ? C.primary : 'transparent',
            }}
          >
            <Text
              style={{
                color: activeTab === t ? C.primary : C.sub,
                fontFamily: Fonts.bold,
                fontSize: 13,
                textTransform: 'uppercase',
              }}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ gap: 16 }}>
            {activeTab === 'circles' && (
              <>
                <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.bold }}>
                  My Circles
                </Text>
                {circles.map((c) => (
                  <CircleManagerCard key={c.id} circle={c} onRunDraw={() => onRunDraw(c)} C={C} />
                ))}
                {circles.length === 0 && <EmptyState text="No managed circles yet" C={C} />}
              </>
            )}

            {activeTab === 'apps' && (
              <>
                <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.bold }}>
                  Member Applications
                </Text>
                {pendingApps.map((app) => (
                  <AppReviewCard
                    key={`${app.ekub_id}-${app.user_id}`}
                    app={app}
                    onReview={(s) => onApproveApp(app.ekub_id, app.user_id)}
                    C={C}
                  />
                ))}
                {pendingApps.length === 0 && <EmptyState text="No pending applications" C={C} />}
              </>
            )}

            {activeTab === 'draws' && (
              <>
                <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.bold }}>
                  Pending Payouts
                </Text>
                {activeDraws.map((draw) => (
                  <PayoutReleaseCard
                    key={draw.id}
                    draw={draw}
                    onRelease={() => onReleasePayout(draw.id)}
                    C={C}
                  />
                ))}
                {activeDraws.length === 0 && (
                  <EmptyState text="No payouts awaiting release" C={C} />
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const CircleManagerCard = ({
  circle,
  onRunDraw,
  C,
}: {
  circle: EkubCircle;
  onRunDraw: () => void;
  C: any;
}) => (
  <View
    style={{
      backgroundColor: C.surface,
      borderRadius: Radius.xl,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: C.primary,
      ...Shadow.md,
    }}
  >
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
      <View>
        <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.bold }}>{circle.name}</Text>
        <Text style={{ color: C.sub, fontSize: 12 }}>
          Round {circle.current_round} â€¢ {circle.frequency}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: C.primary, fontSize: 16, fontFamily: Fonts.bold }}>
          ETB {circle.pot_balance.toLocaleString()}
        </Text>
        <Text style={{ color: C.sub, fontSize: 10 }}>POT BALANCE</Text>
      </View>
    </View>
    <CButton
      title="Initiate Round Draw"
      size="sm"
      variant="outline"
      onPress={onRunDraw}
      style={{ marginTop: 8 }}
    />
  </View>
);

const PayoutReleaseCard = ({
  draw,
  onRelease,
  C,
}: {
  draw: any;
  onRelease: () => void;
  C: any;
}) => (
  <View
    style={{
      backgroundColor: C.surface,
      borderRadius: Radius.xl,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: C.amber,
      ...Shadow.md,
    }}
  >
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
      <View>
        <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.bold }}>Payout Release</Text>
        <Text style={{ color: C.sub, fontSize: 12 }}>
          {draw.ekubs?.name} â€¢ Round {draw.round_number}
        </Text>
        <Text style={{ color: C.primary, fontSize: 13, marginTop: 4 }}>
          Winner: {draw.winner_name}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: C.amber, fontSize: 16, fontFamily: Fonts.bold }}>
          ETB {draw.pot_amount.toLocaleString()}
        </Text>
        <Text style={{ color: C.sub, fontSize: 10 }}>{draw.status}</Text>
      </View>
    </View>
    <CButton
      title="Release Pot to Wallet"
      size="sm"
      variant="outline"
      onPress={onRelease}
      disabled={draw.status !== 'NEEDS_VOUCHING'}
      style={{ marginTop: 8 }}
    />
    {draw.status === 'AWAITING_CONSENT' && (
      <Text style={{ color: C.sub, fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
        Waiting for winner to sign consent...
      </Text>
    )}
  </View>
);

const AppReviewCard = ({
  app,
  onReview,
  C,
}: {
  app: any;
  onReview: (s: string) => void;
  C: any;
}) => (
  <View style={{ backgroundColor: C.surface, borderRadius: Radius.xl, padding: 16, ...Shadow.md }}>
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
      {app.user?.profile_image ? (
        <Image
          source={{ uri: app.user.profile_image }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
        />
      ) : (
        <Ionicons name="person-circle" size={40} color={C.sub} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 15, fontFamily: Fonts.bold }}>
          {app.user?.full_name || 'Anonymous User'}
        </Text>
        <Text style={{ color: C.sub, fontSize: 12 }}>Applying for: {app.ekubs?.name}</Text>
        <Text style={{ color: C.text, fontSize: 13, marginTop: 4 }}>
          "{app.application_reason}"
        </Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <CButton
        title="Reject"
        size="sm"
        variant="ghost"
        style={{ flex: 1 }}
        onPress={() => onReview('REJECTED')}
      />
      <CButton
        title="Approve Member"
        size="sm"
        style={{ flex: 2 }}
        onPress={() => onReview('ACTIVE')}
      />
    </View>
  </View>
);

const EmptyState = ({ text, C }: { text: string; C: any }) => (
  <View style={{ padding: 40, alignItems: 'center' }}>
    <Ionicons name="layers-outline" size={48} color={C.edge} />
    <Text style={{ color: C.sub, marginTop: 12, fontFamily: Fonts.medium }}>{text}</Text>
  </View>
);

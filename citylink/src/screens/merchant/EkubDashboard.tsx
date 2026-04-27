import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEkubData } from './hooks/useEkubData';
import { useEkubActions } from './hooks/useEkubActions';
import { DarkColors as T, Radius, FontSize, Fonts } from '../../theme';
import { fmtETB } from '../../utils';
import { CButton } from '../../components';
import { styles } from './components/EkubDashboardStyles';

const ADDIS_NOIR = {
  ink: '#0B0D11',
  surface: '#131720',
  lift: '#1B2030',
  rim: '#242B3D',
  gold: '#00A86B', // Ekub Green
  cyan: '#00F5FF',
  glass: 'rgba(255, 255, 255, 0.05)',
  edge: 'rgba(255, 255, 255, 0.08)',
};

export default function EkubDashboard() {
  const data = useEkubData();
  const actions = useEkubActions(data);
  const [activeTab, setActiveTab] = useState<'circles' | 'apps' | 'draws'>('circles');

  const { circles, pendingApps, activeDraws, loading, refreshing, loadData } = data;
  const { onApproveApp, onRunDraw, onReleasePayout } = actions;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ backgroundColor: T.lift }}>
        <View style={styles.navBar}>
          <View style={styles.brandBox}>
            <View style={styles.brandIcon}>
              <Ionicons name="people" size={20} color="#00A86B" />
            </View>
            <View>
              <Text style={styles.brandName}>C-EKUB</Text>
              <Text style={styles.brandSubtitle}>SAVINGS MANAGER</Text>
            </View>
          </View>
          <TouchableOpacity style={{ padding: 8 }} onPress={loadData}>
            <Ionicons name="refresh" size={22} color={T.sub} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.tabScrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroller}
        >
          {(['circles', 'apps', 'draws'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            >
              <Ionicons
                name={tab === 'circles' ? 'layers' : tab === 'apps' ? 'person-add' : 'cash'}
                size={16}
                color={activeTab === tab ? '#00A86B' : T.sub}
              />
              <Text style={[styles.tabItemTxt, activeTab === tab && styles.tabItemTxtActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor="#00A86B" />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator color="#00A86B" style={{ marginTop: 40 }} />
        ) : (
          <View style={{ paddingBottom: 100 }}>
            {activeTab === 'circles' && (
              <View style={{ paddingTop: 16 }}>
                {circles.length === 0 ? (
                  <EmptyState text="No managed circles yet" icon="layers-outline" />
                ) : (
                  circles.map((c) => (
                    <View
                      key={c.id}
                      style={{
                        backgroundColor: ADDIS_NOIR.surface,
                        marginHorizontal: 16,
                        marginBottom: 16,
                        padding: 20,
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: ADDIS_NOIR.edge,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 16,
                        }}
                      >
                        <View>
                          <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>
                            {c.name}
                          </Text>
                          <Text
                            style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}
                          >
                            Round {c.current_round} • {c.frequency}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text
                            style={{
                              color: 'rgba(255,255,255,0.4)',
                              fontSize: 10,
                              fontWeight: '700',
                            }}
                          >
                            Total Pot
                          </Text>
                          <Text style={{ color: ADDIS_NOIR.gold, fontSize: 18, fontWeight: '800' }}>
                            {fmtETB(c.pot_balance)}
                          </Text>
                        </View>
                      </View>
                      <CButton
                        title="Initiate Round Draw"
                        size="sm"
                        onPress={() => onRunDraw(c)}
                        style={{ backgroundColor: ADDIS_NOIR.gold }}
                      />
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'apps' && (
              <View style={{ paddingTop: 16 }}>
                {pendingApps.length === 0 ? (
                  <EmptyState text="No pending applications" icon="people-outline" />
                ) : (
                  pendingApps.map((app) => (
                    <View
                      key={`${app.ekub_id}-${app.user_id}`}
                      style={{
                        backgroundColor: ADDIS_NOIR.surface,
                        marginHorizontal: 16,
                        marginBottom: 16,
                        padding: 20,
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: ADDIS_NOIR.edge,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: ADDIS_NOIR.lift,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="person" size={20} color={ADDIS_NOIR.gold} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>
                            {app.profile?.full_name}
                          </Text>
                          <Text style={{ color: ADDIS_NOIR.gold, fontSize: 11, fontWeight: '700' }}>
                            {app.ekubs?.name}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: 13,
                          fontStyle: 'italic',
                          marginBottom: 16,
                        }}
                      >
                        &quot;{app.application_reason || 'I want to join this circle.'}&quot;
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <CButton
                          title="Reject"
                          variant="ghost"
                          size="sm"
                          style={{ flex: 1 }}
                          onPress={() => onApproveApp(app.ekub_id, app.user_id, 'REJECTED')}
                        />
                        <CButton
                          title="Approve"
                          size="sm"
                          style={{ flex: 2, backgroundColor: ADDIS_NOIR.gold }}
                          onPress={() => onApproveApp(app.ekub_id, app.user_id, 'ACTIVE')}
                        />
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'draws' && (
              <View style={{ paddingTop: 16 }}>
                {activeDraws.length === 0 ? (
                  <EmptyState text="No pending payouts" icon="cash-outline" />
                ) : (
                  activeDraws.map((draw) => (
                    <PayoutCard
                      key={draw.id}
                      draw={draw}
                      onRelease={() => onReleasePayout(draw.id)}
                    />
                  ))
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const CircleCard = ({ circle, onRunDraw }: any) => (
  <View style={styles.card}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
      <View>
        <Text style={styles.circleName}>{circle.name}</Text>
        <Text style={styles.circleSub}>
          Round {circle.current_round} • {circle.frequency}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.potLabel}>Total Pot</Text>
        <Text style={styles.potValue}>{fmtETB(circle.pot_balance)}</Text>
      </View>
    </View>
    <CButton
      title="Initiate Round Draw"
      variant="outline"
      size="sm"
      onPress={onRunDraw}
      style={{ borderColor: '#00A86B', backgroundColor: 'transparent' }}
    />
  </View>
);

const AppReviewCard = ({ app, onReview }: any) => (
  <View style={styles.card}>
    <View style={styles.appHeader}>
      {app.profile?.profile_image ? (
        <Image source={{ uri: app.profile.profile_image }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="person" size={20} color={T.sub} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{app.profile?.full_name}</Text>
        <Text style={{ color: '#00A86B', fontSize: 11, fontWeight: '700' }}>{app.ekubs?.name}</Text>
      </View>
    </View>
    <Text style={styles.appReason}>
      &quot;{app.application_reason || 'I want to join this circle.'}&quot;
    </Text>
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
      <CButton
        title="Reject"
        variant="ghost"
        size="sm"
        style={{ flex: 1 }}
        onPress={() => onReview('REJECTED')}
      />
      <CButton
        title="Approve Member"
        size="sm"
        style={{ flex: 2, backgroundColor: '#00A86B' }}
        onPress={() => onReview('ACTIVE')}
      />
    </View>
  </View>
);

const PayoutCard = ({ draw, onRelease }: any) => {
  const needsConsent = draw.status === 'AWAITING_CONSENT';

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <View>
          <Text style={styles.circleName}>Payout Pending</Text>
          <Text style={styles.circleSub}>
            {draw.ekubs?.name} • Round {draw.round_number}
          </Text>
          <Text style={styles.winnerName}>Winner: {draw.winner_name}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={[
              styles.statusBadge,
              { backgroundColor: needsConsent ? '#F5B80020' : '#00A86B20' },
            ]}
          >
            <Text style={[styles.statusTxt, { color: needsConsent ? '#F5B800' : '#00A86B' }]}>
              {draw.status}
            </Text>
          </Text>
          <Text style={[styles.potValue, { fontSize: 16, marginTop: 8 }]}>
            {fmtETB(draw.pot_amount)}
          </Text>
        </View>
      </View>
      <CButton
        title="Release Pot to Winner"
        disabled={needsConsent}
        size="sm"
        onPress={onRelease}
        style={{ backgroundColor: needsConsent ? T.rim : '#00A86B' }}
      />
      {needsConsent && (
        <Text
          style={{
            color: T.sub,
            fontSize: 10,
            textAlign: 'center',
            marginTop: 8,
            fontStyle: 'italic',
          }}
        >
          Waiting for winner to sign payout consent...
        </Text>
      )}
    </View>
  );
};

const EmptyState = ({ text, icon }: { text: string; icon: any }) => (
  <View style={{ padding: 60, alignItems: 'center' }}>
    <Ionicons name={icon} size={48} color={T.rim} />
    <Text style={{ color: T.sub, marginTop: 16, fontWeight: '600' }}>{text}</Text>
  </View>
);

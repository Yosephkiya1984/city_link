import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { useWalletStore } from '../../store/WalletStore';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, Card, SectionTitle, CInput } from '../../components';
import { fmtETB, uid, fmtDateTime } from '../../utils';
import { t } from '../../utils/i18n';

import { useRealtimePostgres } from '../../hooks/useRealtimePostgres';
import {
  fetchParkingSessions,
  fetchParkingLots,
  updateSessionStatus,
  updateParkingLot,
} from '../../services/parking.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Parking color scheme
const PARKING_COLORS = {
  primary: '#2D7EF0',
  primaryL: 'rgba(45,126,240,0.1)',
  primaryB: 'rgba(45,126,240,0.28)',
  spot: {
    available: '#00A86B', // Green
    occupied: '#E8312A', // Red
    blocked: '#8A9AB8', // Grey
  },
};

export default function ParkingDashboard() {
  const navigation = useNavigation();
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const balance = useWalletStore((s) => s.balance);
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);
  const resetAuth = useAuthStore((s) => s.reset);
  const resetWallet = useWalletStore((s) => s.reset);
  const resetSystem = useSystemStore((s) => s.reset);

  const [activeTab, setActiveTab] = useState('live');
  const [sessions, setSessions] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [exitRequests, setExitRequests] = useState<any[]>([]);

  // KPI calculations
  const totalSpots = lots.reduce((sum: number, lot: any) => sum + (lot.total_spots || 0), 0);
  const occupiedSpots = sessions.filter((s: any) => s.status === 'ACTIVE').length;
  const availableSpots = totalSpots - occupiedSpots;
  const occupancyRate = totalSpots > 0 ? ((occupiedSpots / totalSpots) * 100).toFixed(1) : '0';

  const todayRevenue = sessions
    .filter(
      (s: any) =>
        s.status === 'COMPLETED' &&
        new Date(s.end_time).toDateString() === new Date().toDateString()
    )
    .reduce((sum: number, s: any) => sum + (s.calculated_cost || 0), 0);

  const loadData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [sessionsRes, lotsRes] = await Promise.all([
        fetchParkingSessions(currentUser.id),
        fetchParkingLots(currentUser.id),
      ]);

      if (sessionsRes.data) {
        const sortedSessions = (sessionsRes.data as any[]).sort(
          (a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );
        setSessions(sortedSessions);
        setExitRequests(sortedSessions.filter((s: any) => s.status === 'AWAITING_CONFIRMATION'));
      }
      if (lotsRes.data) {
        setLots(lotsRes.data);
        setSelectedLot(lotsRes.data[0] || null);
      }
    } catch (error) {
      showToast('Failed to load data', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  // Real-time session updates
  useRealtimePostgres({
    channelName: `parking-sessions-${currentUser?.id}`,
    table: 'parking_sessions',
    filter: `merchant_id=eq.${currentUser?.id}`,
    enabled: !!currentUser?.id,
    onPayload: (payload: any) => {
      if (payload.eventType === 'INSERT') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('ðŸ…¿ï¸ New parking session started', 'info');
      }
      loadData();
    },
  });

  const updateSession = async (sessionId: string, newStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const result = await updateSessionStatus(sessionId, newStatus);
      if (!result.error) {
        showToast(`Session ${newStatus.toLowerCase()}`, 'success');
        loadData();
      } else {
        showToast(result.error || 'Failed to update session', 'error');
      }
    } catch (error) {
      showToast('Failed to update session', 'error');
    }
    setLoading(false);
  };

  const logout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Logged out successfully', 'success');
    resetAuth();
    resetWallet();
    resetSystem();

    // Use navigation.replace instead of reset to avoid the error
    try {
      (navigation as any).replace('Auth');
    } catch (error) {
      console.log('Navigation reset error, trying alternative method');
      (navigation as any).navigate('Auth');
    }
  };

  const getSpotStatus = (spotNumber: number) => {
    const session = sessions.find(
      (s: any) => s.lot_id === selectedLot?.id && s.spot_id === spotNumber && s.status === 'ACTIVE'
    );
    return session ? 'occupied' : 'available';
  };

  const getSpotColor = (status: string) => {
    switch (status) {
      case 'available':
        return PARKING_COLORS.spot.available;
      case 'occupied':
        return PARKING_COLORS.spot.occupied;
      case 'blocked':
        return PARKING_COLORS.spot.blocked;
      default:
        return PARKING_COLORS.spot.available;
    }
  };

  const SpotGrid = () => {
    if (!selectedLot) return null;

    const spots = [];
    const cols = 6; // 6 columns for mobile
    const totalSpots = selectedLot.total_spots || 30;

    for (let i = 1; i <= totalSpots; i++) {
      const status = getSpotStatus(i);
      spots.push(
        <TouchableOpacity
          key={i}
          onPress={() => {
            const session = sessions.find(
              (s: any) => s.lot_id === selectedLot?.id && s.spot_id === i && s.status === 'ACTIVE'
            );
            if (session) {
              setSelectedSession(session);
              setShowSessionDetail(true);
            }
          }}
          style={{
            width: (SCREEN_WIDTH - 64) / cols - 4,
            height: 36,
            borderRadius: 6,
            backgroundColor: getSpotColor(status),
            borderWidth: 1,
            borderColor: C.edge2,
            justifyContent: 'center',
            alignItems: 'center',
            margin: 2,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 9,
              fontFamily: Fonts.black,
              fontWeight: '700',
            }}
          >
            {selectedLot.spot_prefix || ''}
            {i}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        {spots}
      </View>
    );
  };

  const SessionCard = ({ session }: { session: any }) => {
    const elapsed = session.start_time
      ? Math.floor((new Date().getTime() - new Date(session.start_time).getTime()) / 60000)
      : 0;
    const hours = Math.floor(elapsed / 60);
    const minutes = elapsed % 60;
    const currentFare = ((elapsed / 60) * (selectedLot?.rate_per_hour || 10)).toFixed(1);

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedSession(session);
          setShowSessionDetail(true);
        }}
      >
        <Card style={{ marginBottom: 8, padding: 12 }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black }}>
                  {selectedLot?.spot_prefix || ''}
                  {session.spot_id}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    backgroundColor:
                      session.status === 'ACTIVE' ? PARKING_COLORS.primaryL : 'rgba(0,168,107,0.1)',
                  }}
                >
                  <Text
                    style={{
                      color: session.status === 'ACTIVE' ? PARKING_COLORS.primary : '#00A86B',
                      fontSize: 9,
                      fontFamily: Fonts.bold,
                      textTransform: 'uppercase',
                    }}
                  >
                    {session.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <Text style={{ color: C.sub, fontSize: 11, marginBottom: 2 }}>
                Started: {new Date(session.start_time).toLocaleTimeString()}
              </Text>

              <Text style={{ color: C.sub, fontSize: 11 }}>
                Elapsed: {hours}h {minutes}m
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{ color: PARKING_COLORS.primary, fontSize: 14, fontFamily: Fonts.black }}
              >
                {fmtETB(currentFare)}
              </Text>
              <Text style={{ color: C.sub, fontSize: 9 }}>Current fare</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar
        title={`ðŸ…¿ï¸ ${selectedLot?.name || 'Parking Lot'}`}
        right={
          <TouchableOpacity onPress={logout} style={{ padding: 8 }}>
            <Ionicons name="log-out-outline" size={24} color={C.text} />
          </TouchableOpacity>
        }
      />

      {/* Additional Logout Button for visibility */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.edge2,
        }}
      >
        <TouchableOpacity
          onPress={logout}
          style={{
            backgroundColor: '#E8312A',
            borderRadius: Radius.xl,
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            alignSelf: 'flex-end',
          }}
        >
          <Ionicons name="log-out" size={16} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontFamily: Fonts.bold }}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Occupancy Stats */}
        <View style={{ padding: 16 }}>
          <LinearGradient
            colors={[PARKING_COLORS.primaryL, 'transparent']}
            style={{ borderRadius: Radius['3xl'], padding: 24, ...Shadow.md }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: C.text, fontSize: 13, fontFamily: Fonts.bold, opacity: 0.8 }}>
                  Occupancy Rate
                </Text>
                <Text
                  style={{
                    color: PARKING_COLORS.primary,
                    fontSize: 32,
                    fontFamily: Fonts.black,
                    marginTop: 4,
                  }}
                >
                  {occupancyRate}%
                </Text>
              </View>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: PARKING_COLORS.primaryL,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="car" size={24} color={PARKING_COLORS.primary} />
              </View>
            </View>

            <View
              style={{ height: 1, backgroundColor: 'rgba(45,126,240,0.2)', marginVertical: 20 }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#00A86B', fontSize: 16, fontFamily: Fonts.black }}>
                  {availableSpots}
                </Text>
                <Text
                  style={{ color: 'rgba(0,168,107,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  AVAILABLE
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#E8312A', fontSize: 16, fontFamily: Fonts.black }}>
                  {occupiedSpots}
                </Text>
                <Text
                  style={{ color: 'rgba(232,49,42,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  OCCUPIED
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{ color: PARKING_COLORS.primary, fontSize: 16, fontFamily: Fonts.black }}
                >
                  {fmtETB(todayRevenue, 0)}
                </Text>
                <Text
                  style={{ color: 'rgba(45,126,240,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  REVENUE
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Exit Requests Alert */}
        {exitRequests.length > 0 && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 16,
              backgroundColor: 'rgba(245,184,0,0.1)',
              borderRadius: Radius.xl,
              padding: 12,
              borderWidth: 1,
              borderColor: 'rgba(245,184,0,0.28)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="alert-circle" size={20} color="#F5B800" />
              <Text style={{ color: '#F5B800', fontSize: 12, fontFamily: Fonts.bold }}>
                {exitRequests.length} exit request{exitRequests.length > 1 ? 's' : ''} pending
              </Text>
            </View>
          </View>
        )}

        {/* Tab Navigation */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 }}>
          {['live', 'sessions', 'rates', 'stats'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: Radius.xl,
                backgroundColor: activeTab === tab ? PARKING_COLORS.primaryL : C.surface,
                borderWidth: 1.5,
                borderColor: activeTab === tab ? PARKING_COLORS.primaryB : C.edge2,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: activeTab === tab ? PARKING_COLORS.primary : C.sub,
                  fontSize: 11,
                  fontFamily: Fonts.black,
                  textTransform: 'uppercase',
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'live' && (
          <View>
            <SectionTitle title="Live Spot Grid" />
            <SpotGrid />

            {/* Legend */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 20,
                paddingVertical: 16,
                backgroundColor: C.surface,
                marginHorizontal: 16,
                borderRadius: Radius.xl,
                marginTop: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#00A86B' }}
                />
                <Text style={{ color: C.sub, fontSize: 10 }}>Available</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#E8312A' }}
                />
                <Text style={{ color: C.sub, fontSize: 10 }}>Occupied</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#8A9AB8' }}
                />
                <Text style={{ color: C.sub, fontSize: 10 }}>Blocked</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'sessions' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Active Sessions" />
            {loading && sessions.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                Loading sessions...
              </Text>
            ) : sessions.filter((s) => s.status === 'ACTIVE').length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                No active sessions
              </Text>
            ) : (
              sessions
                .filter((s) => s.status === 'ACTIVE')
                .map((session) => <SessionCard key={session.id} session={session} />)
            )}

            {exitRequests.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <SectionTitle title="Exit Requests" />
                {exitRequests.map((session: any) => (
                  <Card
                    key={session.id}
                    style={{
                      marginBottom: 8,
                      padding: 12,
                      backgroundColor: 'rgba(245,184,0,0.05)',
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View>
                        <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black }}>
                          Spot {selectedLot?.spot_prefix || ''}
                          {session.spot_id}
                        </Text>
                        <Text style={{ color: C.sub, fontSize: 11 }}>Waiting for confirmation</Text>
                      </View>
                      <CButton
                        title="Confirm Exit"
                        onPress={() => updateSession(session.id, 'COMPLETED')}
                        size="sm"
                      />
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'rates' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Rate Management" />
            <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
              Rate management coming soon
            </Text>
          </View>
        )}

        {activeTab === 'stats' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Analytics" />
            <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
              Analytics dashboard coming soon
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Session Detail Modal */}
      <Modal visible={showSessionDetail} animationType="slide" presentationStyle="pageSheet">
        {selectedSession && (
          <View style={{ flex: 1, backgroundColor: C.ink }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: C.edge2,
              }}
            >
              <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
                Session Details
              </Text>
              <TouchableOpacity onPress={() => setShowSessionDetail(false)} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Card style={{ padding: 16, marginBottom: 16 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black }}>
                    Spot {selectedLot?.spot_prefix || ''}
                    {selectedSession.spot_id}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor:
                        selectedSession.status === 'ACTIVE'
                          ? PARKING_COLORS.primaryL
                          : 'rgba(0,168,107,0.1)',
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selectedSession.status === 'ACTIVE' ? PARKING_COLORS.primary : '#00A86B',
                        fontSize: 10,
                        fontFamily: Fonts.bold,
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedSession.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <View style={{ marginBottom: 8 }}>
                  <Text style={{ color: C.sub, fontSize: 12, marginBottom: 4 }}>Start Time</Text>
                  <Text style={{ color: C.text, fontSize: 14 }}>
                    {new Date(selectedSession.start_time).toLocaleString()}
                  </Text>
                </View>

                {selectedSession.end_time && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ color: C.sub, fontSize: 12, marginBottom: 4 }}>End Time</Text>
                    <Text style={{ color: C.text, fontSize: 14 }}>
                      {new Date(selectedSession.end_time).toLocaleString()}
                    </Text>
                  </View>
                )}

                <View style={{ marginBottom: 8 }}>
                  <Text style={{ color: C.sub, fontSize: 12, marginBottom: 4 }}>Current Fare</Text>
                  <Text
                    style={{ color: PARKING_COLORS.primary, fontSize: 18, fontFamily: Fonts.black }}
                  >
                    {fmtETB(selectedSession.calculated_cost || 0)}
                  </Text>
                </View>

                <View style={{ marginBottom: 8 }}>
                  <Text style={{ color: C.sub, fontSize: 12, marginBottom: 4 }}>Rate</Text>
                  <Text style={{ color: C.text, fontSize: 14 }}>
                    {fmtETB(selectedLot?.rate_per_hour || 0)}/hour
                  </Text>
                </View>
              </Card>

              {selectedSession.status === 'ACTIVE' && (
                <CButton
                  title="Force Release Spot"
                  onPress={() => updateSession(selectedSession.id, 'COMPLETED')}
                  style={{ backgroundColor: '#F5B800' }}
                />
              )}

              {selectedSession.status === 'AWAITING_CONFIRMATION' && (
                <CButton
                  title="Confirm Exit"
                  onPress={() => updateSession(selectedSession.id, 'COMPLETED')}
                />
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

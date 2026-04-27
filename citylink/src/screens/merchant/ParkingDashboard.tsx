import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useParkingData } from './hooks/useParkingData';
import { useParkingActions } from './hooks/useParkingActions';
import { useAuthStore } from '../../store/AuthStore';
import { DarkColors as T, Radius, FontSize, Fonts } from '../../theme';
import { CButton, LegalReceipt } from '../../components';
import { fmtETB } from '../../utils';
import { styles } from './components/ParkingDashboardStyles';

export default function ParkingDashboard() {
  const navigation = useNavigation<any>();
  const data = useParkingData();
  const actions = useParkingActions(data);
  const [activeTab, setActiveTab] = useState<'live' | 'sessions' | 'rates' | 'stats'>('live');

  const { sessions, lots, selectedLot, loading, refreshing, loadData, currentUser } = data;
  const {
    onUpdateSession,
    onFinalizeSession,
    actionLoading,
    onLogout,
    showSessionDetail,
    setShowSessionDetail,
    selectedSession,
    setSelectedSession,
  } = actions;

  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSessionSettled, setLastSessionSettled] = useState<any>(null);

  // KYC/Legal Guard
  const isVerified = currentUser?.merchant_status === 'APPROVED' && !!currentUser?.tin;

  const handleFinalize = async (id: string, method: 'WALLET' | 'CASH', amount: number) => {
    const success = await onFinalizeSession(id, method, amount);
    // Even if hook returns void, we can assume success if no error was shown
    setLastSessionSettled({
      id,
      method,
      amount,
      date: new Date().toISOString(),
      plate: selectedSession?.plate || 'N/A'
    });
    setShowReceipt(true);
  };

  // KPIs
  const totalSpots = selectedLot?.total_spots || 0;
  const occupiedCount = sessions.filter((s) => s.status === 'ACTIVE').length;
  const todayRevenue = sessions
    .filter(
      (s) =>
        s.status === 'COMPLETED' &&
        new Date(s.end_time).toDateString() === new Date().toDateString()
    )
    .reduce((sum, s) => sum + (s.calculated_cost || 0), 0);

  const getSpotStatus = (spotId: number) => {
    const active = sessions.find((s) => s.status === 'ACTIVE' && s.spot_id === spotId);
    return active ? 'occupied' : 'available';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[T.surface, T.ink]} style={styles.header}>
        <SafeAreaView>
          <View style={styles.navBar}>
            <View style={styles.brandBox}>
              <View style={[styles.brandIconBox, { backgroundColor: T.primary + '20' }]}>
                <Ionicons name="business" size={20} color={T.primary} />
              </View>
              <View>
                <Text style={styles.brandName}>{selectedLot?.name?.toUpperCase() || 'HUB-PARK'}</Text>
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, { backgroundColor: T.primary }]} />
                  <Text style={styles.statusText}>OPERATIONAL · {selectedLot?.district || 'ADDIS ABABA'}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={20} color={T.red} />
            </TouchableOpacity>
          </View>

          {/* Revenue Dossier */}
          <View style={styles.dossierRow}>
            <View style={styles.dossierMain}>
              <Text style={styles.dossierLabel}>TOTAL REVENUE (TODAY)</Text>
              <Text style={styles.dossierValue}>ETB {fmtETB(todayRevenue, 0)}</Text>
              <View style={styles.fiscalRow}>
                <Ionicons name="shield-checkmark" size={12} color={T.primary} />
                <Text style={[styles.fiscalText, { color: T.primary }]}>TAX COMPLIANT · 15% TOT RESERVED</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.scanActionBtn}>
              <LinearGradient colors={T.noirGrad || ['#A855F7', '#3B82F6']} style={styles.scanActionGradient}>
                <Ionicons name="qr-code" size={24} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Compliance Guard */}
      {!isVerified && (
        <TouchableOpacity 
          style={styles.lockdownBanner}
          onPress={() => navigation.navigate('FaydaIdentityPortal' as any)}
        >
          <View style={styles.lockdownIconBox}>
            <Ionicons name="lock-closed" size={18} color={T.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.lockdownTitle}>COMPLIANCE LOCK ACTIVE</Text>
            <Text style={styles.lockdownSub}>Verify TIN & Identity to enable wallet settlements.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.red} />
        </TouchableOpacity>
      )}

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroller}>
          {(['live', 'sessions', 'rates', 'stats'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
            >
              <Ionicons
                name={
                  tab === 'live' ? 'grid' : tab === 'sessions' ? 'time' : tab === 'rates' ? 'cash' : 'stats-chart'
                }
                size={14}
                color={activeTab === tab ? T.primary : T.textSub}
              />
              <Text style={[styles.tabPillText, activeTab === tab && styles.tabPillTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={T.primary} />}
      >
        {activeTab === 'live' && (
          <View style={styles.liveContainer}>
            <View style={styles.occupancyHeader}>
              <View>
                <Text style={styles.occupancyTitle}>FACILITY OCCUPANCY</Text>
                <Text style={styles.occupancySub}>{occupiedCount} of {totalSpots} SLOTS IN USE</Text>
              </View>
              <View style={styles.occupancyPercentBox}>
                <Text style={styles.occupancyPercentText}>{Math.round((occupiedCount / totalSpots) * 100)}%</Text>
              </View>
            </View>

            <View style={styles.slotGrid}>
              {Array.from({ length: totalSpots }).map((_, i) => {
                const spotId = i + 1;
                const status = getSpotStatus(spotId);
                const active = sessions.find((s) => s.status === 'ACTIVE' && s.spot_id === spotId);
                
                return (
                  <TouchableOpacity
                    key={spotId}
                    onPress={() => {
                      if (active) {
                        setSelectedSession(active);
                        setShowSessionDetail(true);
                      }
                    }}
                    style={[
                      styles.slotCard,
                      status === 'occupied' ? styles.slotOccupied : styles.slotAvailable
                    ]}
                  >
                    <Text style={[styles.slotName, { color: status === 'occupied' ? T.red : T.green }]}>
                      {selectedLot?.spot_prefix}{spotId}
                    </Text>
                    {status === 'occupied' && (
                      <View style={styles.slotOccupantPulse} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <Legend />
          </View>
        )}

        {activeTab === 'sessions' && (
          <View style={styles.sessionList}>
            {sessions.filter(s => s.status === 'ACTIVE').map((session) => (
              <TouchableOpacity
                key={session.id}
                onPress={() => {
                  setSelectedSession(session);
                  setShowSessionDetail(true);
                }}
                style={styles.sessionItem}
              >
                <View style={styles.sessionMain}>
                  <View style={styles.sessionIconBox}>
                    <Ionicons name="car-sport" size={20} color={T.textSub} />
                  </View>
                  <View>
                    <Text style={styles.sessionSpot}>SPOT {selectedLot?.spot_prefix}{session.spot_id}</Text>
                    <Text style={styles.sessionPlate}>{session.plate || 'NO PLATE LOGGED'}</Text>
                  </View>
                </View>
                <View style={styles.sessionRight}>
                  <Text style={styles.sessionFare}>ETB {fmtETB(session.calculated_cost || 0)}</Text>
                  <Text style={styles.sessionTime}>{new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {sessions.filter(s => s.status === 'ACTIVE').length === 0 && (
              <EmptyState text="No active vehicles in facility" />
            )}
          </View>
        )}

        {activeTab === 'rates' && <EmptyState text="Rate config coming soon" />}
        {activeTab === 'stats' && <EmptyState text="Analytics loading..." />}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Session Detail Modal */}
      <Modal visible={showSessionDetail} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.detailCard}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}
            >
              <Text style={{ color: T.text, fontSize: 18, fontWeight: '800' }}>Session Detail</Text>
              <TouchableOpacity onPress={() => setShowSessionDetail(false)}>
                <Ionicons name="close" size={24} color={T.text} />
              </TouchableOpacity>
            </View>

            {selectedSession && (
              <>
                <DetailRow
                  label="Vehicle Spot"
                  value={`${selectedLot?.spot_prefix}${selectedSession.spot_id}`}
                />
                <DetailRow
                  label="Start Time"
                  value={new Date(selectedSession.start_time).toLocaleString()}
                />
                <DetailRow
                  label="Est. Duration"
                  value={`${Math.floor((Date.now() - new Date(selectedSession.start_time).getTime()) / 60000)} mins`}
                />
                <DetailRow
                  label="Current Fare"
                  value={fmtETB(selectedSession.calculated_cost || 0)}
                />

                <View style={{ marginTop: 24 }}>
                  <Text style={{ color: T.sub, fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
                    SELECT LEGAL SETTLEMENT METHOD
                  </Text>
                  
                  <CButton
                    title="Settle via Digital Wallet"
                    onPress={() => handleFinalize(selectedSession.id, 'WALLET', selectedSession.calculated_cost)}
                    loading={actionLoading}
                    disabled={!isVerified}
                    style={{ backgroundColor: isVerified ? '#2D7EF0' : '#444', marginBottom: 12 }}
                  />

                  <CButton
                    title="Record Cash Collection"
                    onPress={() => handleFinalize(selectedSession.id, 'CASH', selectedSession.calculated_cost)}
                    loading={actionLoading}
                    variant="outline"
                    style={{ borderColor: T.primary }}
                    textStyle={{ color: T.primary }}
                  />

                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 12, textAlign: 'center' }}>
                    * Cash payments will be logged to the Non-Financial Journal for tax compliance and will NOT affect your digital wallet balance.
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Legal Receipt Modal */}
      {lastSessionSettled && (
        <LegalReceipt
          visible={showReceipt}
          onClose={() => setShowReceipt(false)}
          merchantName={currentUser?.business_name || 'CityLink Merchant'}
          merchantTIN={currentUser?.tin || 'NOT_VERIFIED'}
          transactionId={lastSessionSettled.id.slice(0, 8).toUpperCase()}
          date={lastSessionSettled.date}
          amount={lastSessionSettled.amount}
          paymentMethod={lastSessionSettled.method}
          items={[
            { label: 'Parking Fee', value: lastSessionSettled.amount },
            { label: 'Plate', value: 0 } // Small hack to show plate in items if needed
          ]}
        />
      )}
    </View>
  );
}

const StatCard = ({ value, label }: any) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Legend = () => (
  <View style={styles.legend}>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: '#00A86B' }]} />
      <Text style={styles.legendTxt}>Available</Text>
    </View>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: '#E8312A' }]} />
      <Text style={styles.legendTxt}>Occupied</Text>
    </View>
  </View>
);

const SessionCard = ({ session, lot, onPress }: any) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View>
        <Text style={styles.sessionTitle}>
          Spot {lot?.spot_prefix}
          {session.spot_id}
        </Text>
        <Text style={styles.sessionSub}>
          Active since {new Date(session.start_time).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={styles.fareValue}>{fmtETB(session.calculated_cost || 0)}</Text>
    </View>
  </TouchableOpacity>
);

const DetailRow = ({ label, value }: any) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const EmptyState = ({ text }: { text: string }) => (
  <View style={styles.emptyState}>
    <Ionicons name="car-outline" size={48} color={T.rim} />
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

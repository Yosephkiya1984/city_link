import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';

import { useParkingData } from './hooks/useParkingData';
import { useParkingActions } from './hooks/useParkingActions';
import { checkPhoneExists } from '../../services/profile.service';
import { updateMerchantLocation } from '../../services/parking.service';
import { getCurrentLocation } from '../../services/delivery.service';
import { useAuthStore } from '../../store/AuthStore';
import { Radius, Spacing, Fonts, Shadow, D } from '../../components/hospitality/HospitalityTheme';
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
  const [walkInModal, setWalkInModal] = useState(false);
  const [walkInPlate, setWalkInPlate] = useState('');
  const [pinModal, setPinModal] = useState<{ sessionId: string; plate: string } | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffPhone, setStaffPhone] = useState('');
  const [foundStaff, setFoundStaff] = useState<{ name: string; isVerified: boolean } | null>(null);
  const [isSearchingStaff, setIsSearchingStaff] = useState(false);
  const [selectedLotIndex, setSelectedLotIndex] = useState(0);
  const [showAddLot, setShowAddLot] = useState(false);
  const [newLotName, setNewLotName] = useState('');
  const [newLotCapacity, setNewLotCapacity] = useState('');
  const [newLotRate, setNewLotRate] = useState('25');
  const [newLotOvernight, setNewLotOvernight] = useState('50');
  const [newLotType, setNewLotType] = useState<'private' | 'association'>('private');
  const [newLotOpening, setNewLotOpening] = useState('06:00');
  const [newLotClosing, setNewLotClosing] = useState('22:00');
  const [is247, setIs247] = useState(true);
  const [newLotCoords, setNewLotCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSavingLot, setIsSavingLot] = useState(false);
  
  // Real-time staff lookup
  useEffect(() => {
    const lookup = async () => {
      if (staffPhone.length >= 10) {
        setIsSearchingStaff(true);
        try {
          const profile = await checkPhoneExists(staffPhone);
          if (profile) {
            setFoundStaff({ 
              name: profile.full_name || 'Anonymous User', 
              isVerified: !!profile.is_verified 
            });
          } else {
            setFoundStaff(null);
          }
        } catch (e) {
          setFoundStaff(null);
        } finally {
          setIsSearchingStaff(false);
        }
      } else {
        setFoundStaff(null);
      }
    };
    
    const timer = setTimeout(lookup, 500);
    return () => clearTimeout(timer);
  }, [staffPhone]);

  const data = useParkingData();
  const actions = useParkingActions(data);
  const signOut = useAuthStore((s) => s.signOut);
  const uiMode = useAuthStore((s) => s.uiMode);
  const setUiMode = useAuthStore((s) => s.setUiMode);
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Location Tracking Watcher (Conductor-as-the-Anchor) ──
  useEffect(() => {
    if (!currentUser?.id) {
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
        locationInterval.current = null;
      }
      return;
    }

    if (!locationInterval.current) {
      locationInterval.current = setInterval(async () => {
        let l = await getCurrentLocation();
        if (l) {
          updateMerchantLocation(currentUser.id, l.lat, l.lng);
        }
      }, 15000);

      // Immediate ping on mount
      getCurrentLocation().then((l) => {
        if (l) updateMerchantLocation(currentUser.id, l.lat, l.lng);
      });
    }

    return () => {
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
        locationInterval.current = null;
      }
    };
  }, [currentUser?.id]);

  const { sessions, lots, staff, merchant, loading, refreshing, loadData } = data;

  // Pre-compute current user's staff record (avoids inline IIFE in JSX)
  const myStaff = staff.find((s) => s.profile_id === currentUser?.id);

  const { 
    onUpdateSession: handleEndSession, 
    onWithdraw: handleWithdraw,
    onStartManualSession: handleStartManualSession,
    onAddStaff: handleAddStaff,
    onUpdateStaffStatus,
    onRevokeStaff,
    onAddLot
  } = actions;

  const activeSessions = useMemo(() => sessions.filter((s) => s.status === 'active'), [sessions]);
  const occupiedCount = activeSessions.length;
  const totalSpots = lots.reduce((acc, l) => acc + (l.total_spots || 0), 0);
  const dailyRev = sessions
    .filter(
      (s) =>
        (s.status === 'completed' || s.status === 'SETTLED') &&
        s.end_time &&
        new Date(s.end_time).toDateString() === new Date().toDateString()
    )
    .reduce((acc, s) => acc + (s.calculated_cost || 0), 0);

  // 🏎️ Super Car Engine: Real-time Visual Mapping
  const visualSpots = useMemo(() => {
    const currentLot = lots[selectedLotIndex];
    if (!currentLot) return [];
    
    const capacity = currentLot.total_spots || 0;
    // Map sessions to this specific lot if lot_id exists, otherwise fallback to index-based for demo
    const lotSessions = activeSessions.filter(s => !s.lot_id || s.lot_id === currentLot.id);

    return Array.from({ length: capacity }).map((_, i) => {
      const session = lotSessions[i];
      return {
        id: session?.id || `spot_${selectedLotIndex}_${i}`,
        number: session ? session.plate?.slice(-4) : `${i + 1}`,
        status: (i < lotSessions.length ? 'occupied' : 'available') as 'occupied' | 'available',
        x: i % 8,
        y: Math.floor(i / 8),
      };
    });
  }, [lots, selectedLotIndex, activeSessions]);

  const handleTabPress = (id: 'live' | 'sessions' | 'lots' | 'finance') => {
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
              <Typography variant="h2">{merchant?.business_name || currentUser?.business_name || 'Parking Lot'}</Typography>
              <View style={localStyles.statusRow}>
                <Ionicons name="location" size={12} color={D.gold} />
                <Typography variant="hint" style={{ color: D.gold, marginLeft: 4 }}>OPERATIONAL</Typography>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>

              {/* ── Online / Offline Status Toggle ── */}
              {uiMode === 'valet' && (
                loading && !myStaff ? (
                  <View style={[localStyles.statusPill, { paddingHorizontal: 8 }]}>
                    <ActivityIndicator size="small" color={D.sub} />
                  </View>
                ) : myStaff ? (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onUpdateStaffStatus(myStaff.id, !myStaff.is_online);
                    }}
                    style={[
                      localStyles.statusPill,
                      {
                        backgroundColor: myStaff.is_online ? D.primary + '20' : D.surface,
                        borderColor: myStaff.is_online ? D.primary : D.sub,
                        paddingHorizontal: 10,
                      },
                    ]}
                  >
                    <View
                      style={[
                        localStyles.statusDot,
                        { backgroundColor: myStaff.is_online ? D.primary : D.sub },
                      ]}
                    />
                    <Typography
                      variant="hint"
                      style={{
                        color: myStaff.is_online ? D.primary : D.sub,
                        fontWeight: '700',
                        marginLeft: 4,
                        fontSize: 10,
                      }}
                    >
                      {myStaff.is_online ? 'ON' : 'OFF'}
                    </Typography>
                  </TouchableOpacity>
                ) : null
              )}

              {/* ── Return to Citizen Dashboard ── */}
              {uiMode === 'valet' && (
                <TouchableOpacity
                  style={[localStyles.alertBtn, { width: 38, height: 38 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setUiMode('citizen');
                  }}
                >
                  <Ionicons name="home-outline" size={18} color={D.white} />
                </TouchableOpacity>
              )}

              {/* ── Sign Out ── */}
              <TouchableOpacity
                style={[localStyles.alertBtn, { width: 38, height: 38, borderColor: D.red + '40' }]}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  signOut();
                }}
              >
                <Ionicons name="log-out-outline" size={18} color={D.red} />
              </TouchableOpacity>

              {/* ── Notifications ── */}
              <TouchableOpacity style={[localStyles.alertBtn, { width: 38, height: 38 }]}>
                <Ionicons name="notifications-outline" size={20} color={D.white} />
                <View style={[localStyles.alertBadge, { top: 8, right: 8 }]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          {[
            { id: 'live', label: 'LIVE' },
            { id: 'sessions', label: 'HISTORY' },
            { id: 'lots', label: 'STAFF' },
            { id: 'finance', label: 'FINANCE' },
          ]
          .filter(t => {
            const uiMode = useAuthStore.getState().uiMode;
            if (uiMode === 'valet') {
              return t.id !== 'finance' && t.id !== 'lots';
            }
            return true;
          })
          .map((tab) => (
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

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <SectionTitle title={lots[selectedLotIndex]?.name || "Live Lot Grid"} style={{ marginBottom: 0 }} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {uiMode === 'merchant' && (
                        <TouchableOpacity 
                          style={{ backgroundColor: D.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md }}
                          onPress={() => setShowAddLot(true)}
                        >
                          <Typography variant="hint" style={{ color: D.ink, fontWeight: '700' }}>Add</Typography>
                        </TouchableOpacity>
                      )}
                      {lots.length > 1 && (
                        <TouchableOpacity 
                          style={{ backgroundColor: D.lift, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1, borderColor: D.edge }}
                          onPress={() => setSelectedLotIndex((prev) => (prev + 1) % lots.length)}
                        >
                          <Typography variant="hint" style={{ color: D.white, fontWeight: '600' }}>Switch</Typography>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <VisualLotMap 
                    spots={visualSpots} 
                    currentLotName={lots[selectedLotIndex]?.name}
                    onSpotPress={(s) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                          <Typography variant="title">{s.plate || 'AA-A12345'}</Typography>
                          <Typography variant="hint" color="sub">In: {new Date(s.start_time).toLocaleTimeString()}</Typography>
                        </View>
                        <TouchableOpacity style={localStyles.endBtn} onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          setPinInput('');
                          setPinModal({ sessionId: s.id, plate: s.plate || 'Unknown' });
                        }}>
                          <Typography variant="h3" style={{ color: D.ink }}>Verify PIN</Typography>
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
                        <Typography variant="title">{s.plate}</Typography>
                        <Typography variant="hint" color="sub">{new Date(s.start_time).toLocaleDateString()}</Typography>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Typography variant="title" color={(s.status === 'completed' || s.status === 'SETTLED') ? "primary" : "sub"}>
                          {s.calculated_cost ? fmtETB(s.calculated_cost) : '---'}
                        </Typography>
                        <Typography variant="hint" style={{ color: s.status === 'active' ? D.gold : D.sub }}>{s.status.toUpperCase()}</Typography>
                      </View>
                    </Surface>
                  ))}
                </View>
              )}

              {activeTab === 'lots' && (
                <View style={{ padding: Spacing.xl }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <SectionTitle title="Staff Roster" style={{ marginBottom: 0 }} />
                    {useAuthStore.getState().uiMode !== 'valet' && (
                      <TouchableOpacity 
                        style={{ 
                          backgroundColor: D.gold, 
                          width: 44, 
                          height: 44, 
                          borderRadius: 22, 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          ...Shadow.primary
                        }}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          setShowAddStaff(true);
                        }}
                      >
                        <Ionicons name="add" size={28} color={D.ink} />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {staff.length === 0 ? (
                    <View style={localStyles.emptyState}>
                      <Ionicons name="people-outline" size={48} color={D.lift} />
                      <Typography variant="body" color="sub">No staff registered for this lot.</Typography>
                    </View>
                  ) : (
                    staff.map((s, i) => {
                      const verifiedCount = sessions.filter(ses => 
                        ses.collected_by_id === s.profile_id && 
                        (ses.status === 'completed' || ses.status === 'SETTLED')
                      ).length;

                      return (
                        <Surface key={s.id} variant="lift" style={localStyles.staffCard}>
                          <View style={[localStyles.statusIndicator, { backgroundColor: s.is_online ? D.primary : D.sub }]} />
                          <View style={localStyles.carIcon}>
                            <Ionicons name="person" size={20} color={D.gold} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Typography variant="title">{s.profile?.full_name || 'Staff Member'}</Typography>
                            <Typography variant="hint" color="sub">{s.role?.toUpperCase() || 'VALET'} • {s.is_online ? 'ONLINE' : 'OFFLINE'}</Typography>
                          </View>
                          
                          {s.profile_id === currentUser?.id ? (
                            <TouchableOpacity 
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onUpdateStaffStatus(s.id, !s.is_online);
                              }}
                              style={{ 
                                paddingHorizontal: 12, 
                                paddingVertical: 6, 
                                borderRadius: 12, 
                                backgroundColor: s.is_online ? D.primary + '20' : D.edge,
                                borderWidth: 1,
                                borderColor: s.is_online ? D.primary : D.sub
                              }}
                            >
                              <Typography variant="hint" style={{ color: s.is_online ? D.primary : D.sub, fontWeight: 'bold' }}>
                                {s.is_online ? 'GO OFFLINE' : 'GO ONLINE'}
                              </Typography>
                            </TouchableOpacity>
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Typography variant="h2" color="primary">{verifiedCount}</Typography>
                                <Typography variant="hint" style={{ fontSize: 8 }}>SESSIONS VERIFIED</Typography>
                              </View>
                              <TouchableOpacity 
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                  onRevokeStaff(s.id);
                                }}
                                style={{ padding: 8 }}
                              >
                                <Ionicons name="trash-outline" size={20} color={D.red} />
                              </TouchableOpacity>
                            </View>
                          )}
                        </Surface>
                      );
                    })
                  )}
                </View>
              )}

              {activeTab === 'finance' && (
                <View style={{ padding: Spacing.xl }}>
                  <Surface variant="lift" style={localStyles.financeHero}>
                    <Typography variant="h2">Net Payout Ready</Typography>
                    <Typography variant="h1" color="primary" style={{ fontSize: 40, marginVertical: 12 }}>{fmtETB(dailyRev * 0.85)}</Typography>
                    <View style={localStyles.targetBar}>
                      <View style={[localStyles.targetFill, { width: '65%' }]} />
                    </View>
                    <Typography variant="hint" color="sub">65% of Daily Target (5,000 ETB)</Typography>
                    <TouchableOpacity style={[localStyles.withdrawBtn, { marginTop: 20 }]} onPress={handleWithdraw}>
                      <Typography variant="h2" style={{ color: D.ink }}>Request Payout</Typography>
                    </TouchableOpacity>
                  </Surface>
                  
                  <SectionTitle title="Financial Health" />
                  <Surface variant="flat" style={localStyles.breakdownCard}>
                    <View style={localStyles.breakdownRow}>
                      <Typography variant="body">Gross Revenue</Typography>
                      <Typography variant="title">{fmtETB(dailyRev)}</Typography>
                    </View>
                    <View style={localStyles.breakdownRow}>
                      <Typography variant="body">Platform Fee (15%)</Typography>
                      <Typography variant="title" color="red">-{fmtETB(dailyRev * 0.15)}</Typography>
                    </View>
                    <View style={[localStyles.breakdownRow, { borderTopWidth: 1, borderColor: D.edge, marginTop: 8, paddingTop: 8 }]}>
                      <Typography variant="h3">Net Earnings</Typography>
                      <Typography variant="h3" color="primary">{fmtETB(dailyRev * 0.85)}</Typography>
                    </View>
                  </Surface>

                  <SectionTitle title="Occupancy Insights" />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Surface variant="lift" style={{ flex: 1, padding: 16, borderRadius: Radius.lg }}>
                      <Typography variant="title">Peak Hour</Typography>
                      <Typography variant="h2" color="gold">2:00 PM</Typography>
                      <Typography variant="hint" color="sub">Avg 95% Full</Typography>
                    </Surface>
                    <Surface variant="lift" style={{ flex: 1, padding: 16, borderRadius: Radius.lg }}>
                      <Typography variant="title">Avg Stay</Typography>
                      <Typography variant="h2" color="primary">2h 15m</Typography>
                      <Typography variant="hint" color="sub">Zone A-1</Typography>
                    </Surface>
                  </View>
                </View>
              )}
            </MotiView>
          </AnimatePresence>
        </ScrollView>

        {/* Walk-In Modal */}
        <Modal visible={walkInModal} transparent animationType="slide">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
          >
            <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} activeOpacity={1} onPress={() => setWalkInModal(false)} />
            <View style={localStyles.bottomSheet}>
              <Typography variant="h2" style={{ marginBottom: 4 }}>Log Walk-In Vehicle</Typography>
              <Typography variant="hint" color="sub" style={{ marginBottom: 20 }}>Enter the license plate of the vehicle entering off-app.</Typography>
              <TextInput
                style={localStyles.pinInput}
                placeholder="e.g. AA-A 12345"
                placeholderTextColor={D.sub}
                value={walkInPlate}
                onChangeText={setWalkInPlate}
                autoCapitalize="characters"
              />
              <TouchableOpacity 
                style={[localStyles.withdrawBtn, { width: '100%', marginTop: 16 }]}
                onPress={() => {
                  if (!walkInPlate.trim()) return;
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  const handleConfirm = async () => {
                    if (walkInPlate.length < 4) return;
                    const success = await handleStartManualSession(walkInPlate, lots[selectedLotIndex]?.id);
                    if (success) {
                      setWalkInPlate('');
                      setWalkInModal(false);
                    }
                  };
                  handleConfirm();
                }}
              >
                <Typography variant="h3" style={{ color: D.ink }}>Start Session</Typography>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── Add Staff Modal ── */}
      <Modal visible={showAddStaff} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <View style={localStyles.modalOverlay}>
            <Surface variant="card" style={localStyles.modalContent}>
              <Typography variant="h2" color="primary" style={{ marginBottom: 8 }}>Register Valet</Typography>
              <Typography variant="body" color="sub" style={{ marginBottom: 24 }}>Enter the phone number of the user you wish to add as a parking staff.</Typography>
              
               <TextInput
                style={localStyles.input}
                placeholder="0911223344"
                placeholderTextColor={D.sub}
                value={staffPhone}
                onChangeText={setStaffPhone}
                keyboardType="phone-pad"
              />

            {isSearchingStaff && (
              <Typography variant="sub" style={{ color: D.gold, marginTop: 4 }}>
                Searching for citizen...
              </Typography>
            )}

            {foundStaff && (
              <View style={{ 
                marginTop: 12, 
                padding: 12, 
                backgroundColor: foundStaff.isVerified ? D.primary + '20' : D.red + '10', 
                borderRadius: 8,
                borderWidth: 1,
                borderColor: foundStaff.isVerified ? D.primary + '40' : D.red + '40'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="sub" style={{ color: foundStaff.isVerified ? D.primary : D.red }}>
                    {foundStaff.isVerified ? '✓ Verified Account Found:' : '⚠ Unverified Account Found:'}
                  </Typography>
                  {!foundStaff.isVerified && (
                    <Ionicons name="warning" size={14} color={D.red} />
                  )}
                </View>
                <Typography variant="h3" style={{ color: D.ink }}>{foundStaff.name}</Typography>
                {!foundStaff.isVerified && (
                  <Typography variant="hint" style={{ color: D.red, marginTop: 4 }}>
                    Staff must complete Fayda/KYC verification before they can be registered.
                  </Typography>
                )}
              </View>
            )}

            {!foundStaff && staffPhone.length >= 10 && !isSearchingStaff && (
              <Typography variant="sub" style={{ color: D.red, marginTop: 8 }}>
                No citizen found with this number. They must register first.
              </Typography>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity 
                style={[localStyles.modalButton, { backgroundColor: D.lift, flex: 1 }]}
                onPress={() => {
                  setStaffPhone('');
                  setShowAddStaff(false);
                }}
              >
                <Typography variant="h3" style={{ color: D.gold }}>Cancel</Typography>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[localStyles.modalButton, { backgroundColor: D.primary, flex: 1 }]}
                onPress={async () => {
                  if (staffPhone.length < 10) return;
                  const success = await handleAddStaff(staffPhone);
                  if (success) {
                    setStaffPhone('');
                    setShowAddStaff(false);
                  }
                }}
              >
                <Typography variant="h3" style={{ color: D.ink }}>Add Staff</Typography>
              </TouchableOpacity>
            </View>
          </Surface>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── PIN Verification Modal ── */}
        <Modal visible={!!pinModal} transparent animationType="slide">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
          >
            <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} activeOpacity={1} onPress={() => setPinModal(null)} />
            <View style={localStyles.bottomSheet}>
              <Typography variant="h2" style={{ marginBottom: 4 }}>Verify Exit PIN</Typography>
              <Typography variant="hint" color="sub" style={{ marginBottom: 4 }}>Vehicle: <Typography variant="title">{pinModal?.plate}</Typography></Typography>
              <Typography variant="hint" color="sub" style={{ marginBottom: 20 }}>Ask the citizen for their 6-digit Pass-Key.</Typography>
              <TextInput
                style={localStyles.pinInput}
                placeholder="_ _ _ _ _ _"
                placeholderTextColor={D.sub}
                value={pinInput}
                onChangeText={setPinInput}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[localStyles.withdrawBtn, { marginTop: 16, opacity: pinInput.length === 6 ? 1 : 0.4 }]}
                disabled={pinInput.length < 6}
                onPress={async () => {
                  if (!pinModal) return;
                  const success = await actions.onFinalizeSession(pinModal.sessionId, 'WALLET', 0, pinInput);
                  if (success) {
                    setPinModal(null);
                    setPinInput('');
                  }
                }}
              >
                <Typography variant="h3" style={{ color: D.ink }}>Confirm & Close Session</Typography>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>

        <Modal visible={showAddLot} transparent animationType="fade">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
          >
          <View style={localStyles.modalOverlay}>
            <Surface variant="card" style={localStyles.modalContent}>
              <Typography variant="h2" color="primary" style={{ marginBottom: 4 }}>New Parking Zone</Typography>
              <Typography variant="body" color="sub" style={{ marginBottom: 16 }}>Define the capacity and location for your new parking area.</Typography>
              
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                <TextInput
                  style={localStyles.input}
                  placeholder="Zone Name (e.g. Zone B)"
                  placeholderTextColor={D.sub}
                  value={newLotName}
                  onChangeText={setNewLotName}
                />
                
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TextInput
                    style={[localStyles.input, { flex: 1 }]}
                    placeholder="Capacity"
                    placeholderTextColor={D.sub}
                    value={newLotCapacity}
                    onChangeText={setNewLotCapacity}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[localStyles.input, { flex: 1 }]}
                    placeholder="Hourly (ETB)"
                    placeholderTextColor={D.sub}
                    value={newLotRate}
                    onChangeText={setNewLotRate}
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                   <TextInput
                    style={[localStyles.input, { flex: 1 }]}
                    placeholder="Overnight (ETB)"
                    placeholderTextColor={D.sub}
                    value={newLotOvernight}
                    onChangeText={setNewLotOvernight}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity 
                    onPress={() => setNewLotType(newLotType === 'private' ? 'association' : 'private')}
                    style={[localStyles.input, { flex: 1, justifyContent: 'center', backgroundColor: D.gold + '10', borderColor: D.gold }]}
                  >
                    <Typography variant="hint" style={{ color: D.gold, fontWeight: '700' }}>{newLotType === 'private' ? '🏢 PRIVATE' : '👥 ASSOC.'}</Typography>
                  </TouchableOpacity>
                </View>

                {!newLotCoords ? (
                  <TouchableOpacity 
                    style={[localStyles.input, { backgroundColor: D.primary + '10', borderColor: D.primary, alignItems: 'center', justifyContent: 'center' }]}
                    onPress={async () => {
                      const l = await getCurrentLocation();
                      if (l) setNewLotCoords(l);
                    }}
                  >
                    <Typography variant="hint" style={{ color: D.primary, fontWeight: '800' }}>📍 PIN CURRENT LOCATION</Typography>
                  </TouchableOpacity>
                ) : (
                  <View style={[localStyles.input, { backgroundColor: D.surface, borderColor: D.primary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Typography variant="hint" style={{ color: D.white }}>📍 {newLotCoords.lat.toFixed(4)}, {newLotCoords.lng.toFixed(4)}</Typography>
                    <TouchableOpacity onPress={() => setNewLotCoords(null)}>
                      <Ionicons name="close-circle" size={16} color={D.red} />
                    </TouchableOpacity>
                  </View>
                )}

                {!is247 && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TextInput
                      style={[localStyles.input, { flex: 1 }]}
                      placeholder="Opens (06:00)"
                      placeholderTextColor={D.sub}
                      value={newLotOpening}
                      onChangeText={setNewLotOpening}
                    />
                    <TextInput
                      style={[localStyles.input, { flex: 1 }]}
                      placeholder="Closes (22:00)"
                      placeholderTextColor={D.sub}
                      value={newLotClosing}
                      onChangeText={setNewLotClosing}
                    />
                  </View>
                )}

                <TouchableOpacity 
                  onPress={() => setIs247(!is247)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}
                >
                  <Ionicons name={is247 ? "checkbox" : "square-outline"} size={20} color={is247 ? D.primary : D.sub} />
                  <Typography variant="body" color={is247 ? "white" : "subText"}>Operating 24/7</Typography>
                </TouchableOpacity>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity 
                  style={[localStyles.modalButton, { flex: 1, backgroundColor: D.surface, borderWidth: 1, borderColor: D.edge }]}
                  onPress={() => setShowAddLot(false)}
                >
                  <Typography variant="h3" style={{ color: D.white }}>Cancel</Typography>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[localStyles.modalButton, { flex: 2, backgroundColor: D.primary }]}
                  disabled={isSavingLot || !newLotName || !newLotCapacity || !newLotCoords}
                  onPress={async () => {
                    setIsSavingLot(true);
                    const success = await onAddLot(
                      newLotName, 
                      parseInt(newLotCapacity), 
                      parseFloat(newLotRate),
                      parseFloat(newLotOvernight),
                      newLotType,
                      is247,
                      newLotOpening,
                      newLotClosing,
                      newLotCoords || undefined
                    );
                    setIsSavingLot(false);
                    if (success) {
                      setShowAddLot(false);
                      setNewLotName('');
                      setNewLotCapacity('');
                      setNewLotCoords(null);
                    }
                  }}
                >
                  {isSavingLot ? (
                    <ActivityIndicator color={D.ink} />
                  ) : (
                    <Typography variant="h3" style={{ color: D.ink }}>Create Zone</Typography>
                  )}
                </TouchableOpacity>
              </View>
            </Surface>
          </View>
          </KeyboardAvoidingView>
        </Modal>

      {/* ── Global Floating Action Button ── */}
      {activeTab === 'live' && (
        <TouchableOpacity 
          style={localStyles.fab}
          onPress={() => { 
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setWalkInPlate(''); 
            setWalkInModal(true); 
          }}
        >
          <Ionicons name="add-circle" size={32} color={D.ink} />
          <Typography variant="h3" style={{ color: D.ink, marginLeft: 4 }}>Walk-In</Typography>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  alertBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.edge },
  alertBadge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: D.red, borderWidth: 2, borderColor: D.ink },
  // Online/Offline status pill styles
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: D.sub, backgroundColor: D.surface },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  heroStats: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  heroCard: { flex: 1, padding: 16, borderRadius: Radius.lg, alignItems: 'center', backgroundColor: D.surface },
  sessionCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: Radius.lg, marginBottom: 12 },
  carIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: D.gold + '20', alignItems: 'center', justifyContent: 'center' },
  endBtn: { backgroundColor: D.gold, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.md, ...Shadow.primary },
  logCard: { flexDirection: 'row', padding: 16, borderRadius: Radius.lg, marginBottom: 10, borderLeftWidth: 4 },
  emptyState: { padding: 40, alignItems: 'center' },
  financeHero: { padding: 32, borderRadius: Radius['2xl'], alignItems: 'center', marginBottom: 24, backgroundColor: D.primary + '05' },
  withdrawBtn: { backgroundColor: D.primary, paddingVertical: 16, paddingHorizontal: 40, borderRadius: Radius['2xl'], alignItems: 'center', ...Shadow.primary },
  breakdownCard: { padding: 20, borderRadius: Radius.lg },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  bottomSheet: { backgroundColor: D.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  pinInput: { backgroundColor: D.surface, borderRadius: Radius.lg, padding: 16, color: D.white, fontSize: 24, letterSpacing: 10, textAlign: 'center', borderWidth: 1, borderColor: D.edge },
  targetBar: { width: '100%', height: 6, backgroundColor: D.edge, borderRadius: 3, marginVertical: 8, overflow: 'hidden' },
  targetFill: { height: '100%', backgroundColor: D.gold },
  staffCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.lg, marginBottom: 12, overflow: 'hidden' },
  statusIndicator: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 32, borderRadius: Radius['2xl'], overflow: 'hidden' },
  input: { backgroundColor: D.surface, borderRadius: Radius.lg, padding: 16, color: D.white, fontSize: 18, borderWidth: 1, borderColor: D.edge, marginTop: 12 },
  modalButton: { paddingVertical: 14, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: D.gold,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    ...Shadow.primary,
    elevation: 8,
  },
});

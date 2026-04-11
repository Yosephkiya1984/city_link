import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  Animated,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/AppStore';
import { Colors, LightColors, FontSize, Radius, Spacing, Shadow, Fonts } from '../../theme';
import { CButton, Card, SectionTitle, LoadingRow } from '../../components';
import { fmtETB, genQrToken, uid } from '../../utils';
import {
  fetchParkingLots,
  startParkingSession,
  endParkingSession,
} from '../../services/parking.service';
import { useRealtimePostgres } from '../../hooks/useRealtimePostgres';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Demo parking lots
const DEMO_LOTS = [
  {
    id: 'lot-1',
    name: 'Bole Road Car Park',
    subcity: 'Bole',
    total_spots: 80,
    rate_per_hour: 15,
    spots: generateSpots(80, 'lot-1'),
  },
  {
    id: 'lot-2',
    name: 'Piassa Multi-Storey',
    subcity: 'Arada',
    total_spots: 120,
    rate_per_hour: 12,
    spots: generateSpots(120, 'lot-2'),
  },
  {
    id: 'lot-3',
    name: 'Mexico Square Parking',
    subcity: 'Kirkos',
    total_spots: 60,
    rate_per_hour: 10,
    spots: generateSpots(60, 'lot-3'),
  },
];

function generateSpots(count, lotId) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${lotId}-spot-${i + 1}`,
    number: `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`,
    status: Math.random() < 0.35 ? 'occupied' : 'available',
  }));
}

/** Map Supabase parking_lots + parking_spots rows to local grid model. */
function mapLotsFromDb(rows) {
  return rows.map((lot) => {
    const raw = lot.parking_spots || [];
    const spots = raw.map((s, i) => ({
      id: s.id || `${lot.id}-s-${i}`,
      number: String(s.spot_number ?? s.label ?? s.number ?? i + 1),
      status: /occupied|held|reserved|busy/i.test(String(s.status || ''))
        ? 'occupied'
        : 'available',
    }));
    const total = lot.total_spots || spots.length || 1;
    return {
      id: lot.id,
      name: lot.name,
      subcity: lot.subcity || 'Addis Ababa',
      total_spots: total,
      rate_per_hour: Number(lot.rate_per_hour ?? 15),
      spots: spots.length ? spots : generateSpots(Math.min(total, 80), lot.id),
    };
  });
}

export default function ParkingScreen() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const currentUser = useAppStore((s) => s.currentUser);
  const activeParking = useAppStore((s) => s.activeParking);
  const setActiveParking = useAppStore((s) => s.setActiveParking);
  const balance = useAppStore((s) => s.balance);
  const setBalance = useAppStore((s) => s.setBalance);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const showToast = useAppStore((s) => s.showToast);

  const [lots, setLots] = useState(DEMO_LOTS);
  const [selectedLot, setSelectedLot] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval;
    if (activeParking) {
      interval = setInterval(() => {
        const secs = Math.floor(
          (Date.now() - new Date(activeParking.start_time || activeParking.startTime).getTime()) /
            1000
        );
        setElapsed(secs);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeParking]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await fetchParkingLots();
      if (!cancelled && data?.length) setLots(mapLotsFromDb(data));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshLots = useCallback(async () => {
    const { data } = await fetchParkingLots();
    if (data?.length) setLots(mapLotsFromDb(data));
  }, []);

  const parkUserId = currentUser?.id;
  useRealtimePostgres({
    channelName: parkUserId ? `cl-rt-parking-${parkUserId}` : 'cl-rt-parking',
    table: 'parking_sessions',
    filter: undefined,
    enabled: !!parkUserId,
    onPayload: refreshLots,
  });

  function formatElapsed(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function getCurrentFare() {
    if (!activeParking) return 0;
    const hours = elapsed / 3600;
    return Math.ceil(hours * activeParking.ratePerHour * 10) / 10;
  }

  async function handleStartParking() {
    if (!selectedSpot || !selectedLot) return;
    if (balance < 10) {
      showToast('Insufficient balance. Top up first.', 'error');
      return;
    }
    setLoading(true);
    const sessionId = uid();
    const session = {
      id: sessionId,
      user_id: currentUser?.id,
      lot_id: selectedLot.id,
      lot_name: selectedLot.name,
      spot_id: selectedSpot.id,
      spot_number: selectedSpot.number,
      start_time: new Date().toISOString(),
      rate_per_hour: selectedLot.rate_per_hour,
      qr_token: genQrToken('PRK'),
      status: 'active',
    };

    const { error } = await startParkingSession(session);
    if (error) {
      showToast('Could not start parking session', 'error');
      setLoading(false);
      return;
    }

    setActiveParking(session);
    // Mark spot as occupied
    setLots((prev) =>
      prev.map((l) =>
        l.id === selectedLot.id
          ? {
              ...l,
              spots: l.spots.map((s) =>
                s.id === selectedSpot.id ? { ...s, status: 'occupied' } : s
              ),
            }
          : l
      )
    );
    setSelectedLot(null);
    setSelectedSpot(null);
    setConfirmModal(false);
    showToast(`Parking started at spot ${session.spot_number} ðŸ…¿ï¸`, 'success');
    setLoading(false);
  }

  async function handleEndParking() {
    if (!activeParking) return;
    const fare = getCurrentFare();
    if (balance < fare) {
      showToast('Insufficient balance to pay fare', 'error');
      return;
    }
    setLoading(true);

    try {
      const res = await endParkingSession(
        activeParking.id,
        currentUser?.id,
        activeParking.lot_name || activeParking.lotName,
        activeParking.spot_number || activeParking.spotNumber,
        fare
      );

      if (res.error) {
        showToast(res.error || 'Could not finalize parking session', 'error');
        return;
      }

      // Sync local state
      const finalBalance = res.data?.new_balance ?? balance - fare;
      setBalance(finalBalance);

      // Free the spot in the local lot grid so it shows as available again
      setLots((prev) =>
        prev.map((l) =>
          l.id === activeParking.lotId || l.id === activeParking.lot_id
            ? {
                ...l,
                spots: l.spots.map((s) =>
                  s.id === activeParking.spotId || s.id === activeParking.spot_id
                    ? { ...s, status: 'available' }
                    : s
                ),
              }
            : l
        )
      );

      showToast(`Parking ended. Fare: ${fmtETB(fare)} ETB`, 'success');
      setActiveParking(null);
      setElapsed(0);

      // Haptic feedback for completion
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('🔧 handleEndParking crash:', e);
      showToast('Connection error finalizing session', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleLotPress = (lot) => {
    setSelectedLot(selectedLot?.id === lot.id ? null : lot);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSpotPress = (spot) => {
    if (spot.status === 'occupied') return;
    setSelectedSpot(spot);
    setConfirmModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#101319',
    },

    // Custom Header - Fixed Position
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      backgroundColor: 'rgba(16, 19, 25, 0.9)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.4,
      shadowRadius: 48,
      elevation: 24,
      paddingHorizontal: 24,
      paddingVertical: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    profileImage: {
      width: 40,
      height: 40,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.2)',
    },
    brandName: {
      fontSize: 18,
      fontWeight: '700',
      color: '#59de9b',
      fontFamily: Fonts.headline,
      letterSpacing: -0.5,
    },
    walletBadge: {
      backgroundColor: '#191c21',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.1)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    walletAmount: {
      fontSize: 16,
      fontWeight: '700',
      color: '#59de9b',
      fontFamily: Fonts.headline,
      letterSpacing: -0.3,
    },

    // Main Content Area
    contentArea: {
      flex: 1,
      paddingTop: 110, // Space for custom header
      paddingBottom: 120, // Space for bottom nav
    },

    // Scroll View with proper spacing
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 40,
    },

    // Active Parking Session Banner
    activeSessionBanner: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#1d2025',
      borderRadius: 12,
      padding: 24,
      marginBottom: 40,
      borderLeftWidth: 4,
      borderLeftColor: '#59de9b',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    sessionIcon: {
      position: 'absolute',
      top: 0,
      right: 0,
      padding: 32,
      opacity: 0.1,
    },
    sessionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    sessionStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#59de9b',
    },
    statusText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#59de9b',
      fontFamily: Fonts.label,
      textTransform: 'uppercase',
      letterSpacing: 0.2,
    },
    sessionTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
    },
    sessionSubtitle: {
      fontSize: 14,
      color: '#bccabe',
      fontFamily: Fonts.body,
      marginTop: 4,
    },
    sessionTimer: {
      alignItems: 'flex-end',
    },
    timerText: {
      fontSize: 22,
      fontWeight: '800',
      color: '#ffd887',
      fontFamily: Fonts.headline,
      letterSpacing: 1,
    },
    rateText: {
      fontSize: 12,
      color: '#bccabe',
      fontFamily: Fonts.body,
      marginTop: 4,
    },
    sessionActions: {
      flexDirection: 'row',
      gap: 8,
    },
    qrButton: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.2)',
      alignItems: 'center',
    },
    qrButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.label,
    },
    endButton: {
      flex: 1,
      backgroundColor: '#ff5a4c',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: '#ff5a4c',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    endButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.label,
    },

    // Parking Lots Section
    parkingSection: {
      marginBottom: 40,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
      letterSpacing: -0.3,
    },
    refreshTime: {
      fontSize: 10,
      fontWeight: '700',
      color: '#59de9b',
      fontFamily: Fonts.label,
      textTransform: 'uppercase',
      letterSpacing: 0.2,
    },
    lotsList: {
      gap: 16,
    },
    lotCard: {
      backgroundColor: '#1d2025',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.05)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      overflow: 'hidden',
    },
    lotHeader: {
      padding: 20,
    },
    lotInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    lotDetails: {
      flex: 1,
    },
    lotName: {
      fontSize: 18,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
    },
    lotLocation: {
      fontSize: 14,
      color: '#bccabe',
      fontFamily: Fonts.body,
      marginTop: 4,
    },
    lotPricing: {
      alignItems: 'flex-end',
    },
    priceAmount: {
      fontSize: 20,
      fontWeight: '800',
      color: '#59de9b',
      fontFamily: Fonts.headline,
    },
    priceLabel: {
      fontSize: 12,
      color: '#bccabe',
      fontFamily: Fonts.body,
      marginTop: 2,
    },
    availabilityBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    progressBar: {
      flex: 1,
      height: 4,
      backgroundColor: '#32353b',
      borderRadius: 2,
    },
    progressFill: {
      height: 4,
      borderRadius: 2,
    },
    availabilityText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#bccabe',
      fontFamily: Fonts.label,
    },

    // Spot Selection Grid
    spotSelection: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(134, 148, 137, 0.1)',
    },
    spotSelectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#bccabe',
      fontFamily: Fonts.label,
      textTransform: 'uppercase',
      letterSpacing: 0.2,
      marginBottom: 16,
    },
    spotGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    spotButton: {
      width: 44,
      height: 36,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    spotAvailable: {
      backgroundColor: '#191c21',
      borderColor: 'rgba(134, 148, 137, 0.2)',
    },
    spotSelected: {
      backgroundColor: 'rgba(89, 222, 155, 0.1)',
      borderColor: '#59de9b',
    },
    spotOccupied: {
      backgroundColor: 'rgba(255, 90, 76, 0.1)',
      borderColor: 'rgba(255, 90, 76, 0.2)',
      opacity: 0.5,
    },
    spotText: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: Fonts.label,
    },
    spotTextAvailable: {
      color: '#bccabe',
    },
    spotTextSelected: {
      color: '#59de9b',
    },
    spotTextOccupied: {
      color: '#ff5a4c',
    },
    spotLegend: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 16,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 3,
      borderWidth: 1.5,
    },
    legendText: {
      fontSize: 12,
      color: '#bccabe',
      fontFamily: Fonts.body,
    },

    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
      backgroundColor: '#101319',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      padding: 24,
      paddingBottom: 40,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: 18,
      color: '#bccabe',
      fontFamily: Fonts.body,
      marginBottom: 20,
    },
    modalInfo: {
      backgroundColor: '#191c21',
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
    },
    modalButton: {
      backgroundColor: '#59de9b',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 24,
      alignItems: 'center',
      shadowColor: '#59de9b',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#101319',
      fontFamily: Fonts.label,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    cancelButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.2)',
      alignItems: 'center',
      marginTop: 8,
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.label,
    },

    // QR Modal
    qrModalContent: {
      backgroundColor: '#101319',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      padding: 24,
      paddingBottom: 40,
      alignItems: 'center',
    },
    qrCard: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    qrTitle: {
      color: '#666',
      fontSize: 12,
      textAlign: 'center',
      letterSpacing: 1,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 8,
      fontFamily: Fonts.label,
    },
    qrCode: {
      fontFamily: 'Courier',
      fontSize: 14,
      color: '#333',
      fontWeight: '700',
      letterSpacing: 1,
      textAlign: 'center',
    },
    qrDescription: {
      color: '#bccabe',
      textAlign: 'center',
      fontFamily: Fonts.body,
    },
  });

  return (
    <View style={styles.container}>
      {/* Custom Header - Fixed Position */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.profileImage}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_QR_FniUXCslWzPE1iOtR204CdDlO3hTqRa4b8DugkIRWNCrNOs3qQ-2uu-n0OS8vUwwTIKxFkp9vv1xFV61KwyMYNzOkFxPl9DH8uJyOLZEqYOh_9rE2vsnrQWd5jM5XJhjdStneTudMk5VDZU4wOjaf3DzP2fAuf7bXY0aEAugCn599yqM5AhdPtmbdJMUMPJ9D295G8g0QJXRCw_x9IGG33hCRGcQ0phNKIbUIQyaczNnRBoyGlQfj2dUNbcW6keam_ayug0Bh',
              }}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
          <Text style={styles.brandName}>ETHIO-SUPER</Text>
        </View>
        <View style={styles.walletBadge}>
          <Ionicons name="wallet" size={16} color="#ffd887" />
          <Text style={styles.walletAmount}>ETB {fmtETB(balance)}</Text>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.contentArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Parking Session Banner */}
          {activeParking && (
            <View style={styles.activeSessionBanner}>
              <View style={styles.sessionIcon}>
                <Ionicons name="car" size={80} color="#59de9b" />
              </View>
              <View style={styles.sessionHeader}>
                <View>
                  <View style={styles.sessionStatus}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Active Session</Text>
                  </View>
                  <Text style={styles.sessionTitle}>Spot {activeParking.spotNumber}</Text>
                  <Text style={styles.sessionSubtitle}>{activeParking.lotName}</Text>
                </View>
                <View style={styles.sessionTimer}>
                  <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
                  <Text style={styles.rateText}>{activeParking.ratePerHour} ETB/hr</Text>
                </View>
              </View>
              <View style={styles.sessionActions}>
                <TouchableOpacity style={styles.qrButton} onPress={() => setQrModal(true)}>
                  <Text style={styles.qrButtonText}>ðŸ“± Show QR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.endButton} onPress={handleEndParking}>
                  <Text style={styles.endButtonText}>End â€¢ {fmtETB(getCurrentFare())} ETB</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Parking Lots Section */}
          <View style={styles.parkingSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Parking Lots</Text>
              <Text style={styles.refreshTime}>Refresh 2:40 PM</Text>
            </View>

            <View style={styles.lotsList}>
              {lots.map((lot) => {
                const available = lot.spots.filter((s) => s.status === 'available').length;
                const pct = Math.round((available / lot.total_spots) * 100);
                const progressColor = pct > 50 ? '#59de9b' : pct > 20 ? '#ffd887' : '#ff5a4c';

                return (
                  <TouchableOpacity
                    key={lot.id}
                    onPress={() => handleLotPress(lot)}
                    style={styles.lotCard}
                    activeOpacity={0.8}
                  >
                    <View style={styles.lotHeader}>
                      <View style={styles.lotInfo}>
                        <View style={styles.lotDetails}>
                          <Text style={styles.lotName}>{lot.name}</Text>
                          <Text style={styles.lotLocation}>ðŸ“ {lot.subcity}</Text>
                        </View>
                        <View style={styles.lotPricing}>
                          <Text style={styles.priceAmount}>{lot.rate_per_hour} ETB</Text>
                          <Text style={styles.priceLabel}>per hour</Text>
                        </View>
                      </View>

                      <View style={styles.availabilityBar}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${pct}%`, backgroundColor: progressColor },
                            ]}
                          />
                        </View>
                        <Text style={styles.availabilityText}>
                          {available}/{lot.total_spots} free
                        </Text>
                      </View>
                    </View>

                    {/* Spot Selection Grid */}
                    {selectedLot?.id === lot.id && (
                      <View style={styles.spotSelection}>
                        <Text style={styles.spotSelectionTitle}>Select a spot</Text>
                        <View style={styles.spotGrid}>
                          {lot.spots.slice(0, 40).map((spot) => {
                            const isSelected = selectedSpot?.id === spot.id;
                            const spotStyle =
                              spot.status === 'occupied'
                                ? styles.spotOccupied
                                : isSelected
                                  ? styles.spotSelected
                                  : styles.spotAvailable;
                            const textStyle =
                              spot.status === 'occupied'
                                ? styles.spotTextOccupied
                                : isSelected
                                  ? styles.spotTextSelected
                                  : styles.spotTextAvailable;

                            return (
                              <TouchableOpacity
                                key={spot.id}
                                disabled={spot.status === 'occupied'}
                                onPress={() => handleSpotPress(spot)}
                                style={[styles.spotButton, spotStyle]}
                                activeOpacity={0.8}
                              >
                                <Text style={[styles.spotText, textStyle]}>{spot.number}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <View style={styles.spotLegend}>
                          <View style={styles.legendItem}>
                            <View
                              style={[
                                styles.legendDot,
                                {
                                  backgroundColor: 'rgba(89, 222, 155, 0.2)',
                                  borderColor: '#59de9b',
                                },
                              ]}
                            />
                            <Text style={styles.legendText}>Available</Text>
                          </View>
                          <View style={styles.legendItem}>
                            <View
                              style={[
                                styles.legendDot,
                                {
                                  backgroundColor: 'rgba(89, 222, 155, 0.2)',
                                  borderColor: '#59de9b',
                                },
                              ]}
                            />
                            <Text style={styles.legendText}>Selected</Text>
                          </View>
                          <View style={styles.legendItem}>
                            <View
                              style={[
                                styles.legendDot,
                                {
                                  backgroundColor: 'rgba(255, 90, 76, 0.2)',
                                  borderColor: '#ff5a4c',
                                },
                              ]}
                            />
                            <Text style={styles.legendText}>Occupied</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Confirm Modal */}
      <Modal visible={confirmModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmModal(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Confirm Parking</Text>
          {selectedLot && selectedSpot && (
            <>
              <Text style={styles.modalSubtitle}>
                {selectedLot.name} â€” Spot{' '}
                <Text style={{ color: '#e1e2ea', fontWeight: '700' }}>{selectedSpot.number}</Text>
              </Text>
              <View style={styles.modalInfo}>
                <Row label="Rate" value={`${selectedLot.rate_per_hour} ETB/hr`} />
                <Row label="Your Balance" value={`${fmtETB(balance)} ETB`} />
              </View>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleStartParking}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Startingâ€¦' : 'ðŸ…¿ï¸ Start Parking'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* QR Modal */}
      <Modal visible={qrModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setQrModal(false)} />
        <View style={styles.qrModalContent}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Parking QR Code</Text>
            <Text style={styles.qrCode}>{activeParking?.qrToken}</Text>
          </View>
          <Text style={styles.qrDescription}>Show this to the parking attendant</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setQrModal(false)}>
            <Text style={styles.cancelButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: '#bccabe', fontSize: 14, fontFamily: Fonts.body }}>{label}</Text>
      <Text
        style={{ color: '#e1e2ea', fontWeight: '700', fontSize: 14, fontFamily: Fonts.headline }}
      >
        {value}
      </Text>
    </View>
  );
}

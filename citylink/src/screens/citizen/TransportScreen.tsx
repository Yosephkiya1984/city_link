import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  Animated,
  FlatList,
  Image,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useAppStore, saveSession } from '../../store/AppStore';
import { Colors, LightColors, FontSize, Radius, Spacing, Shadow, Fonts } from '../../theme';
import {
  CButton,
  CInput,
  CSelect,
  SearchBar,
  ChipBar,
  EmptyState,
  LoadingRow,
  SectionTitle,
} from '../../components';
import { fmtETB, timeAgo, uid, fmtDateTime, genQrToken } from '../../utils';
import { bookBusTicket } from '../../services/transit.service';
import { t } from '../../utils/i18n';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// â”€â”€ Transport Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EDR_ROUTES = [
  {
    id: '1',
    from: 'Addis Ababa',
    to: 'Dire Dawa',
    departure: '06:00',
    arrival: '08:30',
    price: 450,
    available: 45,
    trainType: 'Express',
    classOptions: ['Economy', 'Business', 'First Class'],
  },
  {
    id: '2',
    from: 'Addis Ababa',
    to: 'Dire Dawa',
    departure: '08:15',
    arrival: '10:45',
    price: 380,
    available: 23,
    trainType: 'Regular',
    classOptions: ['Economy', 'Business'],
  },
  {
    id: '3',
    from: 'Addis Ababa',
    to: 'Dire Dawa',
    departure: '10:30',
    arrival: '13:00',
    price: 450,
    available: 67,
    trainType: 'Express',
    classOptions: ['Economy', 'Business', 'First Class'],
  },
  {
    id: '4',
    from: 'Addis Ababa',
    to: 'Dire Dawa',
    departure: '14:00',
    arrival: '16:30',
    price: 420,
    available: 12,
    trainType: 'Regular',
    classOptions: ['Economy', 'Business'],
  },
];

const NEARBY_STATIONS = [
  {
    id: '1',
    name: 'Megenagna Station',
    line: 'NS',
    lineColor: '#006940',
    distance: '250m',
    direction: 'Towards Minilik II Square',
    eta: '2 MIN',
    status: 'On Time',
    statusColor: '#59de9b',
    coordinates: { lat: 9.0272, lng: 38.7465 },
  },
  {
    id: '2',
    name: 'Hayahulet 1',
    line: 'EW',
    lineColor: '#0057b7',
    distance: '800m',
    direction: 'Towards Tor Hailoch',
    eta: '7 MIN',
    status: 'Arriving',
    statusColor: '#59de9b',
    coordinates: { lat: 9.0125, lng: 38.7617 },
  },
  {
    id: '3',
    name: 'Lem Hotel',
    line: 'NS',
    lineColor: '#006940',
    distance: '1.2km',
    direction: 'Towards Akaki',
    eta: '14 MIN',
    status: 'Delayed',
    statusColor: '#ffd887',
    coordinates: { lat: 8.9806, lng: 38.7892 },
  },
];

// â”€â”€ Transport Screen Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function TransportScreen() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const balance = useAppStore((s) => s.balance);
  const setBalance = useAppStore((s) => s.setBalance);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const showToast = useAppStore((s) => s.showToast);
  const currentUser = useAppStore((s) => s.currentUser);

  const [activeTab, setActiveTab] = useState('lrt'); // lrt, anbessa
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState(null);
  const [showStationModal, setShowStationModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // EDR Railway booking state
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedClass, setSelectedClass] = useState('Economy');
  const [passengers, setPassengers] = useState(1);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const handleStationPress = (station) => {
    setSelectedStation(station);
    setShowStationModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleQuickAction = (action) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (action) {
      case 'scan':
        showToast('QR Scanner coming soon!', 'info');
        break;
      case 'history':
        showToast('Transport history coming soon!', 'info');
        break;
    }
  };

  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    setShowBookingModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleBookTicket = async () => {
    if (!selectedRoute) return;
    if (!currentUser) {
      showToast('Sign in to book tickets', 'error');
      return;
    }

    const totalPrice = selectedRoute.price * passengers;
    if (balance < totalPrice) {
      showToast('Insufficient balance for booking', 'error');
      return;
    }

    setLoading(true);
    try {
      const qrToken = `EDR_${uid()}`;
      // Reusing bus ticket RPC for EDR as they share similar route/price structure in this superset
      const res = await bookBusTicket(selectedRoute.id, currentUser.id, qrToken);

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      const newBal = res.data?.new_balance;
      if (newBal !== undefined) setBalance(newBal);

      setShowBookingModal(false);
      setSelectedRoute(null);
      showToast(
        `Booking confirmed! ${passengers} ticket(s) for ETB ${fmtETB(totalPrice)} ðŸš‚`,
        'success'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('EDR Booking Error:', e);
      showToast('Booking failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#101319',
    },

    // Main Content Area
    contentArea: {
      flex: 1,
      paddingTop: 110, // Space for custom header (moved down)
      paddingBottom: 120, // Space for bottom nav
    },

    // Custom Header - Fixed Position
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      backgroundColor: 'rgba(16, 19, 25, 0.7)',
      backdropFilter: 'blur(20px)',
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

    // Scroll View with proper spacing
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 40,
    },

    // Tab Switcher - Centered
    tabSwitcher: {
      flexDirection: 'row',
      padding: 4,
      backgroundColor: '#191c21',
      borderRadius: 24,
      marginBottom: 32,
      alignSelf: 'center',
      width: 280,
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.05)',
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabText: {
      fontSize: 12,
      fontWeight: '500',
      color: '#bccabe',
      fontFamily: Fonts.headline,
      letterSpacing: 0.5,
    },
    activeTab: {
      backgroundColor: '#272a30',
    },
    activeTabText: {
      color: '#59de9b',
      fontWeight: '700',
    },

    // Active Journey Banner
    journeyBanner: {
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
      paddingRight: 16,
    },
    journeyIcon: {
      position: 'absolute',
      top: 0,
      right: 0,
      padding: 32,
      opacity: 0.1,
    },
    journeyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 32,
      paddingRight: 4,
    },
    journeyStatus: {
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
    journeyTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
    },
    tapOutButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.2)',
      marginTop: 4,
      marginRight: 4,
      alignSelf: 'flex-start',
      minWidth: 70,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tapOutText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.label,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    progressContainer: {
      position: 'relative',
      height: 8,
      backgroundColor: '#32353b',
      borderRadius: 4,
      marginBottom: 16,
      overflow: 'hidden',
    },
    progressBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '66.67%',
      backgroundColor: '#59de9b',
      borderRadius: 4,
      shadowColor: '#59de9b',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
    },
    journeyDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    journeyDetail: {
      flex: 1,
    },
    journeyDetailLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: '#bccabe',
      fontFamily: Fonts.label,
      textTransform: 'uppercase',
      letterSpacing: 0.2,
    },
    journeyDetailValue: {
      fontSize: 12,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
      marginTop: 4,
    },

    // Map & Quick Actions Grid - Proper Layout
    gridContainer: {
      flexDirection: 'row',
      gap: 24,
      marginBottom: 40,
    },
    mapSection: {
      flex: 2,
      height: 320,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.1)',
    },
    mapImage: {
      width: '100%',
      height: '100%',
      opacity: 0.6,
    },
    mapOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      padding: 24,
      flexDirection: 'column',
      justifyContent: 'space-between',
    },
    mapIndicators: {
      flexDirection: 'row',
      gap: 8,
    },
    mapIndicator: {
      backgroundColor: 'rgba(16, 19, 25, 0.8)',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
    },
    mapIndicatorText: {
      fontSize: 10,
      fontWeight: '700',
      fontFamily: Fonts.label,
      textTransform: 'uppercase',
      letterSpacing: 0.2,
    },
    liveTraffic: {
      borderColor: '#59de9b',
    },
    liveTrafficText: {
      color: '#59de9b',
    },
    northSouthLine: {
      borderColor: '#ffd887',
    },
    northSouthText: {
      color: '#ffd887',
    },
    mapCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    locationPin: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinOuter: {
      position: 'absolute',
      width: 32,
      height: 32,
      backgroundColor: 'rgba(89, 222, 155, 0.2)',
      borderRadius: 16,
    },
    pinInner: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#59de9b',
      borderWidth: 4,
      borderColor: '#101319',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    mapBottom: {
      alignItems: 'flex-end',
    },
    locationButton: {
      width: 48,
      height: 48,
      backgroundColor: 'rgba(39, 42, 48, 0.9)',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.2)',
    },

    // Quick Actions - Two Stacked Cards
    quickActions: {
      flex: 1,
      gap: 24,
    },
    quickActionCard: {
      backgroundColor: '#191c21',
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.1)',
      flex: 1,
      justifyContent: 'space-between',
    },
    quickActionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    quickActionIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scanIcon: {
      backgroundColor: 'rgba(89, 222, 155, 0.1)',
    },
    historyIcon: {
      backgroundColor: 'rgba(255, 216, 135, 0.1)',
    },
    quickActionContent: {
      flex: 1,
    },
    quickActionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
      lineHeight: 24,
    },
    quickActionDescription: {
      fontSize: 12,
      color: '#bccabe',
      fontFamily: Fonts.body,
      marginTop: 4,
    },

    // Nearby Stations Section
    stationsSection: {
      marginBottom: 40,
    },
    stationsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    stationsTitle: {
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
    stationsList: {
      gap: 12,
    },
    stationCard: {
      backgroundColor: '#1d2025',
      borderRadius: 12,
      padding: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.05)',
    },
    delayedStation: {
      backgroundColor: 'rgba(25, 28, 33, 0.5)',
      opacity: 0.6,
    },
    stationLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      flex: 1,
    },
    stationLineBadge: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#272a30',
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: 4,
    },
    stationLineText: {
      fontSize: 10,
      fontWeight: '700',
      fontFamily: Fonts.label,
      lineHeight: 10,
    },
    stationInfo: {
      flex: 1,
    },
    stationName: {
      fontSize: 16,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
    },
    stationDetails: {
      fontSize: 12,
      color: '#bccabe',
      fontFamily: Fonts.body,
      marginTop: 4,
    },
    stationRight: {
      alignItems: 'flex-end',
    },
    stationEta: {
      fontSize: 20,
      fontWeight: '700',
      color: '#59de9b',
      fontFamily: Fonts.headline,
      lineHeight: 20,
    },
    delayedEta: {
      color: '#ffd887',
    },
    stationStatus: {
      fontSize: 10,
      fontWeight: '700',
      color: '#bccabe',
      fontFamily: Fonts.label,
      textTransform: 'uppercase',
      letterSpacing: 0.2,
      marginTop: 4,
    },

    // Modal
    modalContent: {
      backgroundColor: '#101319',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      padding: 24,
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      paddingBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(134, 148, 137, 0.2)',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
    },
    modalButton: {
      backgroundColor: '#59de9b',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 24,
      alignItems: 'center',
      marginTop: 24,
    },
    modalButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#101319',
      fontFamily: Fonts.label,
    },
    stationDetailsModal: {
      gap: 16,
      paddingVertical: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    detailLabel: {
      fontSize: 14,
      color: '#bccabe',
      fontFamily: Fonts.label,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: '#e1e2ea',
      fontFamily: Fonts.body,
    },

    // EDR Railway Booking Styles
    bookingSection: {
      marginBottom: 40,
    },
    bookingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    bookingTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
      letterSpacing: -0.3,
    },
    bookingFilters: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.2)',
      backgroundColor: '#191c21',
    },
    filterButtonActive: {
      backgroundColor: '#59de9b',
      borderColor: '#59de9b',
    },
    filterButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#bccabe',
      fontFamily: Fonts.label,
    },
    filterButtonTextActive: {
      color: '#101319',
    },
    routesList: {
      gap: 16,
    },
    routeCard: {
      backgroundColor: '#1d2025',
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.05)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    routeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    routeInfo: {
      flex: 1,
    },
    routeFromTo: {
      fontSize: 18,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
      marginBottom: 4,
    },
    routeTime: {
      fontSize: 14,
      color: '#bccabe',
      fontFamily: Fonts.body,
    },
    routePrice: {
      alignItems: 'flex-end',
    },
    priceAmount: {
      fontSize: 24,
      fontWeight: '700',
      color: '#59de9b',
      fontFamily: Fonts.headline,
    },
    priceLabel: {
      fontSize: 12,
      color: '#bccabe',
      fontFamily: Fonts.label,
      marginTop: 2,
    },
    routeDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(134, 148, 137, 0.1)',
    },
    trainType: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    trainTypeIcon: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: 'rgba(89, 222, 155, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    trainTypeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#59de9b',
      fontFamily: Fonts.label,
    },
    availability: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    availabilityText: {
      fontSize: 12,
      color: '#bccabe',
      fontFamily: Fonts.body,
    },
    availabilityCount: {
      fontSize: 14,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
    },
    bookButton: {
      backgroundColor: '#59de9b',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      alignItems: 'center',
      shadowColor: '#59de9b',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    bookButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#101319',
      fontFamily: Fonts.label,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    // Booking Modal
    bookingModalContent: {
      backgroundColor: '#101319',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      padding: 24,
      flex: 1,
    },
    bookingModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      paddingBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(134, 148, 137, 0.2)',
    },
    bookingModalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
    },
    bookingOptions: {
      gap: 20,
      marginBottom: 24,
    },
    optionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(134, 148, 137, 0.1)',
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#e1e2ea',
      fontFamily: Fonts.body,
    },
    optionValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    passengerButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: '#191c21',
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    passengerButtonActive: {
      backgroundColor: '#59de9b',
      borderColor: '#59de9b',
    },
    passengerButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#bccabe',
      fontFamily: Fonts.headline,
    },
    passengerButtonTextActive: {
      color: '#101319',
    },
    classSelector: {
      flexDirection: 'row',
      gap: 8,
    },
    classOption: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.2)',
      backgroundColor: '#191c21',
    },
    classOptionActive: {
      backgroundColor: '#59de9b',
      borderColor: '#59de9b',
    },
    classOptionText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#bccabe',
      fontFamily: Fonts.label,
    },
    classOptionTextActive: {
      color: '#101319',
    },
    bookingSummary: {
      backgroundColor: '#1d2025',
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(134, 148, 137, 0.1)',
      marginBottom: 24,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: '#bccabe',
      fontFamily: Fonts.body,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: '700',
      color: '#e1e2ea',
      fontFamily: Fonts.headline,
    },
    totalPrice: {
      fontSize: 24,
      fontWeight: '700',
      color: '#59de9b',
      fontFamily: Fonts.headline,
    },
    confirmButton: {
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
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#101319',
      fontFamily: Fonts.label,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
          {/* Tab Switcher */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'lrt' && styles.activeTab]}
              onPress={() => setActiveTab('lrt')}
            >
              <Text style={[styles.tabText, activeTab === 'lrt' && styles.activeTabText]}>
                LRT LIGHT RAIL
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'anbessa' && styles.activeTab]}
              onPress={() => setActiveTab('anbessa')}
            >
              <Text style={[styles.tabText, activeTab === 'anbessa' && styles.activeTabText]}>
                EDR RAILWAY
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'lrt' ? (
            <>
              {/* Active Journey Banner */}
              <View style={styles.journeyBanner}>
                <View style={styles.journeyIcon}>
                  <Ionicons name="train" size={80} color="#59de9b" />
                </View>
                <View style={styles.journeyHeader}>
                  <View>
                    <View style={styles.journeyStatus}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>Active Journey</Text>
                    </View>
                    <Text style={styles.journeyTitle}>Megenagna â†’ Stadium</Text>
                  </View>
                  <TouchableOpacity style={styles.tapOutButton}>
                    <Text style={styles.tapOutText}>Tap Out</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar} />
                </View>
                <View style={styles.journeyDetails}>
                  <View style={styles.journeyDetail}>
                    <Text style={styles.journeyDetailLabel}>Current Station</Text>
                    <Text style={styles.journeyDetailValue}>Urael</Text>
                  </View>
                  <View style={styles.journeyDetail}>
                    <Text style={styles.journeyDetailLabel}>ETA at Stadium</Text>
                    <Text style={styles.journeyDetailValue}>6 MINS</Text>
                  </View>
                </View>
              </View>

              {/* Map & Quick Actions Grid */}
              <View style={styles.gridContainer}>
                {/* Map Section */}
                <View style={styles.mapSection}>
                  <Image
                    source={{
                      uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBR7C_lBp9Ai-e1Pzw59Wy5nfYhkzuvEdDaGjN3VWmQE7tqSa1k4HDiDD_caC9xnyRmMup5R98cUOCm8dhOfveIWo9rJsNV2WQzVPANgp8wjr83BDLPT0v-fi4SFT9q4oPhYDnkXAoM3q6mQ2ufrBcbg7pz-FrcYfdEAnZJYb1a0Uic2JQYBKD43UFIU09wYkKo-LJO4vEuPO8uIMLy2RCWJePd8jfXV6U_lTpXhYc6hNOUzZabz_1trXSJB7XWHTupy0Fo52eGp_fW',
                    }}
                    style={styles.mapImage}
                  />
                  <View style={styles.mapOverlay}>
                    <View style={styles.mapIndicators}>
                      <View style={[styles.mapIndicator, styles.liveTraffic]}>
                        <Text style={[styles.mapIndicatorText, styles.liveTrafficText]}>
                          LIVE TRAFFIC
                        </Text>
                      </View>
                      <View style={[styles.mapIndicator, styles.northSouthLine]}>
                        <Text style={[styles.mapIndicatorText, styles.northSouthText]}>
                          NORTH-SOUTH LINE
                        </Text>
                      </View>
                    </View>
                    <View style={styles.mapCenter}>
                      <View style={styles.locationPin}>
                        <View style={styles.pinOuter} />
                        <View style={styles.pinInner}>
                          <Ionicons name="train" size={12} color="#101319" />
                        </View>
                      </View>
                    </View>
                    <View style={styles.mapBottom}>
                      <TouchableOpacity style={styles.locationButton}>
                        <Ionicons name="location" size={20} color="#e1e2ea" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Quick Actions - Two Stacked Cards */}
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={() => handleQuickAction('scan')}
                  >
                    <View style={styles.quickActionHeader}>
                      <View style={[styles.quickActionIcon, styles.scanIcon]}>
                        <Ionicons name="qr-code" size={20} color="#59de9b" />
                      </View>
                      <Ionicons name="arrow-forward" size={16} color="#bccabe" />
                    </View>
                    <View style={styles.quickActionContent}>
                      <Text style={styles.quickActionTitle}>Quick Scan</Text>
                      <Text style={styles.quickActionDescription}>Direct entry gate access</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={() => handleQuickAction('history')}
                  >
                    <View style={styles.quickActionHeader}>
                      <View style={[styles.quickActionIcon, styles.historyIcon]}>
                        <Ionicons name="time" size={20} color="#ffd887" />
                      </View>
                      <Ionicons name="arrow-forward" size={16} color="#bccabe" />
                    </View>
                    <View style={styles.quickActionContent}>
                      <Text style={styles.quickActionTitle}>History</Text>
                      <Text style={styles.quickActionDescription}>Previous transit logs</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Nearby Stations */}
              <View style={styles.stationsSection}>
                <View style={styles.stationsHeader}>
                  <Text style={styles.stationsTitle}>Nearby Stations</Text>
                  <Text style={styles.refreshTime}>Refresh 2:40 PM</Text>
                </View>

                <View style={styles.stationsList}>
                  {NEARBY_STATIONS.map((station) => (
                    <TouchableOpacity
                      key={station.id}
                      style={[
                        styles.stationCard,
                        station.status === 'Delayed' && styles.delayedStation,
                      ]}
                      onPress={() => handleStationPress(station)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.stationLeft}>
                        <View
                          style={[styles.stationLineBadge, { borderTopColor: station.lineColor }]}
                        >
                          <Text style={[styles.stationLineText, { color: station.lineColor }]}>
                            {station.line}
                          </Text>
                          <Ionicons name="subway" size={20} color="#e1e2ea" />
                        </View>
                        <View style={styles.stationInfo}>
                          <Text style={styles.stationName}>{station.name}</Text>
                          <Text style={styles.stationDetails}>
                            {station.distance} â€¢ {station.direction}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.stationRight}>
                        <Text
                          style={[
                            styles.stationEta,
                            station.status === 'Delayed' && styles.delayedEta,
                          ]}
                        >
                          {station.eta}
                        </Text>
                        <Text style={styles.stationStatus}>{station.status}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          ) : (
            /* EDR Railway Booking Section */
            <View style={styles.bookingSection}>
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingTitle}>EDR Railway Booking</Text>
              </View>

              <View style={styles.bookingFilters}>
                <TouchableOpacity style={[styles.filterButton, styles.filterButtonActive]}>
                  <Text style={[styles.filterButtonText, styles.filterButtonTextActive]}>
                    Today
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterButton}>
                  <Text style={styles.filterButtonText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterButton}>
                  <Text style={styles.filterButtonText}>This Week</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.routesList}>
                {EDR_ROUTES.map((route) => (
                  <TouchableOpacity
                    key={route.id}
                    style={styles.routeCard}
                    onPress={() => handleRouteSelect(route)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.routeHeader}>
                      <View style={styles.routeInfo}>
                        <Text style={styles.routeFromTo}>
                          {route.from} â†’ {route.to}
                        </Text>
                        <Text style={styles.routeTime}>
                          {route.departure} - {route.arrival}
                        </Text>
                      </View>
                      <View style={styles.routePrice}>
                        <Text style={styles.priceAmount}>ETB {fmtETB(route.price)}</Text>
                        <Text style={styles.priceLabel}>per person</Text>
                      </View>
                    </View>
                    <View style={styles.routeDetails}>
                      <View style={styles.trainType}>
                        <View style={styles.trainTypeIcon}>
                          <Ionicons name="train" size={14} color="#59de9b" />
                        </View>
                        <Text style={styles.trainTypeText}>{route.trainType}</Text>
                      </View>
                      <View style={styles.availability}>
                        <Text style={styles.availabilityText}>Available:</Text>
                        <Text style={styles.availabilityCount}>{route.available}</Text>
                      </View>
                      <TouchableOpacity style={styles.bookButton}>
                        <Text style={styles.bookButtonText}>Book</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Station Modal */}
      <Modal
        visible={showStationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStationModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedStation?.name}</Text>
            <TouchableOpacity onPress={() => setShowStationModal(false)}>
              <Ionicons name="close" size={24} color="#e1e2ea" />
            </TouchableOpacity>
          </View>

          {selectedStation && (
            <View style={styles.stationDetailsModal}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Line</Text>
                <Text style={styles.detailValue}>{selectedStation.line}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Direction</Text>
                <Text style={styles.detailValue}>{selectedStation.direction}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Next Arrival</Text>
                <Text style={styles.detailValue}>{selectedStation.eta}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Distance</Text>
                <Text style={styles.detailValue}>{selectedStation.distance}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => {
              setShowStationModal(false);
              showToast('Station navigation coming soon!', 'info');
            }}
          >
            <Text style={styles.modalButtonText}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* EDR Railway Booking Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.bookingModalContent}>
          <View style={styles.bookingModalHeader}>
            <Text style={styles.bookingModalTitle}>Complete Booking</Text>
            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
              <Ionicons name="close" size={24} color="#e1e2ea" />
            </TouchableOpacity>
          </View>

          {selectedRoute && (
            <>
              <View style={styles.bookingOptions}>
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Route</Text>
                  <Text style={styles.summaryValue}>
                    {selectedRoute.from} â†’ {selectedRoute.to}
                  </Text>
                </View>

                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Departure</Text>
                  <Text style={styles.summaryValue}>{selectedRoute.departure}</Text>
                </View>

                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Arrival</Text>
                  <Text style={styles.summaryValue}>{selectedRoute.arrival}</Text>
                </View>

                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Passengers</Text>
                  <View style={styles.optionValue}>
                    {[1, 2, 3, 4].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.passengerButton,
                          passengers === num && styles.passengerButtonActive,
                        ]}
                        onPress={() => setPassengers(num)}
                      >
                        <Text
                          style={[
                            styles.passengerButtonText,
                            passengers === num && styles.passengerButtonTextActive,
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Class</Text>
                  <View style={styles.classSelector}>
                    {selectedRoute.classOptions.map((cls) => (
                      <TouchableOpacity
                        key={cls}
                        style={[
                          styles.classOption,
                          selectedClass === cls && styles.classOptionActive,
                        ]}
                        onPress={() => setSelectedClass(cls)}
                      >
                        <Text
                          style={[
                            styles.classOptionText,
                            selectedClass === cls && styles.classOptionTextActive,
                          ]}
                        >
                          {cls}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.bookingSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Base Price</Text>
                  <Text style={styles.summaryValue}>ETB {fmtETB(selectedRoute.price)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Passengers</Text>
                  <Text style={styles.summaryValue}>{passengers}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total</Text>
                  <Text style={styles.totalPrice}>
                    ETB {fmtETB(selectedRoute.price * passengers)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.confirmButton} onPress={handleBookTicket}>
                <Text style={styles.confirmButtonText}>Confirm Booking</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

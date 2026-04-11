import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Platform, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, Card, SectionTitle, CInput } from '../../components';
import { fmtETB, uid, fmtDateTime } from '../../utils';
import { t } from '../../utils/i18n';

// Import all merchant dashboards
import {
  RestaurantDashboard,
  ParkingDashboard,
  EmployerDashboard,
  EkubDashboard,
  SalonDashboard,
  ClinicDashboard,
  DelalaDashboard,
  TransportDashboard
} from './index';
import ShopDashboard from './ShopDashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SALES_DEMO = [
  { id: 'tx1', customer: 'Dawit H.', amount: 1200, status: 'COMPLETED', time: '10 min ago' },
  { id: 'tx2', customer: 'Tigist B.', amount: 450, status: 'PENDING', time: '1 hour ago' },
  { id: 'tx3', customer: 'Anonymous', amount: 85, status: 'COMPLETED', time: '3 hours ago' },
];

export default function MerchantPortalScreen() {
  const navigation = useNavigation();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);
  const reset = useAppStore((s) => s.reset);

  const logout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Logged out successfully', 'success');
    reset();
    
    try {
      (navigation as any).replace('Auth');
    } catch (error) {
      console.log('Navigation reset error, trying alternative method');
      (navigation as any).navigate('Auth');
    }
  };

  const merchantType = (currentUser as any)?.merchant_type || 'restaurant';
  const normalizedType = merchantType.toLowerCase();

  // Handle unknown merchant type toast in useEffect to avoid concurrent rendering errors
  React.useEffect(() => {
    const knownTypes = [
      'restaurant', 'parking', 'shop', 'seller', 'retail', 
      'employer', 'delala', 'transport', 'bus', 'driver', 
      'salon', 'service', 'clinic', 'ekub'
    ];
    if (currentUser && !knownTypes.includes(normalizedType)) {
      console.log('âš ï¸ Unknown merchant type, defaulting to Restaurant');
      showToast(`Unknown merchant type: ${merchantType}. Defaulting to Restaurant.`, 'warning');
    }
  }, [normalizedType, currentUser]);

  // Render the appropriate dashboard based on merchant type
  const renderDashboard = () => {
    switch (normalizedType) {
      case 'restaurant':
        console.log('ðŸ½ï¸ Loading Restaurant Dashboard');
        return <RestaurantDashboard />;
      case 'parking':
        console.log('ðŸ…¿ï¸ Loading Parking Dashboard');
        return <ParkingDashboard />;
      case 'shop':
      case 'seller':
      case 'retail':
        console.log('ðŸ›ï¸ Loading Shop Dashboard');
        return <ShopDashboard />;
      case 'employer':
        console.log('👥 Loading Employer Dashboard');
        return <EmployerDashboard />;
      case 'delala':
        console.log('ðŸ  Loading Delala Dashboard');
        return <DelalaDashboard />;
      case 'transport':
      case 'bus':
      case 'driver':
        console.log('🚌 Loading Transport Dashboard');
        return <TransportDashboard />;
      case 'salon':
      case 'service':
        console.log('💈 Loading Salon Dashboard');
        return <SalonDashboard />;
      case 'clinic':
        console.log('ðŸ¥ Loading Clinic Dashboard');
        return <ClinicDashboard />;
      case 'ekub':
        console.log('👥 Loading Ekub Dashboard');
        return <EkubDashboard />;
      default:
        // Already handled warning in useEffect
        return <RestaurantDashboard />;
    }
  };

  // Add a loading state while determining the dashboard
  if (!currentUser) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: C.sub }}>Loading user data...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      {renderDashboard()}
    </View>
  );
}

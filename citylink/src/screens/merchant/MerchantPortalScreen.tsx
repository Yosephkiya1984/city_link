import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useAuthStore } from '../../store/AuthStore';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, Card, SectionTitle, CInput } from '../../components';
import { fmtETB, uid, fmtDateTime } from '../../utils';
import { t } from '../../utils/i18n';

// Import only Core 6 merchant dashboards
import {
  RestaurantDashboard,
  ParkingDashboard,
  EkubDashboard,
  DelalaDashboard,
} from './index';
import ShopDashboard from './ShopDashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MerchantPortalScreen() {
  const navigation = useNavigation();
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);
  const resetAuth = useAuthStore((s) => s.reset);
  const resetWallet = useWalletStore((s) => s.reset);
  const resetSystem = useSystemStore((s) => s.reset);
  // Wallet state not used here directly, but Dashboards may use it.

  const logout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Logged out successfully', 'success');
    resetAuth();
    resetWallet();
    resetSystem();

    try {
      (navigation as any).replace('Auth');
    } catch (error) {
      console.log('Navigation reset error, trying alternative method');
      (navigation as any).navigate('Auth');
    }
  };

  const merchantType = (currentUser as any)?.merchant_type || 'restaurant';
  const normalizedType = merchantType.toLowerCase();

  // Handle unknown merchant type toast in useEffect
  React.useEffect(() => {
    const knownTypes = [
      'retail',
      'shop',
      'seller',
      'restaurant',
      'delala',
      'ekub',
      'parking',
    ];
    if (currentUser && !knownTypes.includes(normalizedType)) {
      console.log('⚠️ Unknown merchant type, dashboard unavailable');
      showToast(`Account Type Not Supported: ${merchantType}. Contact support.`, 'warning');
    }
  }, [normalizedType, currentUser]);

  // Render the appropriate dashboard based on merchant type
  const renderDashboard = () => {
    switch (normalizedType) {
      case 'restaurant':
        return <RestaurantDashboard />;
      case 'parking':
        return <ParkingDashboard />;
      case 'shop':
      case 'seller':
      case 'retail':
        return <ShopDashboard />;
      case 'delala':
        return <DelalaDashboard />;
      case 'ekub':
        return <EkubDashboard />;
      default:
        return (
          <View style={{ flex: 1, backgroundColor: C.ink, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
            <Ionicons name="lock-closed-outline" size={64} color={C.primary} />
            <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.bold, marginTop: 16 }}>
              Dashboard Unavailable
            </Text>
            <Text style={{ color: C.sub, textAlign: 'center', marginTop: 8 }}>
              This account type is not part of the Core 6 production network. Please contact your administrator.
            </Text>
            <CButton title="Logout" onPress={logout} variant="outline" style={{ marginTop: 32, width: '100%' }} />
          </View>
        );
    }
  };

  if (!currentUser) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: C.sub }}>Loading portal...</Text>
      </View>
    );
  }

  return <View style={{ flex: 1, backgroundColor: C.ink }}>{renderDashboard()}</View>;
}

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
  ActivityIndicator,
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
import * as ProfileService from '../../services/profile.service';

// Import only Core 6 merchant dashboards
import {
  RestaurantDashboard,
  ParkingDashboard,
  EkubDashboard,
  DelalaDashboard,
  ShopDashboard,
} from './index';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MerchantPortalScreen() {
  const navigation = useNavigation();
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const currentUser = useAuthStore((s) => s.currentUser);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
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

    // The root navigator will automatically switch to Auth screen
    // because we called resetAuth() above.
  };

  const merchantType =
    (currentUser as any)?.merchant_type || (currentUser as any)?.merchant_details?.merchant_type;
  const normalizedType = merchantType?.toLowerCase();

  // Handle unknown merchant type toast in useEffect
  React.useEffect(() => {
    const knownTypes = [
      'retail',
      'shop',
      'seller',
      'restaurant',
      'cafe',
      'food',
      'delala',
      'broker',
      'ekub',
      'parking',
    ];

    async function checkAndRefresh() {
      if (!currentUser) return;

      console.log(
        '[MerchantPortal] Identity Check:',
        { id: currentUser?.id, type: merchantType, status: currentUser?.merchant_status }
      );

      if (!normalizedType || !knownTypes.includes(normalizedType)) {
        console.log('⚠️ Unknown or missing merchant type. Attempting profile refresh...');

        // SELF-HEALING: Re-fetch profile from server if type is missing in cache
        try {
          const { data: freshUser } = await ProfileService.fetchProfile(currentUser.id);
          if (freshUser && freshUser.merchant_type) {
            console.log('[MerchantPortal] Profile healed! Type:', freshUser.merchant_type);
            await setCurrentUser(freshUser);
            return;
          }
        } catch (e) {
          console.warn('[MerchantPortal] Self-healing failed:', e);
        }

        console.log('❌ Still missing or unknown merchant type after refresh.');
        if (currentUser.role !== 'merchant') {
          showToast(
            `Account Type Not Supported: ${merchantType || 'Unknown'}. Contact support.`,
            'warning'
          );
        } else {
          console.log('[MerchantPortal] Using role-based fallback dashboard.');
        }
      }
    }

    checkAndRefresh();
  }, [normalizedType, currentUser, merchantType, setCurrentUser, showToast]);

  // Render the appropriate dashboard based on merchant type
  const renderDashboard = () => {
    console.log('[MerchantPortal] Routing for type:', normalizedType);
    switch (normalizedType) {
      case 'restaurant':
      case 'cafe':
      case 'food':
        return <RestaurantDashboard />;
      case 'parking':
        return <ParkingDashboard />;
      case 'shop':
      case 'seller':
      case 'retail':
      case 'retailer':
      case 'marketplace':
        return <ShopDashboard />;
      case 'delala':
      case 'broker':
        return <DelalaDashboard />;
      case 'ekub':
        return <EkubDashboard />;
      default:
        // MANDATORY FALLBACK: If the user is a verified merchant but has an unknown or missing sub-type,
        // we default them to the ShopDashboard (Marketplace) to ensure they aren't locked out.
        if (currentUser?.role === 'merchant') {
          console.log('[MerchantPortal] Falling back to ShopDashboard for role: merchant');
          return <ShopDashboard />;
        }
        return (
          <View
            style={{
              flex: 1,
              backgroundColor: C.ink,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 40,
            }}
          >
            <Ionicons name="lock-closed-outline" size={64} color={C.primary} />
            <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.bold, marginTop: 16 }}>
              Dashboard Unavailable
            </Text>
            <Text style={{ color: C.sub, textAlign: 'center', marginTop: 8 }}>
              This account type is not part of the Core 6 production network. Please contact your
              administrator.
            </Text>
            <CButton
              title="Logout"
              onPress={logout}
              variant="outline"
              style={{ marginTop: 32, width: '100%' }}
            />
          </View>
        );
    }
  };

  if (!currentUser) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.ink,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <ActivityIndicator size="large" color={C.primary} />
        <Text
          style={{
            color: C.text,
            fontSize: 14,
            fontFamily: Fonts.bold,
            marginTop: 20,
            letterSpacing: 1,
          }}
        >
          SECURE GATEWAY
        </Text>
        <Text style={{ color: C.sub, fontSize: 12, marginTop: 8 }}>
          Hydrating merchant session...
        </Text>
      </View>
    );
  }

  return <View style={{ flex: 1, backgroundColor: C.ink }}>{renderDashboard()}</View>;
}

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
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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
import { useT } from '../../utils/i18n';
import * as ProfileService from '../../services/profile.service';
import { ConciergeComponent } from '../../components/ai/ConciergeComponent';

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
  const t = useT();
  const navigation = useNavigation();
  const route = useRoute();
  
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const currentUser = useAuthStore((s) => s.currentUser);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const routeParams = route.params as any;
  const isStaffMode = routeParams?.staffMode;
  const staffRole = routeParams?.staffRole;
  const staffMerchantType = routeParams?.merchantType;

  const logout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast(t('logged_out_msg'), 'success');
    // Use the canonical AuthStore signOut — this wipes SecurePersist, resets uiMode,
    // and clears all domain stores atomically. Do NOT call individual resets here
    // as they skip SecurePersist, causing ghost sessions and the SECURE GATEWAY loop.
    await useAuthStore.getState().signOut();
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const syncAttempted = React.useRef(false);

  const merchantType = isStaffMode 
    ? staffMerchantType 
    : ((currentUser as any)?.merchant_type || (currentUser as any)?.merchant_details?.merchant_type);
  const normalizedType = merchantType?.toLowerCase();

  // Handle unknown merchant type toast in useEffect
  React.useEffect(() => {
    const knownTypes = [
      'retail',
      'shop',
      'seller',
      'retailer',
      'marketplace',
      'restaurant',
      'cafe',
      'food',
      'delala',
      'broker',
      'ekub',
      'parking',
    ];

    async function checkAndRefresh() {
      if (!currentUser || syncAttempted.current) return;
      
      if (isStaffMode) {
        console.log('[MerchantPortal] Operating in Staff Mode for type:', merchantType);
        return;
      }

      console.log('[MerchantPortal] Identity Check:', {
        id: currentUser?.id,
        type: merchantType,
        status: currentUser?.merchant_status,
      });

      if (!normalizedType || !knownTypes.includes(normalizedType)) {
        console.log('⚠️ Unknown or missing merchant type. Attempting profile refresh...');
        syncAttempted.current = true;
        setIsSyncing(true);

        // SELF-HEALING: Re-fetch profile from server if type is missing in cache
        try {
          const { data: freshUser } = await ProfileService.fetchProfile(currentUser.id);
          if (freshUser && freshUser.merchant_type) {
            console.log('[MerchantPortal] Profile healed! Type:', freshUser.merchant_type);
            await setCurrentUser(freshUser);
            setIsSyncing(false);
            return;
          }
        } catch (e) {
          console.warn('[MerchantPortal] Self-healing failed:', e);
        }

        setIsSyncing(false);
        console.log('❌ Still missing or unknown merchant type after refresh.');
        if (currentUser.role !== 'merchant' && !isStaffMode) {
          showToast(
            `${t('unsupported_account_type_err')}: ${merchantType || 'Unknown'}.`,
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
        return <RestaurantDashboard staffMode={isStaffMode} staffRole={staffRole} />;
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
        if (!merchantType || isSyncing) {
          // Healing logic: if merchant_type is missing, try fetching full profile once before giving up
          return (
            <View style={[styles.center, { backgroundColor: C.ink, padding: 20, flex: 1, justifyContent: 'center' }]}>
              <Ionicons name="refresh-circle-outline" size={64} color={C.primary} />
              <Text style={[styles.title, { color: C.text, marginTop: 16, fontSize: 24, fontWeight: '700' }]}>Identity Recovery</Text>
              <Text style={[styles.desc, { color: C.sub, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 }]}>
                {isSyncing 
                  ? "We're re-syncing your merchant credentials. This usually happens after a session refresh or identity update..."
                  : "We couldn't automatically verify your merchant type. Please retry or sign out."}
              </Text>
              
              {isSyncing && <ActivityIndicator color={C.primary} style={{ marginBottom: 32 }} />}

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: C.primary, width: '100%', marginBottom: 12, padding: 16, borderRadius: 12, alignItems: 'center' }]}
                onPress={async () => {
                  setIsSyncing(true);
                  const { fetchProfile } = await import('../../services/profile.service');
                  const res = await fetchProfile(currentUser?.id || '');
                  if (res.data?.merchant_type) {
                    await useAuthStore.getState().setCurrentUser(res.data);
                  } else {
                    useSystemStore.getState().showToast('Profile sync failed. Please contact support.', 'error');
                  }
                  setIsSyncing(false);
                }}
                disabled={isSyncing}
              >
                <Text style={{ color: C.ink, fontWeight: '700' }}>{isSyncing ? 'Syncing...' : 'Retry Sync'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: 'transparent', width: '100%', padding: 16, borderRadius: 12, alignItems: 'center' }]}
                onPress={() => useAuthStore.getState().signOut()}
                disabled={isSyncing}
              >
                <Text style={{ color: C.sub, fontWeight: '600' }}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          );
        }

        // MANDATORY FALLBACK: If the user is a verified merchant but has an unknown sub-type,
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
              {t('dashboard_unavailable_title')}
            </Text>
            <Text style={{ color: C.sub, textAlign: 'center', marginTop: 8 }}>
              {t('merchant_type_not_production_msg')}
            </Text>
            <CButton
              title={t('logout_btn')}
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
          {t('secure_gateway_label').toUpperCase()}
        </Text>
        <Text style={{ color: C.sub, fontSize: 12, marginTop: 8 }}>
          {t('hydrating_session_msg')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      {renderDashboard()}
      <ConciergeComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.headline,
  },
  desc: {
    fontFamily: Fonts.body,
  },
  actionBtn: {
    justifyContent: 'center',
  },
});

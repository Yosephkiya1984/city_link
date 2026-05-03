import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import TopBar from '../../components/TopBar';
import { useAuthStore } from '../../store/AuthStore';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { useBiometricStore } from '../../store/BiometricStore';
import { Radius, Shadow, Fonts } from '../../theme';
import { CButton, SectionTitle } from '../../components';
import { signOut } from '../../services/auth.service';
import { hasWalletPin } from '../../services/walletPin';
import { KycService, FAYDA_STATUS } from '../../services/kyc.service';
import { fetchAgentProfile } from '../../services/delivery.service';
import { HospitalityService } from '../../services/hospitality.service';
import { useTheme } from '../../hooks/useTheme';
import { fmtETB } from '../../utils';
import { useT } from '../../utils/i18n';

export default function ProfileScreen() {
  const t = useT();
  const isDark = useSystemStore((s) => s.isDark);
  const lang = useSystemStore((s) => s.lang);
  const toggleTheme = useSystemStore((s) => s.toggleTheme);
  const C = useTheme();

  const currentUser = useAuthStore((s) => s.currentUser);
  const uiMode = useAuthStore((s) => s.uiMode);
  const setUiMode = useAuthStore((s) => s.setUiMode);
  const balance = useWalletStore((s) => s.balance);
  const showToast = useSystemStore((s) => s.showToast);
  const { isBiometricsEnabled, isBiometricsSupported, setBiometricsEnabled } = useBiometricStore();
  const navigation = useNavigation();

  const [pinSet, setPinSet] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(FAYDA_STATUS.NOT_STARTED as string);
  const [isAgent, setIsAgent] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [staffData, setStaffData] = useState<any>(null);
  const [loadingAgent, setLoadingAgent] = useState(false);

  const loadProfileData = useCallback(async () => {
    const userId = currentUser?.id;
    if (!userId)
      return { pinSetStatus: false, kycStatusValue: FAYDA_STATUS.NOT_STARTED, isAgentValue: false };

    const [pinSetStatus, statusData, agentProfile, staffCheck] = await Promise.all([
      hasWalletPin(userId),
      KycService.getKYCStatus(),
      fetchAgentProfile(userId),
      HospitalityService.getMerchantStaffProfile(userId).catch(() => null)
    ]);

    return {
      pinSetStatus,
      kycStatusValue: statusData.status,
      isAgentValue: !!agentProfile.data,
      isStaffValue: !!staffCheck,
      staffCheckData: staffCheck
    };
  }, [currentUser?.id]);

  useEffect(() => {
    setLoadingAgent(true);
    loadProfileData().then((data) => {
      setPinSet(data.pinSetStatus);
      setKycStatus(data.kycStatusValue);
      setIsAgent(data.isAgentValue);
      setIsStaff(data.isStaffValue);
      setStaffData(data.staffCheckData);
      setLoadingAgent(false);
    });
  }, [loadProfileData]);

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      useAuthStore.getState().reset();
      useWalletStore.getState().reset();
      useSystemStore.getState().reset();
    }
  }

  const kycVerified =
    kycStatus === FAYDA_STATUS.VERIFIED ||
    currentUser?.kyc_status === 'VERIFIED' ||
    currentUser?.fayda_verified === true;

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title={t('profile')} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: C.surface,
              borderWidth: 3,
              borderColor: C.primary,
              alignItems: 'center',
              justifyContent: 'center',
              ...Shadow.md,
            }}
          >
            <Text style={{ fontSize: 40, fontFamily: Fonts.black, color: C.primary }}>
              {(currentUser?.full_name || 'U')[0]}
            </Text>
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: kycVerified ? C.green : C.amber,
                borderWidth: 3,
                borderColor: C.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={kycVerified ? 'checkmark' : 'alert'} size={14} color={C.white} />
            </View>
          </View>
          <Text style={{ color: C.text, fontSize: 24, fontFamily: Fonts.black, marginTop: 16 }}>
            {currentUser?.full_name || t('member')}
          </Text>
          <Text style={{ color: C.sub, fontSize: 14, fontFamily: Fonts.medium }}>
            {currentUser?.phone}
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <View
              style={{
                backgroundColor: C.primaryL,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: Radius.full,
                borderWidth: 1,
                borderColor: C.primaryB,
              }}
            >
              <Text
                style={{
                  color: C.primary,
                  fontSize: 10,
                  fontFamily: Fonts.black,
                  textTransform: 'uppercase',
                }}
              >
                {currentUser?.role ? t('role_' + currentUser.role) : t('role_citizen')}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: kycVerified ? C.greenL : C.amberL,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: Radius.full,
                borderWidth: 1,
                borderColor: kycVerified ? C.greenB : C.amberB,
              }}
            >
              <Text
                style={{
                  color: kycVerified ? C.green : C.amber,
                  fontSize: 10,
                  fontFamily: Fonts.black,
                  textTransform: 'uppercase',
                }}
              >
                {kycVerified ? t('verified') : t('unverified')}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Strip */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 24 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              borderWidth: 1.5,
              borderColor: C.edge2,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: C.sub, fontSize: 10, fontFamily: Fonts.black }}>
              {t('balance_up')}
            </Text>
            <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black, marginTop: 4 }}>
              {fmtETB(balance, 0)}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              borderWidth: 1.5,
              borderColor: C.edge2,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: C.sub, fontSize: 10, fontFamily: Fonts.black }}>
              {t('trust_score')}
            </Text>
            <Text style={{ color: C.primary, fontSize: 18, fontFamily: Fonts.black, marginTop: 4 }}>
              {currentUser?.credit_score || 720}
            </Text>
          </View>
        </View>

        {/* Merchant Portal Entry */}
        {currentUser?.role === 'merchant' && (
          <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('MerchantPortal')}
              style={{
                backgroundColor: C.primary,
                borderRadius: Radius.xl,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                ...Shadow.md,
              }}
            >
              <Ionicons name="storefront" size={28} color={C.white} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.white, fontSize: 18, fontFamily: Fonts.black }}>
                  {t('merchant_portal')}
                </Text>
                <Text
                  style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: Fonts.medium }}
                >
                  {t('merchant_desc')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Staff Portal Entry */}
        {isStaff && (
          <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('MerchantPortal', { 
                staffMode: true, 
                staffRole: staffData?.role,
                merchantType: staffData?.merchant?.merchant_type,
                merchantId: staffData?.merchant?.id
              })}
              style={{
                backgroundColor: C.primary,
                borderRadius: Radius.xl,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                ...Shadow.md,
              }}
            >
              <Ionicons name="restaurant" size={28} color={C.white} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.white, fontSize: 18, fontFamily: Fonts.black }}>
                  {t('staff_dashboard') || 'Staff Dashboard'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: Fonts.medium }}>
                  Manage tables and orders
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Delivery Agent Entry */}
        {currentUser?.role === 'delivery_agent' || isAgent ? (
          <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => {
                console.log('[Profile] Switching mode. Current uiMode:', uiMode);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                if (uiMode === 'agent') {
                  console.log('[Profile] Setting mode to citizen');
                  setUiMode('citizen');
                  showToast(t('switch_to_citizen'), 'info');
                } else {
                  console.log('[Profile] Setting mode to agent');
                  setUiMode('agent');
                  showToast(t('enter_delivery'), 'success');
                }
              }}
              style={{
                backgroundColor: uiMode === 'agent' ? C.primaryL : C.surface,
                borderRadius: Radius.xl,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                borderWidth: 1.5,
                borderColor: uiMode === 'agent' ? C.primary : C.edge2,
                ...Shadow.md,
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor:
                    uiMode === 'agent' ? 'rgba(104,211,145,0.15)' : 'rgba(99,179,237,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={uiMode === 'agent' ? 'person-outline' : 'bicycle'}
                  size={26}
                  color={uiMode === 'agent' ? C.primary : C.sub}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: uiMode === 'agent' ? C.primary : C.text,
                    fontSize: 16,
                    fontFamily: Fonts.black,
                  }}
                >
                  {uiMode === 'agent' ? t('switch_to_citizen') : t('enter_delivery')}
                </Text>
                <Text
                  style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginTop: 2 }}
                >
                  {uiMode === 'agent' ? t('return_to_main') : t('start_delivery')}
                </Text>
              </View>
              {loadingAgent ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <Ionicons
                  name="repeat-outline"
                  size={20}
                  color={uiMode === 'agent' ? C.primary : C.sub}
                />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('BecomeDeliveryAgent')}
              style={{
                backgroundColor: C.surface,
                borderRadius: Radius.xl,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                borderWidth: 1.5,
                borderColor: C.primary,
                ...Shadow.sm,
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: C.primaryL,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="bicycle" size={26} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black }}>
                  {t('work_with_citylink')}
                </Text>
                <Text
                  style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginTop: 2 }}
                >
                  {t('earn_money_agent')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Settings List */}
        <SectionTitle title={t('acc_settings')} />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {[
            {
              icon: 'moon',
              label: t('dark_mode'),
              type: 'switch',
              value: isDark,
              onValueChange: () => toggleTheme(),
            },
            {
              icon: 'lock-closed',
              label: t('wallet_pin'),
              value: pinSet ? t('active') : t('not_set'),
              onPress: () => showToast(t('pin_coming'), 'info'),
            },
            ...(isBiometricsSupported
              ? [
                  {
                    icon: 'finger-print',
                    label: t('biometric_lock'),
                    type: 'switch',
                    value: isBiometricsEnabled,
                    onValueChange: (val: boolean) => {
                      setBiometricsEnabled(val);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    },
                  },
                ]
              : []),
            {
              icon: 'shield-checkmark',
              label: t('id_kyc'),
              value: kycVerified ? t('verified') : t('unverified'),
              onPress: () =>
                showToast(kycVerified ? t('kyc_completed') : t('kyc_reg_info'), 'info'),
            },
            {
              icon: 'language',
              label: t('app_lang'),
              value: lang === 'am' ? t('amharic') : lang === 'om' ? t('oromo') : t('english'),
              onPress: () => (navigation as any).navigate('Language'),
            },
            {
              icon: 'chatbubbles',
              label: t('messages'),
              onPress: () => (navigation as any).navigate('ChatInbox'),
            },
            {
              icon: 'help-circle',
              label: t('help_support'),
              onPress: () => showToast(t('help_coming'), 'info'),
            },
          ].map((item: any, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={item.onPress}
              activeOpacity={item.type === 'switch' ? 1 : 0.7}
              style={{
                backgroundColor: C.surface,
                borderRadius: Radius.xl,
                padding: 18,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                borderWidth: 1.5,
                borderColor: C.edge2,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: C.lift,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={item.icon as any} size={20} color={C.primary} />
              </View>
              <Text style={{ flex: 1, color: C.text, fontSize: 15, fontFamily: Fonts.black }}>
                {item.label}
              </Text>
              {item.type === 'switch' ? (
                <Switch
                  value={item.value}
                  onValueChange={item.onValueChange}
                  trackColor={{ false: C.edge, true: C.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#FFF' : item.value ? C.primary : '#F4F3F4'}
                />
              ) : (
                <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.bold }}>
                  {item.value} ›
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ padding: 32 }}>
          <CButton title={t('sign_out')} onPress={() => handleLogout()} variant="danger" />
          <Text
            style={{
              color: C.hint,
              textAlign: 'center',
              marginTop: 16,
              fontSize: 11,
              fontFamily: Fonts.medium,
            }}
          >
            {t('build_info')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

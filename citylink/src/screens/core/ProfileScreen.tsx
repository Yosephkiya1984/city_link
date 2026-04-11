import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Switch, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useAppStore, saveSession } from '../../store/AppStore';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, CInput, SectionTitle, Card } from '../../components';
import { signOut } from '../../services/auth.service';
import { hasWalletPin, setWalletPin, changeWalletPin } from '../../services/walletPin';
import { FaydaKYCService, FAYDA_STATUS } from '../../services/fayda-kyc.service';
import { ServiceAccessUtils } from '../../services/serviceAccess';
import { useTheme } from '../../hooks/useTheme';
import { fmtETB } from '../../utils';
import { t } from '../../utils/i18n';

export default function ProfileScreen() {
  const isDark = useAppStore((s) => s.isDark);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const C = useTheme();
  
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const balance = useAppStore((s) => s.balance);
  const transactions = useAppStore((s) => s.transactions);
  const reset = useAppStore((s) => s.reset);
  const showToast = useAppStore((s) => s.showToast);
  const navigation = useNavigation();

  const [pinSet, setPinSet] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>(FAYDA_STATUS.NOT_STARTED);
  const [kycData, setKycData] = useState(null);
  const [isAgent, setIsAgent] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(false);

  useEffect(() => {
    (async () => {
      setPinSet(await hasWalletPin(currentUser?.id));
      // Load KYC status
      const statusData = await FaydaKYCService.getKYCStatus();
      setKycStatus(statusData.status);
      setKycData(statusData.kyc_data);
      
      // Check if they are a delivery agent
      if (currentUser?.id) {
        setLoadingAgent(true);
        const { fetchAgentProfile } = require('../../services/delivery.service');
        const res = await fetchAgentProfile(currentUser.id);
        if (res.data) setIsAgent(true);
        setLoadingAgent(false);
      }
    })();
  }, [currentUser?.id]);

  async function handleLogout() {
    await signOut();
    await saveSession(null);
    reset();
  }

  const roleColor = currentUser?.role === 'merchant' ? '#FF9500' : '#007AFF';
  const kycVerified = kycStatus === FAYDA_STATUS.VERIFIED;

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title={t('profile')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header */}
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
           <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: C.surface, borderWidth: 3, borderColor: C.primary, alignItems: 'center', justifyContent: 'center', ...Shadow.md }}>
              <Text style={{ fontSize: 40, fontFamily: Fonts.black, color: C.primary }}>{(currentUser?.full_name || 'U')[0]}</Text>
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: kycVerified ? C.green : C.amber, borderWidth: 3, borderColor: C.surface, alignItems:'center', justifyContent:'center' }}>
                 <Ionicons name={kycVerified ? "checkmark" : "alert"} size={14} color={C.white} />
              </View>
           </View>
           <Text style={{ color: C.text, fontSize: 24, fontFamily: Fonts.black, marginTop: 16 }}>{currentUser?.full_name || t('member')}</Text>
           <Text style={{ color: C.sub, fontSize: 14, fontFamily: Fonts.medium }}>{currentUser?.phone}</Text>
           
           <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <View style={{ backgroundColor: C.primaryL, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: C.primaryB }}>
                 <Text style={{ color: C.primary, fontSize: 10, fontFamily: Fonts.black, textTransform: 'uppercase' }}>{currentUser?.role ? t('role_' + currentUser.role) : t('role_citizen')}</Text>
              </View>
              <View style={{ backgroundColor: kycVerified ? C.greenL : C.amberL, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: kycVerified ? C.greenB : C.amberB }}>
                 <Text style={{ color: kycVerified ? C.green : C.amber, fontSize: 10, fontFamily: Fonts.black, textTransform: 'uppercase' }}>{kycVerified ? t('verified') : t('unverified')}</Text>
              </View>
           </View>
        </View>

        {/* Stats Strip */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 24 }}>
           <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: Radius.xl, padding: 16, borderWidth: 1.5, borderColor: C.edge2, alignItems: 'center' }}>
              <Text style={{ color: C.sub, fontSize: 10, fontFamily: Fonts.black }}>{t('balance_up')}</Text>
              <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black, marginTop: 4 }}>{fmtETB(balance, 0)}</Text>
           </View>
           <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: Radius.xl, padding: 16, borderWidth: 1.5, borderColor: C.edge2, alignItems: 'center' }}>
              <Text style={{ color: C.sub, fontSize: 10, fontFamily: Fonts.black }}>{t('trust_score')}</Text>
              <Text style={{ color: C.primary, fontSize: 18, fontFamily: Fonts.black, marginTop: 4 }}>{(currentUser as any)?.credit_score || 720}</Text>
           </View>
        </View>

        {/* Merchant Portal Entry (Only for existing merchants) */}
        {currentUser?.role === 'merchant' && (
           <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
              <TouchableOpacity onPress={() => (navigation as any).navigate('MerchantPortal')} style={{ backgroundColor: C.primary, borderRadius: Radius.xl, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, ...Shadow.md }}>
                 <Ionicons name="storefront" size={28} color={C.white} />
                 <View style={{ flex: 1 }}>
                    <Text style={{ color: C.white, fontSize: 18, fontFamily: Fonts.black }}>{t('merchant_portal')}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: Fonts.medium }}>{t('merchant_desc')}</Text>
                 </View>
                 <Ionicons name="chevron-forward" size={20} color={C.white} />
              </TouchableOpacity>
           </View>
        )}

        {/* Delivery Agent Entry — for verified citizens only */}
        {(currentUser?.role === 'citizen' || currentUser?.role === 'delivery_agent') && (
           <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={async () => {
                  const { updateUserRole } = require('../../services/profile.service');
                  if (currentUser?.role === 'delivery_agent') {
                    // Switch to Citizen app
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    setCurrentUser({ ...currentUser, role: 'citizen' });
                    await updateUserRole(currentUser.id, 'citizen');
                    showToast('Switched to Citizen Mode', 'info');
                  } else if (isAgent) {
                    // Switch to Delivery Dashboard
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    setCurrentUser({ ...currentUser, role: 'delivery_agent' });
                    await updateUserRole(currentUser.id, 'delivery_agent');
                    showToast('Switched to Delivery Mode', 'success');
                  } else {
                    (navigation as any).navigate('BecomeDeliveryAgent');
                  }
                }}
                style={{
                  backgroundColor: (currentUser?.role === 'delivery_agent' || isAgent) ? (currentUser?.role === 'delivery_agent' ? C.primaryL : '#1a3a1a') : '#0d1f2d',
                  borderRadius: Radius.xl, padding: 20,
                  flexDirection: 'row', alignItems: 'center', gap: 16,
                  borderWidth: 1.5,
                  borderColor: (currentUser?.role === 'delivery_agent' || isAgent) ? (currentUser?.role === 'delivery_agent' ? C.primary : '#68d391') : '#63b3ed',
                  ...Shadow.md
                }}
              >
                 <View style={{
                   width: 50, height: 50, borderRadius: 25,
                   backgroundColor: (currentUser?.role === 'delivery_agent' || isAgent) ? 'rgba(104,211,145,0.15)' : 'rgba(99,179,237,0.12)',
                   alignItems: 'center', justifyContent: 'center'
                 }}>
                   <Ionicons
                     name={currentUser?.role === 'delivery_agent' ? 'person-outline' : (isAgent ? 'bicycle' : 'bicycle-outline')}
                     size={26}
                     color={currentUser?.role === 'delivery_agent' ? C.primary : (isAgent ? '#68d391' : '#63b3ed')}
                   />
                 </View>
                 <View style={{ flex: 1 }}>
                    <Text style={{
                      color: currentUser?.role === 'delivery_agent' ? C.primary : (isAgent ? '#68d391' : '#63b3ed'),
                      fontSize: 16, fontFamily: Fonts.black
                    }}>
                      {currentUser?.role === 'delivery_agent' 
                        ? 'Switch to Citizen App' 
                        : (isAgent ? 'Enter Delivery Dashboard' : 'Become a Delivery Agent')}
                    </Text>
                    <Text style={{ color: '#8b949e', fontSize: 12, fontFamily: Fonts.medium, marginTop: 2 }}>
                      {currentUser?.role === 'delivery_agent'
                        ? 'Return to main superapp services'
                        : (isAgent ? 'Start receiving delivery jobs' : 'Earn 12% per delivery · Set your own schedule')}
                    </Text>
                 </View>
                 {loadingAgent ? (
                   <ActivityIndicator size="small" color={C.primary} />
                 ) : (
                   <Ionicons
                     name="repeat-outline"
                     size={20}
                     color={(currentUser?.role === 'delivery_agent' || isAgent) ? (currentUser?.role === 'delivery_agent' ? C.primary : '#68d391') : '#63b3ed'}
                   />
                 )}
              </TouchableOpacity>
           </View>
        )}


        {/* Settings List */}
        <SectionTitle title={t('acc_settings')} />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
           {[
             { icon: 'moon', label: t('dark_mode'), type: 'switch', value: isDark, onValueChange: toggleTheme },
             { icon: 'lock-closed', label: t('wallet_pin'), value: pinSet ? t('active') : t('not_set'), onPress: () => showToast(t('pin_coming'), 'info') },
             { icon: 'shield-checkmark', label: t('id_kyc'), value: kycStatus === FAYDA_STATUS.VERIFIED ? t('verified') : t('unverified'), onPress: () => showToast(kycStatus === FAYDA_STATUS.VERIFIED ? 'KYC already completed' : 'KYC completed during registration', 'info') },
             { icon: 'language', label: t('app_lang'), value: 'English', onPress: () => (navigation as any).navigate('Language') },
             { icon: 'chatbubbles', label: t('messages') || 'Messages', onPress: () => (navigation as any).navigate('ChatInbox') },
             { icon: 'help-circle', label: t('help_support'), onPress: () => showToast(t('help_coming'), 'info') },
           ].map((item: any, idx) => (
             <TouchableOpacity key={idx} onPress={item.onPress} activeOpacity={item.type === 'switch' ? 1 : 0.7} style={{ backgroundColor: C.surface, borderRadius: Radius.xl, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderColor: C.edge2 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.lift, alignItems: 'center', justifyContent: 'center' }}>
                   <Ionicons name={item.icon as any} size={20} color={C.primary} />
                </View>
                <Text style={{ flex: 1, color: C.text, fontSize: 15, fontFamily: Fonts.black }}>{item.label}</Text>
                {item.type === 'switch' ? (
                  <Switch value={item.value} onValueChange={item.onValueChange} trackColor={{ false: C.edge, true: C.primary }} thumbColor={Platform.OS === 'ios' ? '#FFF' : item.value ? C.primary : '#F4F3F4'} />
                ) : (
                  <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.bold }}>{item.value} ›</Text>
                )}
             </TouchableOpacity>
           ))}
        </View>

        <View style={{ padding: 32 }}>
           <CButton title={t('sign_out')} onPress={handleLogout} variant="danger" />
           <Text style={{ color: C.hint, textAlign: 'center', marginTop: 16, fontSize: 11, fontFamily: Fonts.medium }}>{t('build_info')}</Text>
        </View>

      </ScrollView>
    </View>
  );
}

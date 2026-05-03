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
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, Card, SectionTitle, CInput, CSelect } from '../../components';
import { fmtETB, uid } from '../../utils';
import { useTheme } from '../../hooks/useTheme';
import * as ProfileService from '../../services/profile.service';
import { useT } from '../../utils/i18n';

export default function BecomeMerchantScreen() {
  const t = useT();
  const C = useTheme();
  const navigation = useNavigation();
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [type, setType] = useState('retail');
  const [tin, setTin] = useState('');
  const [loading, setLoading] = useState(false);

  const MERCHANT_TYPES = [
    { value: 'retail', label: `🛍️ ${t('retail_label')}` },
    { value: 'restaurant', label: `🍽️ ${t('restaurant_label')}` },
    { value: 'delala', label: `🤝 ${t('delala_label')}` },
    { value: 'ekub', label: `👥 ${t('ekub_label')}` },
    { value: 'parking', label: `🅿️ ${t('parking_label')}` },
    { value: 'delivery', label: `🚚 ${t('delivery_label')}` },
  ];

  async function handleApply() {
    if (!businessName) {
      showToast(t('enter_business_name_err'), 'error');
      return;
    }
    if (!tin) {
      showToast(t('enter_tin_err'), 'error');
      return;
    }

    setLoading(true);
    try {
      const sessionUser = useAuthStore.getState().currentUser;
      if (!sessionUser || !sessionUser.id) {
        showToast(t('session_expired_err'), 'error');
        setLoading(false);
        return;
      }

      const { error: merchErr } = await ProfileService.registerMerchant(sessionUser.id, {
        business_name: businessName,
        merchant_type: type,
        tin: tin,
        details: { source: 'BecomeMerchantScreen' },
      });

      if (merchErr) {
        showToast(merchErr as any, 'error');
        setLoading(false);
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Refresh the profile to get flattened merchant fields
      const { data: updatedUser } = await ProfileService.fetchProfile(sessionUser.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }

      setLoading(false);
      setStep(3);
    } catch (e: any) {
      showToast(e.message || t('registration_failed_err'), 'error');
      setLoading(false);
    }
  }

  if (step === 3) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        <TopBar title={t('success_label')} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <View
            style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: C.primary + '15',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 32,
              borderWidth: 2,
              borderColor: C.primary + '30',
            }}
          >
            <Ionicons name="rocket" size={72} color={C.primary} />
          </View>
          <Text
            style={{
              color: C.text,
              fontSize: 32,
              fontFamily: Fonts.headline,
              textAlign: 'center',
              letterSpacing: -1,
            }}
          >
            {t('youre_a_merchant_title')}
          </Text>
          <Text
            style={{
              color: C.sub,
              fontSize: 16,
              fontFamily: Fonts.body,
              textAlign: 'center',
              marginTop: 16,
              lineHeight: 24,
            }}
          >
            {t('merchant_portal_active_msg')}
          </Text>
          <CButton
            title={t('enter_merchant_portal_btn')}
            onPress={() => {
              showToast(t('welcome_merchant_msg'), 'success');
              (navigation as any).reset({
                index: 0,
                routes: [{ name: 'MerchantRoot' }],
              });
            }}
            style={{ marginTop: 48, width: '100%', borderRadius: Radius['2xl'] }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title={t('join_merchant_network_title')} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
        <View style={{ marginBottom: 40 }}>
          <Text
            style={{ color: C.text, fontSize: 36, fontFamily: Fonts.headline, letterSpacing: -1.5 }}
          >
            {t('grow_with_citylink_title').replace(' ', '\n')}
          </Text>
          <Text
            style={{
              color: C.sub,
              fontSize: 16,
              fontFamily: Fonts.body,
              marginTop: 12,
              lineHeight: 24,
            }}
          >
            {t('merchant_reg_desc')}
          </Text>
        </View>

        {step === 1 ? (
          <>
            <View style={{ gap: 16, marginBottom: 40 }}>
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: Radius['2xl'],
                  padding: 24,
                  borderWidth: 1.5,
                  borderColor: C.edge2,
                  ...Shadow.md,
                }}
              >
                <Text style={{ color: C.primary, fontSize: 20, fontFamily: Fonts.headline }}>
                  {t('zero_fees_title')}
                </Text>
                <Text
                  style={{
                    color: C.sub,
                    fontSize: 14,
                    fontFamily: Fonts.body,
                    marginTop: 6,
                    opacity: 0.8,
                  }}
                >
                  {t('zero_fees_desc')}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: Radius['2xl'],
                  padding: 24,
                  borderWidth: 1.5,
                  borderColor: C.edge2,
                  ...Shadow.md,
                }}
              >
                <Text style={{ color: C.primary, fontSize: 20, fontFamily: Fonts.headline }}>
                  {t('instant_settlements_title')}
                </Text>
                <Text
                  style={{
                    color: C.sub,
                    fontSize: 14,
                    fontFamily: Fonts.body,
                    marginTop: 6,
                    opacity: 0.8,
                  }}
                >
                  {t('instant_settlements_desc')}
                </Text>
              </View>
            </View>
            <CButton
              title={t('start_application_btn')}
              onPress={() => setStep(2)}
              style={{ borderRadius: Radius['2xl'] }}
            />
          </>
        ) : (
          <Card style={{ padding: 24 }}>
            <CInput
              label={t('business_legal_name_label')}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder={t('business_name_placeholder')}
              iconName="business-outline"
            />
            <CSelect
              label={t('business_type_label')}
              value={type}
              onValueChange={setType}
              options={MERCHANT_TYPES}
            />
            <CInput
              label={t('tin_number_label')}
              value={tin}
              onChangeText={setTin}
              placeholder={t('tin_placeholder')}
              keyboardType="numeric"
              iconName="document-text-outline"
            />
            <View style={{ height: 1.5, backgroundColor: C.edge, marginVertical: 20 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24, alignItems: 'center' }}>
              <Ionicons name="shield-checkmark" size={16} color={C.green} />
              <Text style={{ color: C.sub, fontSize: 11, fontFamily: Fonts.medium }}>
                {t('cyber_security_compliance_msg')}
              </Text>
            </View>
            <CButton
              title={loading ? t('submitting_label') : t('apply_now_btn')}
              onPress={handleApply}
              loading={loading}
            />
            <CButton
              title={t('back_btn')}
              onPress={() => setStep(1)}
              variant="ghost"
              style={{ marginTop: 8 }}
            />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

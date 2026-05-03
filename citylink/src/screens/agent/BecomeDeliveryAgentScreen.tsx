/**
 * BecomeDeliveryAgentScreen â€” KYC Registration for Delivery Agents
 * Must be a VERIFIED citizen (Fayda KYC complete) first.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import {
  registerDeliveryAgent,
  requestLocationPermission,
  fetchAgentProfile,
} from '../../services/delivery.service';
import { t } from '../../utils/i18n';
import { VEHICLE_TYPES, SUBCITIES } from '../../config';

const { width } = Dimensions.get('window');

const T = {
  bg: '#0d1117',
  surface: '#161b22',
  surfaceHigh: '#21262d',
  border: 'rgba(99,179,237,0.15)',
  primary: '#63b3ed',
  primaryDark: '#3182ce',
  accent: '#f6e05e',
  green: '#68d391',
  text: '#e2e8f0',
  textSub: '#8b949e',
  red: '#fc8181',
  card: '#1c2128',
};

export default function BecomeDeliveryAgentScreen() {
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);

  const [vehicleType, setVehicleType] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: vehicle info, 2: location permission, 3: review

  const needsPlate = vehicleType !== 'foot';

  const handleSubmit = async () => {
    if (!currentUser?.id) {
      showToast(t('session_expired_err'), 'error');
      return;
    }
    if (!vehicleType) {
      showToast(t('vehicle_type_label'), 'error');
      return;
    }
    if (!licenseNumber || licenseNumber.trim().length < 5) {
      showToast(t('enter_tin_err'), 'error');
      return;
    }
    if (needsPlate && !plateNumber.trim()) {
      showToast(t('plate_number_label'), 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Ask for location permission
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert(t('location_access_req'), t('match_orders_radius_msg'));
        setLoading(false);
        return;
      }

      // 2. Check if agent record already exists (handles re-registration & RLS issues)
      const { data: existing } = await fetchAgentProfile(currentUser.id);

      if (!existing) {
        // 3. Register new agent record
        const { error } = await registerDeliveryAgent({
          agentId: currentUser.id,
          vehicleType: vehicleType as any, // Cast to any or specifically to VehicleType
          plateNumber: plateNumber.trim(),
          licenseNumber: licenseNumber.trim(),
        });
        if (error)
          throw new Error(typeof error === 'string' ? error : t('registration_failed_err'));
      }

      // 4. Update local state to route to delivery dashboard
      setCurrentUser({ ...currentUser, role: 'delivery_agent' });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(existing ? t('welcome_back') : t('application_review_info'), 'success');
      navigation.goBack();
    } catch (e: any) {
      showToast(e?.message || t('registration_failed_err'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <LinearGradient colors={['#0d1117', '#1a2332']} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{t('become_agent_title')}</Text>
          <Text style={s.headerSub}>{t('earn_money_agent')}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Earnings banner */}
        <LinearGradient colors={['#1a2a1a', '#1f3a1f']} style={s.earningsBanner}>
          <Ionicons name="cash-outline" size={28} color={T.green} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.earningsTitle}>{t('earn_per_delivery_msg')}</Text>
            <Text style={s.earningsSub}>{t('earn_example_msg')}</Text>
          </View>
        </LinearGradient>

        {/* Requirements */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('requirements_label')}</Text>
          {[
            { icon: 'shield-checkmark', text: `${t('verified_merchant')} (✓)`, ok: true },
            { icon: 'card-outline', text: t('valid_license_req'), ok: null },
            { icon: 'location-outline', text: t('location_access_req'), ok: null },
          ].map((r, i) => (
            <View key={i} style={s.reqRow}>
              <Ionicons name={r.icon as any} size={18} color={r.ok ? T.green : T.textSub} />
              <Text style={[s.reqText, r.ok && { color: T.green }]}>{r.text}</Text>
              {r.ok && <Ionicons name="checkmark-circle" size={18} color={T.green} />}
            </View>
          ))}
        </View>

        {/* Vehicle Type */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('vehicle_type_label')}</Text>
          <View style={s.vehicleGrid}>
            {VEHICLE_TYPES.map((v) => (
              <TouchableOpacity
                key={v.value}
                style={[s.vehicleCard, vehicleType === v.value && s.vehicleCardActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setVehicleType(v.value);
                }}
              >
                <Text style={s.vehicleEmoji}>{v.label.split(' ')[0]}</Text>
                <Text style={[s.vehicleLabel, vehicleType === v.value && { color: T.primary }]}>
                  {t(v.value + '_label')}
                </Text>
                {vehicleType === v.value && (
                  <View style={s.vehicleCheck}>
                    <Ionicons name="checkmark" size={12} color={T.bg} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* License & Plate */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('license_details_label')}</Text>

          <View style={s.inputGroup}>
            <Text style={s.label}>{t('license_id_label')} *</Text>
            <View style={s.inputWrap}>
              <Ionicons name="card-outline" size={18} color={T.textSub} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="e.g. ET-DL-2025-001234"
                placeholderTextColor={T.textSub}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {needsPlate && (
            <View style={s.inputGroup}>
              <Text style={s.label}>{t('plate_number_label')} *</Text>
              <View style={s.inputWrap}>
                <Ionicons name="car-outline" size={18} color={T.textSub} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="e.g. 3-02345 AA"
                  placeholderTextColor={T.textSub}
                  value={plateNumber}
                  onChangeText={setPlateNumber}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          )}
        </View>

        {/* Info box */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={T.primary} />
          <Text style={s.infoText}>{t('application_review_info')}</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0d1117" />
          ) : (
            <>
              <Ionicons
                name="rocket-outline"
                size={20}
                color="#0d1117"
                style={{ marginRight: 8 }}
              />
              <Text style={s.submitText}>{t('apply_now_btn')}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerCenter: { flex: 1 },
  headerTitle: { color: T.text, fontSize: 20, fontWeight: '800' },
  headerSub: { color: T.textSub, fontSize: 13, marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 20 },

  earningsBanner: {
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(104,211,145,0.2)',
  },
  earningsTitle: { color: T.green, fontSize: 16, fontWeight: '800' },
  earningsSub: { color: T.textSub, fontSize: 12, marginTop: 4, lineHeight: 18 },

  section: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
  },
  sectionTitle: { color: T.text, fontSize: 15, fontWeight: '700', marginBottom: 14 },

  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  reqText: { flex: 1, color: T.textSub, fontSize: 13 },

  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vehicleCard: {
    width: (width - 76) / 3,
    backgroundColor: T.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    position: 'relative',
  },
  vehicleCardActive: { borderColor: T.primary, backgroundColor: 'rgba(99,179,237,0.08)' },
  vehicleEmoji: { fontSize: 26, marginBottom: 6 },
  vehicleLabel: { color: T.textSub, fontSize: 11, textAlign: 'center', fontWeight: '600' },
  vehicleCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputGroup: { marginBottom: 14 },
  label: { color: T.textSub, fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surfaceHigh,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  inputIcon: { marginLeft: 12 },
  input: { flex: 1, color: T.text, padding: 12, fontSize: 14 },

  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(99,179,237,0.06)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.15)',
  },
  infoText: { flex: 1, color: T.textSub, fontSize: 12, lineHeight: 18 },

  submitBtn: {
    backgroundColor: T.primary,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { color: '#0d1117', fontSize: 16, fontWeight: '900' },
});

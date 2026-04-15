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

const MERCHANT_TYPES = [
  { value: 'retail', label: '🛍️ Retail / Shop' },
  { value: 'restaurant', label: '🍽️ Restaurant / Cafe' },
  { value: 'delala', label: '🤝 Broker / Delala' },
  { value: 'ekub', label: '👥 Ekub Organiser' },
  { value: 'parking', label: '🅿️ Parking Operator' },
  { value: 'delivery', label: '🚚 Delivery Service' },
];

export default function BecomeMerchantScreen() {
  const C = useTheme();
  const navigation = useNavigation();
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [type, setType] = useState('retail');
  const [tin, setTin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleApply() {
    if (!businessName) {
      showToast('Enter business name', 'error');
      return;
    }
    if (!tin) {
      showToast('Enter TIN number (Required by NBE)', 'error');
      return;
    }

    setLoading(true);
    setTimeout(async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const sessionUser = useAuthStore.getState().currentUser;
      if (!sessionUser) {
        showToast('Session expired, please login again', 'error');
        setLoading(false);
        return;
      }

      // Hardened User Object with proper typing
      const updatedUser = {
        ...sessionUser,
        role: 'merchant' as const,
        merchant_details: {
          business_name: businessName,
          merchant_type: type,
          tin: tin,
          status: 'PENDING',
          joined_at: new Date().toISOString(),
        }
      };
      
      setCurrentUser(updatedUser);
      setLoading(false);
      setStep(3);
    }, 2000);
  }

  if (step === 3) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        <TopBar title="Success" />
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
            style={{ color: C.text, fontSize: 32, fontFamily: Fonts.headline, textAlign: 'center', letterSpacing: -1 }}
          >
            You're a Merchant!
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
            Welcome to the CityLink economic network. Your merchant portal is now active and ready for business.
          </Text>
          <CButton
            title="Enter Merchant Portal"
            onPress={() => (navigation as any).reset({ index: 0, routes: [{ name: 'Main' }] })}
            style={{ marginTop: 48, width: '100%', borderRadius: Radius['2xl'] }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title="Join Merchant Network" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
        <View style={{ marginBottom: 40 }}>
          <Text style={{ color: C.text, fontSize: 36, fontFamily: Fonts.headline, letterSpacing: -1.5 }}>
            Grow with{"\n"}CityLink
          </Text>
          <Text style={{ color: C.sub, fontSize: 16, fontFamily: Fonts.body, marginTop: 12, lineHeight: 24 }}>
            Register your business, start receiving digital payments, and reach the entire city instantly.
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
                  0% Processing Fees
                </Text>
                <Text
                  style={{ color: C.sub, fontSize: 14, fontFamily: Fonts.body, marginTop: 6, opacity: 0.8 }}
                >
                  Pay nothing on your first 10,000 ETB in sales. We grow when you grow.
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
                  Instant Settlements
                </Text>
                <Text
                  style={{ color: C.sub, fontSize: 14, fontFamily: Fonts.body, marginTop: 6, opacity: 0.8 }}
                >
                  Funds move directly from user to your wallet instantly. No waiting periods.
                </Text>
              </View>
            </View>
            <CButton title="Start Application" onPress={() => setStep(2)} style={{ borderRadius: Radius['2xl'] }} />
          </>
        ) : (
          <Card style={{ padding: 24 }}>
            <CInput
              label="Business Legal Name"
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. Bole Coffee Shop"
              iconName="business-outline"
            />
            <CSelect
              label="Business Type"
              value={type}
              onValueChange={setType}
              options={MERCHANT_TYPES}
            />
            <CInput
              label="TIN Number"
              value={tin}
              onChangeText={setTin}
              placeholder="10 Digits"
              keyboardType="numeric"
              iconName="document-text-outline"
            />
            <View style={{ height: 1.5, backgroundColor: C.edge, marginVertical: 20 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24, alignItems: 'center' }}>
              <Ionicons name="shield-checkmark" size={16} color={C.green} />
              <Text style={{ color: C.sub, fontSize: 11, fontFamily: Fonts.medium }}>
                Encrypted under Ethiopian Cyber Security Laws.
              </Text>
            </View>
            <CButton
              title={loading ? 'Submitting...' : 'Apply Now'}
              onPress={handleApply}
              loading={loading}
            />
            <CButton
              title="Back"
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

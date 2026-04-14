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
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, Card, SectionTitle, CInput, CSelect } from '../../components';
import { fmtETB, uid } from '../../utils';

const MERCHANT_TYPES = [
  { value: 'retail', label: '🛍️ Retail / Shop' },
  { value: 'restaurant', label: '🍽️ Restaurant / Cafe' },
  { value: 'delala', label: '🤝 Broker / Delala' },
  { value: 'ekub', label: '👥 Ekub Organiser' },
  { value: 'parking', label: '🅿️ Parking Operator' },
  { value: 'delivery', label: '🚚 Delivery Service' },
];

export default function BecomeMerchantScreen() {
  const navigation = useNavigation();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);

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
      const updatedUser = {
        ...currentUser,
        role: 'merchant' as any,
        merchant_name: businessName,
        merchant_type: type,
        tin: tin,
        merchant_status: 'VERIFIED', // Instant approval for demo/MVP
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
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: C.primaryL,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Ionicons name="rocket" size={64} color={C.primary} />
          </View>
          <Text
            style={{ color: C.text, fontSize: 28, fontFamily: Fonts.black, textAlign: 'center' }}
          >
            You are a Merchant!
          </Text>
          <Text
            style={{
              color: C.sub,
              fontSize: 15,
              fontFamily: Fonts.medium,
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            Welcome to the CityLink economic network. Your portal is now active.
          </Text>
          <CButton
            title="Enter Merchant Portal"
            onPress={() => (navigation as any).reset({ index: 0, routes: [{ name: 'Main' }] })}
            style={{ marginTop: 40, width: '100%' }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title="Join Merchant Network" />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: C.text, fontSize: 32, fontFamily: Fonts.black }}>
            Grow with CityLink
          </Text>
          <Text style={{ color: C.sub, fontSize: 15, fontFamily: Fonts.medium, marginTop: 8 }}>
            Register your business, start receiving digital payments, and reach 1 million users.
          </Text>
        </View>

        {step === 1 ? (
          <>
            <View style={{ gap: 16, marginBottom: 32 }}>
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: Radius.xl,
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: C.edge2,
                  ...Shadow.sm,
                }}
              >
                <Text style={{ color: C.primary, fontSize: 18, fontFamily: Fonts.black }}>
                  0% Processing Fees
                </Text>
                <Text
                  style={{ color: C.sub, fontSize: 13, fontFamily: Fonts.medium, marginTop: 4 }}
                >
                  Pay nothing on your first 10,000 ETB in sales.
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: Radius.xl,
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: C.edge2,
                  ...Shadow.sm,
                }}
              >
                <Text style={{ color: C.primary, fontSize: 18, fontFamily: Fonts.black }}>
                  Instant Settlements
                </Text>
                <Text
                  style={{ color: C.sub, fontSize: 13, fontFamily: Fonts.medium, marginTop: 4 }}
                >
                  Funds move directly from user to your wallet instantly.
                </Text>
              </View>
            </View>
            <CButton title="Start Application" onPress={() => setStep(2)} />
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

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
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, Card, SectionTitle, CInput } from '../../components';
import { fmtETB, uid } from '../../utils';

const SCHOOLS = [
  { id: 's1', name: 'Addis International School', subcity: 'Bole', grades: 'K-12', logo: 'ðŸŽ“' },
  { id: 's2', name: 'Hill Side College', subcity: 'Yeka', grades: 'Undergrad', logo: 'ðŸ›ï¸' },
  { id: 's3', name: 'Bright Future Academy', subcity: 'Lideta', grades: 'Primary', logo: 'â˜€ï¸' },
];

export default function EducationScreen() {
  const navigation = useNavigation();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const balance = useAppStore((s) => s.balance);
  const setBalance = useAppStore((s) => s.setBalance);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const showToast = useAppStore((s) => s.showToast);

  const [selSchool, setSelSchool] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handlePayment() {
    const amt = parseFloat(amount);
    if (!selSchool) {
      showToast('Select a school', 'error');
      return;
    }
    if (!studentId) {
      showToast('Enter Student ID', 'error');
      return;
    }
    if (!amt || amt <= 0) {
      showToast('Enter valid amount', 'error');
      return;
    }
    if (balance < amt) {
      showToast('Insufficient balance', 'error');
      return;
    }

    setLoading(true);
    setTimeout(async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newBal = balance - amt;
      setBalance(newBal);
      addTransaction({
        id: uid(),
        amount: amt,
        type: 'debit',
        category: 'education',
        description: `School Fee: ${selSchool.name} (${studentId})`,
        created_at: new Date().toISOString(),
      });
      setSuccess(true);
      setLoading(false);
      showToast('School fee paid! ðŸ“š', 'success');
    }, 1500);
  }

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        <TopBar title="Success" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: C.primaryL,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Ionicons name="school" size={60} color={C.primary} />
          </View>
          <Text
            style={{ color: C.text, fontSize: 28, fontFamily: Fonts.black, textAlign: 'center' }}
          >
            Fees Paid
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
            Receipt sent to your registered email.
          </Text>
          <CButton
            title="Back to Services"
            onPress={() => navigation.goBack()}
            style={{ marginTop: 40, width: '100%' }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title="Education Fees" />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View
          style={{
            marginBottom: 24,
            padding: 20,
            backgroundColor: C.primaryL,
            borderRadius: Radius.xl,
            borderWidth: 1.5,
            borderColor: C.primaryB,
          }}
        >
          <Text
            style={{ color: C.primary, fontSize: 18, fontFamily: Fonts.black, marginBottom: 4 }}
          >
            School & College Fees ðŸ“š
          </Text>
          <Text
            style={{ color: C.textSoft, fontSize: 13, fontFamily: Fonts.medium, lineHeight: 18 }}
          >
            Pay tuition for verified Addis Ababa schools instantly from your CityLink wallet.
          </Text>
        </View>

        {!selSchool ? (
          <>
            <SectionTitle title="Select Institution" />
            {SCHOOLS.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelSchool(s);
                }}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: Radius.xl,
                  padding: 20,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                  borderWidth: 1.5,
                  borderColor: C.edge2,
                  ...Shadow.sm,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: C.lift,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{s.logo}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black }}>
                    {s.name}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
                    {s.subcity} Â· {s.grades}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={C.hint} />
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <Card style={{ padding: 20 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 32 }}>{selSchool.logo}</Text>
                <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
                  {selSchool.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelSchool(null)}>
                <Text style={{ color: C.primary, fontFamily: Fonts.bold }}>Change</Text>
              </TouchableOpacity>
            </View>

            <CInput
              label="Student ID / Admission No."
              value={studentId}
              onChangeText={setStudentId}
              placeholder="e.g. AIS-2024-001"
              iconName="person-outline"
            />
            <CInput
              label="Amount (ETB)"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              iconName="cash-outline"
            />

            <CButton
              title={loading ? 'Processing...' : 'Pay Tuition'}
              onPress={handlePayment}
              loading={loading}
              style={{ marginTop: 24 }}
            />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

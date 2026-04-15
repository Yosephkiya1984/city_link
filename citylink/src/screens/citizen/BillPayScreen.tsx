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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

type BillPayRouteProp = RouteProp<{ params: { type?: 'Electric' | 'Water' | 'WiFi' | 'Telecom' | 'Traffic' } }, 'params'>;
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useAuthStore } from '../../store/AuthStore';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, Card, SectionTitle, CInput } from '../../components';
import { fmtETB, uid } from '../../utils';
import { payUtilityBill, payTrafficFine } from '../../services/payment.service';

export default function BillPayScreen() {
  const navigation = useNavigation();
  const route = useRoute<BillPayRouteProp>();
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const currentUser = useAuthStore((s) => s.currentUser);
  const balance = useWalletStore((s) => s.balance);
  const setBalance = useWalletStore((s) => s.setBalance);
  const addTransaction = useWalletStore((s) => s.addTransaction);
  const showToast = useSystemStore((s) => s.showToast);

  const [type] = useState(route.params?.type || 'Electric');
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handlePay() {
    const amt = parseFloat(amount);
    if (!currentUser) {
      showToast('Sign in to pay bills', 'error');
      return;
    }
    if (!account) {
      showToast('Enter customer/account/notice number', 'error');
      return;
    }
    if (type !== 'Traffic' && (!amt || amt <= 0)) {
      showToast('Enter valid amount', 'error');
      return;
    }
    if (balance < amt) {
      showToast('Insufficient balance', 'error');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (type === 'Traffic') {
        // notice_number is the account field for Traffic
        // In a real app we'd fetch the fine_id first, here we simulate passing the 'account' as ID or retrieving it.
        // For hardening demonstration, we'll assume 'account' is the notice_id or we pass it to the RPC.
        res = await payTrafficFine(currentUser.id, account);
      } else {
        const mockBillId = uid();
        res = await payUtilityBill(mockBillId, currentUser.id);
      }

      if (res.error) {
        showToast(res.error, 'error');
        setLoading(false);
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (res.data?.new_balance !== undefined) {
        setBalance(res.data.new_balance);
      } else {
        setBalance(balance - amt);
      }

      setSuccess(true);
      showToast('Payment successful! âœ…', 'success');
    } catch (e) {
      console.error('Payment Error:', e);
      showToast('Payment failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const billIcons = {
    Electric: 'flash',
    Water: 'water',
    WiFi: 'wifi',
    Telecom: 'phone-portrait',
    Traffic: 'car-outline',
  };
  const billColors = {
    Electric: '#FFCC00',
    Water: '#007AFF',
    WiFi: '#5856D6',
    Telecom: '#34C759',
    Traffic: '#FF3B30',
  };

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
              backgroundColor: C.greenL,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Ionicons name="checkmark-circle" size={64} color={C.green} />
          </View>
          <Text style={{ color: C.text, fontSize: 28, fontFamily: Fonts.black }}>
            Payment Complete
          </Text>
          <Text
            style={{
              color: C.sub,
              fontSize: 16,
              fontFamily: Fonts.medium,
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            Your {type} bill of {fmtETB(parseFloat(amount))} ETB was paid successfully.
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
      <TopBar title={`${type} Bill`} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ marginBottom: 30, alignItems: 'center' }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              backgroundColor: C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: C.edge2,
              ...Shadow.sm,
            }}
          >
            <Ionicons
              name={(billIcons[type] || 'receipt') as any}
              size={40}
              color={billColors[type] || C.primary}
            />
          </View>
          <Text style={{ color: C.text, fontSize: 24, fontFamily: Fonts.black, marginTop: 16 }}>
            Pay {type} Bill
          </Text>
          <Text style={{ color: C.sub, fontSize: 13, fontFamily: Fonts.medium, marginTop: 4 }}>
            Fast, secure city utility payments
          </Text>
        </View>

        <Card style={{ padding: 20, marginBottom: 24, ...Shadow.sm }}>
          <CInput
            label={type === 'Water' ? 'Customer Number' : 'Account / Meter Number'}
            value={account}
            onChangeText={setAccount}
            placeholder="e.g. 123456789"
            iconName="list"
          />
          <CInput
            label="Amount (ETB)"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="numeric"
            iconName="cash-outline"
          />

          <View
            style={{
              marginTop: 20,
              padding: 16,
              backgroundColor: C.lift,
              borderRadius: Radius.xl,
              borderStyle: 'dashed',
              borderWidth: 1,
              borderColor: C.edge,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.sub, fontSize: 13, fontFamily: Fonts.medium }}>
                Convenience Fee
              </Text>
              <Text style={{ color: C.green, fontSize: 13, fontFamily: Fonts.bold }}>FREE</Text>
            </View>
            <View style={{ height: 1, backgroundColor: C.edge, marginVertical: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.sub, fontSize: 13, fontFamily: Fonts.bold }}>
                Total to Pay
              </Text>
              <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
                {amount ? fmtETB(parseFloat(amount)) : '0.00 ETB'}
              </Text>
            </View>
          </View>
        </Card>

        <CButton
          title={loading ? 'Processing...' : 'Pay Bill'}
          onPress={handlePay}
          loading={loading}
        />

        <View style={{ marginTop: 40, opacity: 0.6 }}>
          <Text
            style={{
              color: C.hint,
              fontSize: 11,
              fontFamily: Fonts.black,
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            Verified Service Providers
          </Text>
          <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
            <Text style={{ color: C.sub, fontSize: 14, fontFamily: Fonts.bold }}>EEP</Text>
            <Text style={{ color: C.sub, fontSize: 14, fontFamily: Fonts.bold }}>AAWSA</Text>
            <Text style={{ color: C.sub, fontSize: 14, fontFamily: Fonts.bold }}>
              Ethio Telecom
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

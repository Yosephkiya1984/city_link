import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import TopBar from '../../components/TopBar';
import { useAuthStore } from '../../store/AuthStore';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { Colors, DarkColors, Radius, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, CInput } from '../../components';
import { fmtETB, uid, normalizePhone } from '../../utils';
import { t } from '../../utils/i18n';
import { P2P_PIN_THRESHOLD_ETB } from '../../config';
import { queueP2PTransfer } from '../../services/wallet.service';
import { hasWalletPin, verifyWalletPin } from '../../services/walletPin';

function useTheme() {
  const isDark = useSystemStore((s) => s.isDark);
  return isDark ? DarkColors : Colors;
}

// Removed mocks

export default function SendMoneyScreen() {
  const C = useTheme();
  const navigation = useNavigation();
  const balance = useWalletStore((s) => s.balance);
  const setBalance = useWalletStore((s) => s.setBalance);
  const addTransaction = useWalletStore((s) => s.addTransaction);
  const showToast = useSystemStore((s) => s.showToast);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [pinValue, setPinValue] = useState('');

  async function handleSend() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      showToast('Enter valid amount', 'error');
      return;
    }
    if (balance < amt) {
      showToast('Insufficient balance', 'error');
      return;
    }
    if (phone.length < 9) {
      showToast('Enter valid phone', 'error');
      return;
    }

    if (amt >= P2P_PIN_THRESHOLD_ETB) {
      if (!currentUser?.id) {
        showToast('Authentication error', 'error');
        return;
      }
      const hasPinSet = await hasWalletPin(currentUser.id);
      if (!hasPinSet) {
        showToast('Please set up wallet PIN first for transfers â‰¥ 5,000 ETB', 'error');
        return;
      }
      setPinModal(true);
      return;
    }

    processTransfer(amt);
  }

  async function processTransfer(amt: number) {
    if (!currentUser) return;
    if (!currentUser.id) {
      showToast('User ID missing', 'error');
      return;
    }
    setLoading(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      console.log('🔧 Sending P2P to normalized phone:', normalizedPhone);

      const res = await queueP2PTransfer({
        senderId: currentUser.id,
        recipientPhone: normalizedPhone,
        amount: amt,
        note: '',
      });

      if (!res.ok) {
        throw new Error(res.error || 'Transfer failed');
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Update local state ONLY on success
      if (res.newBalance !== undefined) {
        setBalance(res.newBalance);
      } else {
        setBalance(balance - amt);
      }

      addTransaction({
        id: uid(),
        wallet_id: `${currentUser.id}-wallet`,
        amount: amt,
        type: 'debit',
        category: 'transfer',
        description: `Sent to ${phone}`,
        status: (res.status === 'completed' ? 'completed' : 'pending') as
          | 'pending'
          | 'completed'
          | 'failed',
        created_at: new Date().toISOString(),
      });

      const successStatus = res.status === 'completed' ? 'Completed' : 'Pending';
      showToast(`Transfer ${successStatus}: ${fmtETB(amt, 0)} to ${phone}`, 'success');
      navigation.goBack();
    } catch (error: any) {
      console.error('P2P Transfer Error:', error);
      const msg =
        error.message === 'recipient_not_found'
          ? 'Recipient not registered'
          : error.message === 'insufficient_funds'
            ? 'Insufficient balance'
            : 'Transfer failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handlePinVerification() {
    if (!pinValue || pinValue.length !== 6) {
      showToast('Please enter 6-digit PIN', 'error');
      return;
    }

    setLoading(true);
    try {
      if (!currentUser?.id) {
        showToast('Authentication error', 'error');
        setLoading(false);
        return;
      }
      const isValid = await verifyWalletPin(currentUser.id, pinValue);
      if (isValid) {
        const amt = parseFloat(amount);
        setPinModal(false);
        setPinValue('');
        await processTransfer(amt);
      } else {
        showToast('Invalid PIN. Please try again.', 'error');
        setLoading(false);
      }
    } catch (error) {
      showToast('PIN verification failed', 'error');
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title={t('send_money')} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <LinearGradient
          colors={[C.primary, C.primaryD]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            marginBottom: 32,
            padding: 28,
            borderRadius: Radius['3xl'],
            alignItems: 'center',
            ...Shadow.lg,
          }}
        >
          <Text
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13,
              fontFamily: Fonts.label,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {t('avail_bal')}
          </Text>
          <Text style={{ color: C.white, fontSize: 42, fontFamily: Fonts.headline, marginTop: 8 }}>
            {fmtETB(balance, 0)}
          </Text>
          <View
            style={{
              marginTop: 12,
              paddingHorizontal: 12,
              paddingVertical: 4,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: Radius.full,
            }}
          >
            <Text style={{ color: C.white, fontSize: 11, fontFamily: Fonts.label }}>
              Daily limit: 150,000 ETB
            </Text>
          </View>
        </LinearGradient>

        <View
          style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: 'rgba(245,184,0,0.1)',
            borderRadius: Radius.xl,
            borderWidth: 1.5,
            borderColor: 'rgba(245,184,0,0.2)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="shield-checkmark" size={18} color={C.amber} />
            <Text style={{ color: C.amber, fontSize: 13, fontFamily: Fonts.label }}>
              PIN required for transfers â‰¥ {fmtETB(P2P_PIN_THRESHOLD_ETB, 0)}
            </Text>
          </View>
        </View>

        <CInput
          label={t('recipient_phone')}
          value={phone}
          onChangeText={setPhone}
          placeholder="0911 22 33 44"
          keyboardType="phone-pad"
          iconName="person-outline"
        />
        <CInput
          label={t('amount_etb')}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="numeric"
          iconName="cash-outline"
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {[100, 500, 1000, 2000, 5000, 10000].map((a) => (
            <TouchableOpacity
              key={a}
              onPress={() => setAmount(String(a))}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: Radius.lg,
                backgroundColor: amount === String(a) ? C.primary : C.surface,
                borderWidth: 1.5,
                borderColor: amount === String(a) ? C.primary : C.edge2,
              }}
            >
              <Text
                style={{
                  color: amount === String(a) ? C.white : C.sub,
                  fontSize: 12,
                  fontFamily: Fonts.bold,
                }}
              >
                {a >= 1000 ? `${a / 1000}K` : a} ETB
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 24 }}>
          <CButton
            title={loading ? t('sending') : t('confirm_transfer')}
            onPress={handleSend}
            loading={loading}
          />
        </View>
      </ScrollView>

      <Modal visible={pinModal} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            padding: 24,
          }}
          onPress={() => {
            setPinModal(false);
            setPinValue('');
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              borderWidth: 1,
              borderColor: C.edge,
              padding: 20,
            }}
          >
            <Text
              style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800', marginBottom: 8 }}
            >
              Enter Wallet PIN
            </Text>
            <TextInput
              value={pinValue}
              onChangeText={setPinValue}
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢"
              placeholderTextColor={C.sub}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              style={{
                backgroundColor: C.lift,
                borderWidth: 1,
                borderColor: C.edge2,
                borderRadius: Radius.lg,
                color: C.text,
                fontSize: FontSize['2xl'],
                fontWeight: '800',
                letterSpacing: 8,
                paddingHorizontal: 14,
                paddingVertical: 14,
                textAlign: 'center',
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <CButton
                title="Cancel"
                variant="ghost"
                style={{ flex: 1 }}
                onPress={() => {
                  setPinModal(false);
                  setPinValue('');
                }}
              />
              <CButton
                title="Confirm"
                style={{ flex: 1 }}
                onPress={handlePinVerification}
                loading={loading}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

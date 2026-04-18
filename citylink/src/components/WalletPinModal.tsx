import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Fonts } from '../theme';

interface WalletPinModalProps {
  isVisible: boolean;
  onClose: () => void;
  onVerify: (pin: string) => Promise<void>;
  isVerifying: boolean;
  error?: string;
  C: any;
}

export const WalletPinModal = ({
  isVisible,
  onClose,
  onVerify,
  isVerifying,
  error,
  C,
}: WalletPinModalProps) => {
  const [pin, setPin] = useState('');

  const handleSubmit = () => {
    if (pin.length < 4) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onVerify(pin);
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.content, { backgroundColor: C.surface, borderColor: C.edge }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={C.sub} />
          </TouchableOpacity>

          <View style={[styles.iconBox, { backgroundColor: C.primary + '15' }]}>
            <Ionicons name="lock-closed" size={32} color={C.primary} />
          </View>

          <Text style={[styles.title, { color: C.text }]}>Enter Wallet PIN</Text>
          <Text style={[styles.sub, { color: C.sub }]}>
            Biometrics failed or unavailable. Please enter your 4-6 digit Wallet PIN to reveal the
            Delivery PIN.
          </Text>

          <TextInput
            style={[
              styles.input,
              { color: C.text, borderColor: error ? '#E8312A' : C.edge, backgroundColor: C.ink },
            ]}
            value={pin}
            onChangeText={setPin}
            keyboardType="numeric"
            maxLength={6}
            secureTextEntry
            autoFocus
            placeholder="••••••"
            placeholderTextColor={C.sub + '80'}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: pin.length >= 4 ? C.primary : C.sub + '40' }]}
            onPress={handleSubmit}
            disabled={pin.length < 4 || isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.btnText}>Verify PIN</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    marginBottom: 8,
  },
  sub: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    width: '100%',
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontFamily: Fonts.bold,
    marginBottom: 12,
  },
  errorText: {
    color: '#E8312A',
    fontFamily: Fonts.medium,
    fontSize: 12,
    marginBottom: 16,
  },
  btn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#000',
  },
});

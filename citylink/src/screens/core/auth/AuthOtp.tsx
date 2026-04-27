import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../../../theme';
import { CButton, CInput } from '../../../components';

export const AuthOtp = ({
  C,
  fadeAnim,
  slideAnim,
  phone,
  otp,
  setOtp,
  loading,
  error,
  devOtp,
  onBack,
  onVerify,
  onResend,
}: any) => {
  return (
    <Animated.View
      style={[styles.screen, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={C.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: C.text }]}>Security Check</Text>
      <Text style={[styles.subtitle, { color: C.sub }]}>
        Enter the secure code sent to {phone}
      </Text>

      <View style={styles.form}>
        <CInput
          label="Verification Code"
          value={otp}
          onChangeText={setOtp}
          placeholder="00000000"
          iconName="key-outline"
          keyboardType="number-pad"
          maxLength={8}
        />

        {__DEV__ && devOtp ? (
          <View style={[styles.devHint, { backgroundColor: C.surface, borderColor: C.primary }]}>
            <Text style={[styles.devHintText, { color: C.primary }]}>
              [Dev Mode] Code: {devOtp}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: 'rgba(255,100,100,0.1)' }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <CButton
          title={loading ? '' : 'Verify & Continue'}
          onPress={onVerify}
          loading={loading}
          disabled={loading}
          style={{ marginTop: 16 }}
        />

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={onResend}
          disabled={!onResend || loading}
        >
          <Text style={[styles.resendText, { color: !onResend || loading ? C.edge : C.primary }]}>
            Didn't receive code? Resend
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    marginBottom: 32,
  },
  form: {
    gap: 20,
  },
  devHint: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  devHintText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: 8,
  },
  resendText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
});

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../../../theme';
import { CButton, CInput } from '../../../components';

export const AuthLogin = ({
  C,
  fadeAnim,
  slideAnim,
  phone,
  setPhone,
  badgeId,
  setBadgeId,
  secPin,
  setSecPin,
  authMode,
  loading,
  error,
  onBack,
  onSendOtp,
}: any) => {
  return (
    <Animated.View
      style={[styles.screen, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <TouchableOpacity
        style={[styles.backButton, { borderColor: C.edge }]}
        onPress={onBack}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        accessibilityHint="Navigates back to the welcome screen"
      >
        <Ionicons name="chevron-back" size={24} color={C.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: C.text }]}>
        {authMode === 'gov' ? 'Government Access' : 'Welcome Back'}
      </Text>
      <Text style={[styles.subtitle, { color: C.sub }]}>
        {authMode === 'gov'
          ? 'Enter your badge details and secure PIN'
          : 'Sign in with your phone number to continue'}
      </Text>

      <View style={styles.form}>
        <CInput
          label="Phone or Email"
          value={phone}
          onChangeText={setPhone}
          placeholder="+251 9XX... or test@gmail.com"
          iconName="person-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {authMode === 'gov' && (
          <>
            <CInput
              label="Badge ID"
              value={badgeId}
              onChangeText={setBadgeId}
              placeholder="ST-123456"
              iconName="id-card-outline"
            />
            <CInput
              label="Security PIN"
              value={secPin}
              onChangeText={setSecPin}
              placeholder="****"
              iconName="lock-closed-outline"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
            />
          </>
        )}

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: 'rgba(255,100,100,0.1)' }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <CButton
          title={authMode === 'gov' ? 'Authorize' : 'Verify Phone'}
          onPress={onSendOtp}
          loading={loading}
          disabled={loading}
          style={{ marginTop: 16 }}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 32,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 16,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  title: {
    fontSize: 34,
    fontFamily: Fonts.headline,
    letterSpacing: -1,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.body,
    lineHeight: 24,
    marginBottom: 40,
  },
  form: {
    gap: 24,
  },
  errorBox: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8312A30',
  },
  errorText: {
    color: '#E8312A',
    fontSize: 14,
    fontFamily: Fonts.label,
    textAlign: 'center',
  },
});

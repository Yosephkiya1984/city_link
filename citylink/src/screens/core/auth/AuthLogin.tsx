import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, ActivityIndicator } from 'react-native';
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
  onSendOtp 
}: any) => {
  return (
    <Animated.View style={[styles.screen, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={onBack}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        accessibilityHint="Navigates back to the welcome screen"
      >
        <Ionicons name="arrow-back" size={24} color={C.text} />
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
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          placeholder="+251 9XX XXX XXX"
          iconName="call-outline"
          keyboardType="phone-pad"
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
          title={authMode === 'gov' ? "Authorize" : "Verify Phone"}
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
});

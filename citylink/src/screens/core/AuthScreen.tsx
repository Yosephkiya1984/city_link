import React, { useRef } from 'react';
import { View, StyleSheet, Animated, Easing, KeyboardAvoidingView, Platform } from 'react-native';
import { useSystemStore } from '../../store/SystemStore';
import { Colors, DarkColors } from '../../theme';
import { AuthWelcome } from './auth/AuthWelcome';
import { AuthLogin } from './auth/AuthLogin';
import { AuthRegister } from './auth/AuthRegister';
import { AuthOtp } from './auth/AuthOtp';
import { useAuthFlow, AuthFlow } from '../../hooks/useAuthFlow';

export default function AuthScreen() {
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;

  const auth = useAuthFlow();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const transitionTo = (newFlow: AuthFlow) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
    ]).start(() => {
      auth.setFlow(newFlow);
      auth.setError(null);
      slideAnim.setValue(-20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1)),
        }),
      ]).start();
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.ink }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {auth.flow === 'welcome' && (
          <AuthWelcome
            C={C}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            onLogin={() => {
              auth.setAuthMode('citizen');
              transitionTo('login');
            }}
            onRegister={() => {
              auth.setRegistrationIntent(true);
              auth.setAuthMode('citizen');
              transitionTo('login');
            }}
            onGov={() => {
              auth.setAuthMode('gov');
              transitionTo('login');
            }}
          />
        )}
        {auth.flow === 'login' && (
          <AuthLogin
            C={C}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            authMode={auth.authMode}
            loading={auth.loading}
            error={auth.error}
            phone={auth.phone}
            setPhone={auth.setPhone}
            badgeId={auth.badgeId}
            setBadgeId={auth.setBadgeId}
            secPin={auth.secPin}
            setSecPin={auth.setSecPin}
            onBack={() => transitionTo('welcome')}
            onSendOtp={auth.authMode === 'gov' ? auth.handleGovLogin : auth.handleSendOtp}
          />
        )}
        {auth.flow === 'otp' && (
          <AuthOtp
            C={C}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            otp={auth.otp}
            setOtp={auth.setOtp}
            loading={auth.loading}
            error={auth.error}
            devOtp={null}
            onBack={() => transitionTo('login')}
            onVerify={auth.handleVerifyOtp}
            onResend={auth.handleSendOtp}
          />
        )}
        {auth.flow === 'register' && (
          <AuthRegister
            C={C}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            loading={auth.loading}
            error={auth.error}
            userType={auth.userType}
            setUserType={auth.setUserType}
            fullName={auth.fullName}
            setFullName={auth.setFullName}
            phone={auth.phone}
            setPhone={auth.setPhone}
            merchantType={auth.merchantType}
            setMerchantType={auth.setMerchantType}
            businessName={auth.businessName}
            setBusinessName={auth.setBusinessName}
            tin={auth.tin}
            setTin={auth.setTin}
            licenseNo={auth.licenseNo}
            setLicenseNo={auth.setLicenseNo}
            subcity={auth.subcity}
            setSubcity={auth.setSubcity}
            businessAddress={auth.businessAddress}
            setBusinessAddress={auth.setBusinessAddress}
            onBack={() => transitionTo('welcome')}
            onRegister={auth.handleRegister}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
});

import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSystemStore } from '../../store/SystemStore';
import { Colors, DarkColors } from '../../theme';
import { AuthWelcome } from './auth/AuthWelcome';
import { AuthLogin } from './auth/AuthLogin';
import { AuthRegister } from './auth/AuthRegister';
import { AuthOtp } from './auth/AuthOtp';
import { useAuthFlow, AuthFlow } from '../../hooks/useAuthFlow';
import { DEV_BYPASS_ACCOUNTS } from '../../config';
import { normalizePhone } from '../../utils';
import { useT } from '../../utils/i18n';

export default function AuthScreen() {
  const isDark = useSystemStore((s) => s.isDark);
  const lang = useSystemStore((s) => s.lang);
  const setLang = useSystemStore((s) => s.setLang);
  const t = useT();
  const insets = useSafeAreaInsets();
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
      style={[styles.container, { backgroundColor: auth.flow === 'welcome' ? '#000' : C.ink }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Floating Language Selector */}
        <View style={[styles.langSelector, { top: Math.max(insets.top, 16) }]}>
          {[
            { code: 'en', label: 'EN' },
            { code: 'am', label: 'አማ' },
            { code: 'om', label: 'ORM' },
          ].map((l) => (
            <TouchableOpacity
              key={l.code}
              onPress={() => setLang(l.code)}
              style={[
                styles.langPill,
                lang === l.code && styles.langPillActive,
                { borderColor: lang === l.code ? C.primary : 'rgba(255,255,255,0.1)' },
              ]}
            >
              <Text
                style={[
                  styles.langText,
                  lang === l.code && { color: C.primary, fontWeight: '800' },
                ]}
              >
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {auth.flow === 'welcome' ? (
          <AuthWelcome
            C={C}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            t={t}
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
        ) : (
          <View style={{ paddingTop: Platform.OS === 'ios' ? 60 : 40, flex: 1 }}>
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
                t={t}
              />
            )}
            {auth.flow === 'otp' && (
              <AuthOtp
                C={C}
                fadeAnim={fadeAnim}
                slideAnim={slideAnim}
                phone={auth.phone}
                otp={auth.otp}
                setOtp={auth.setOtp}
                loading={auth.loading}
                error={auth.error}
                devOtp={
                  __DEV__ && DEV_BYPASS_ACCOUNTS[normalizePhone(auth.phone)] ? '123456' : null
                }
                onBack={() => transitionTo('login')}
                onVerify={auth.handleVerifyOtp}
                onResend={auth.handleSendOtp}
                t={t}
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
                onFaydaVerify={auth.handleFaydaVerify}
                t={t}
              />
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  langSelector: {
    position: 'absolute',
    right: 20,
    zIndex: 1000,
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPillActive: {
    backgroundColor: 'rgba(34, 201, 122, 0.1)',
  },
  langText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
});

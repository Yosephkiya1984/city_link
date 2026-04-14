import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, KeyboardAvoidingView, Platform } from 'react-native';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors } from '../../theme';
import * as AuthService from '../../services/auth.service';
import * as ProfileService from '../../services/profile.service';
import * as WalletService from '../../services/wallet.service';
import { AuthWelcome } from './auth/AuthWelcome';
import { AuthLogin } from './auth/AuthLogin';
import { AuthRegister } from './auth/AuthRegister';
import { AuthOtp } from './auth/AuthOtp';

type AuthFlow = 'welcome' | 'login' | 'register' | 'otp' | 'success';
type AuthMode = 'citizen' | 'merchant' | 'gov';

export default function AuthScreen() {
  const isDark = useAppStore((s) => s.isDark);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const C = isDark ? DarkColors : Colors;

  // Flow State
  const [flow, setFlow] = useState<AuthFlow>('welcome');
  const [authMode, setAuthMode] = useState<AuthMode>('citizen');
  
  // Form State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<'citizen' | 'merchant'>('citizen');
  
  // Merchant specific
  const [merchantType, setMerchantType] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [tin, setTin] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [subcity, setSubcity] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  // Gov specific
  const [badgeId, setBadgeId] = useState('');
  const [secPin, setSecPin] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [tempUserId, setTempUserId] = useState<string | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const transitionTo = (newFlow: AuthFlow) => {
    // Exit animation
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
      setFlow(newFlow);
      setError(null);
      
      // Reset slide for entry
      slideAnim.setValue(-20);
      
      // Entry animation
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

  // Handlers
  const handleSendOtp = async () => {
    if (!phone) {
      setError('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    setError(null);
    setDevOtp(null);
    try {
      const { error: otpErr, devOtp: simulatedOtp } = await AuthService.sendOtp(phone);
      if (otpErr) {
        setError(otpErr);
      } else {
        if (simulatedOtp) setDevOtp(simulatedOtp);
        transitionTo('otp');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { user, error: verifyErr } = (await AuthService.verifyOtp(phone, otp)) as any;
      if (verifyErr) {
        setError(verifyErr);
      } else if (user) {
        setTempUserId(user.id);
        // If user is new (mock logic: no full_name means profile missing)
        const profile = await ProfileService.fetchProfile(user.id);
        if (!profile.data || !profile.data.full_name) {
          transitionTo('register');
        } else {
          setCurrentUser(profile.data as any);
        }
      }
    } catch (e: any) {
      setError(e.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGovLogin = async () => {
    if (!badgeId || !secPin) {
      setError('Badge ID and PIN are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { user, error: loginErr } = (await AuthService.govBadgeLogin(badgeId, secPin)) as any;
      if (loginErr) {
        setError(loginErr);
      } else if (user) {
        setCurrentUser(user as any);
      }
    } catch (e: any) {
      setError(e.message || 'Government login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !phone) {
      setError('Name and Phone are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const targetId = tempUserId || phone;
      
      const profileData = {
        id: targetId,
        phone,
        full_name: fullName,
        role: userType,
        kyc_status: 'PENDING',
        merchant_details: userType === 'merchant' ? {
          business_name: businessName,
          merchant_type: merchantType,
          tin,
          license_no: licenseNo,
          subcity,
          address: businessAddress
        } : null,
        business_name: businessName,
        tin: tin,
        subcity: subcity,
        license_no: licenseNo
      };

      // 1. Persist to Database
      const { error: upsertErr } = await ProfileService.upsertProfile(profileData);
      if (upsertErr) throw new Error(upsertErr);

      // 2. Initialize Financial Services
      await WalletService.ensureWallet(targetId);
      await WalletService.claimWelcomeBonus(targetId);

      // 3. Final Fetch to ensure clean state
      const finalProfile = await ProfileService.fetchProfile(targetId);
      if (finalProfile.data) {
        setCurrentUser(finalProfile.data as any);
      } else {
        throw new Error('Profile persistence verification failed');
      }
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: C.ink }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {flow === 'welcome' && (
          <AuthWelcome 
            C={C}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            onLogin={() => { setAuthMode('citizen'); transitionTo('login'); }}
            onRegister={() => { transitionTo('register'); }}
            onGov={() => { setAuthMode('gov'); transitionTo('login'); }}
          />
        )}

        {flow === 'login' && (
          <AuthLogin 
            C={C}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            phone={phone}
            setPhone={setPhone}
            badgeId={badgeId}
            setBadgeId={setBadgeId}
            secPin={secPin}
            setSecPin={setSecPin}
            authMode={authMode}
            loading={loading}
            error={error}
            onBack={() => transitionTo('welcome')}
            onSendOtp={authMode === 'gov' ? handleGovLogin : handleSendOtp}
          />
        )}

        {flow === 'otp' && (
          <AuthOtp
            C={C}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            otp={otp}
            setOtp={setOtp}
            loading={loading}
            error={error}
            devOtp={devOtp}
            onBack={() => transitionTo('login')}
            onVerify={handleVerifyOtp}
            onResend={handleSendOtp}
          />
        )}

        {flow === 'register' && (
          <AuthRegister
            C={C}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            userType={userType}
            setUserType={setUserType}
            fullName={fullName}
            setFullName={setFullName}
            phone={phone}
            setPhone={setPhone}
            merchantType={merchantType}
            setMerchantType={setMerchantType}
            businessName={businessName}
            setBusinessName={setBusinessName}
            tin={tin}
            setTin={setTin}
            licenseNo={licenseNo}
            setLicenseNo={setLicenseNo}
            subcity={subcity}
            setSubcity={setSubcity}
            businessAddress={businessAddress}
            setBusinessAddress={setBusinessAddress}
            loading={loading}
            error={error}
            onBack={() => transitionTo('welcome')}
            onRegister={handleRegister}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
});
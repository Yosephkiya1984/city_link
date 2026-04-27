import React, { useState, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { useWalletStore } from '../../store/WalletStore';
import { Colors, DarkColors } from '../../theme';
import { KycFayda } from '../core/auth/KycFayda';
import { KycService } from '../../services/kyc.service';

export default function FaydaKycScreen({ navigation }: any) {
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const currentUser = useAuthStore((s) => s.currentUser);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);

  // KYC Flow State
  const [kycStep, setKycStep] = useState(1);
  const [faydaFIN, setFaydaFIN] = useState('');
  const [faydaOTP, setFaydaOTP] = useState('');
  const [biometricSimulated, setBiometricSimulated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleKycComplete = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await KycService.completeKyc(currentUser.id, faydaFIN, faydaOTP);
      if (res.success && res.data) {
        await setCurrentUser(res.data);
        navigation.goBack();
      } else {
        setError(res.error || 'Failed to complete KYC');
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.ink }]}>
      <KycFayda
        C={C}
        fadeAnim={fadeAnim}
        slideAnim={slideAnim}
        kycStep={kycStep}
        faydaFIN={faydaFIN}
        setFaydaFIN={setFaydaFIN}
        faydaOTP={faydaOTP}
        setFaydaOTP={setFaydaOTP}
        biometricSimulated={biometricSimulated}
        setBiometricSimulated={setBiometricSimulated}
        loading={loading}
        error={error}
        onBack={() => {
          if (kycStep === 1) navigation.goBack();
          else setKycStep(kycStep - 1);
        }}
        onFINSubmit={async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await KycService.verifyFin(faydaFIN);
            if (res.success) setKycStep(2);
            else setError(res.error || 'Invalid FIN');
          } catch (e: any) {
            setError(e?.message || 'Unable to verify Fayda ID. Please try again.');
          } finally {
            setLoading(false);
          }
        }}
        onOTPSubmit={async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await KycService.verifyFaydaOtp(faydaOTP);
            if (res.success) setKycStep(3);
            else setError(res.error || 'Invalid OTP');
          } catch (e: any) {
            setError(e?.message || 'Unable to verify OTP. Please try again.');
          } finally {
            setLoading(false);
          }
        }}
        onScan={() => setBiometricSimulated(true)}
        onBiometricProceed={() => setKycStep(4)}
        onComplete={handleKycComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

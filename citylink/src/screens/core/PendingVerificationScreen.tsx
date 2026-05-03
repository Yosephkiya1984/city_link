import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { useWalletStore } from '../../store/WalletStore';
import { Colors, DarkColors, Fonts } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { KycFayda } from './auth/KycFayda';
import { KycService } from '../../services/kyc.service';
import { useT } from '../../utils/i18n';

export default function PendingVerificationScreen({ navigation }: any) {
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const resetAuth = useAuthStore((s) => s.reset);
  const resetWallet = useWalletStore((s) => s.reset);
  const resetSystem = useSystemStore((s) => s.reset);
  const currentUser = useAuthStore((s) => s.currentUser);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const t = useT();

  // KYC Flow State
  const [showKyc, setShowKyc] = useState(false);
  const [kycStep, setKycStep] = useState(1);
  const [faydaFIN, setFaydaFIN] = useState('');
  const [faydaOTP, setFaydaOTP] = useState('');
  const [biometricSimulated, setBiometricSimulated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animations for sub-flow
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleSignOut = () => {
    resetAuth();
    resetWallet();
    resetSystem();
  };

  const handleKycComplete = async () => {
    if (!currentUser?.id) {
      const message = 'Cannot complete KYC: missing current user ID.';
      console.error('[KYC] ' + message);
      setError(message);
      return;
    }

    console.log('[KYC] Finishing verification flow');
    setLoading(true);
    setError(null);
    try {
      const res = await KycService.completeKyc(currentUser.id, faydaFIN, faydaOTP);
      if (res.success && res.data) {
        console.log('[KYC] DB updated successfully. User is now:', res.data.kyc_status);
        await setCurrentUser(res.data);
        // Navigate away by clearing local state
        setShowKyc(false);
      } else {
        console.error('[KYC] DB update failed:', res.error);
        setError(res.error || 'Failed to complete KYC');
      }
    } catch (e: any) {
      console.error('[KYC] Unexpected error:', e);
      setError(e.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (showKyc) {
    return (
      <View style={[styles.container, { backgroundColor: C.ink, padding: 0 }]}>
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
            if (kycStep === 1) setShowKyc(false);
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
          onScan={() => {
            setBiometricSimulated(true);
          }}
          onBiometricProceed={() => setKycStep(4)}
          onComplete={handleKycComplete}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.ink }]}>
      <Ionicons
        name="shield-half-outline"
        size={80}
        color={C.primary}
        style={{ marginBottom: 24 }}
      />
      <Text style={[styles.title, { color: C.text }]}>{t('verification_pending')}</Text>
      <Text style={[styles.subtitle, { color: C.sub }]}>
        {t('pending_verification_desc', {
          role: currentUser?.role ? t('role_' + currentUser.role) : '',
        })}
      </Text>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: C.primary, marginBottom: 16 }]}
        onPress={() => setShowKyc(true)}
      >
        <Text style={[styles.btnText, { color: C.ink }]}>{t('verify_fayda_btn')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.btn,
          {
            backgroundColor: C.surface,
            borderColor: C.edge,
            marginBottom: 16,
            opacity: statusLoading || loading ? 0.6 : 1,
          },
        ]}
        disabled={statusLoading || loading}
        onPress={async () => {
          setStatusLoading(true);
          setError(null);

          try {
            if (!currentUser?.id) {
              const message = 'Unable to refresh status: missing user identifier.';
              Alert.alert('Check Status Failed', message);
              setError(message);
              return;
            }

            const { fetchProfile } = await import('../../services/profile.service');
            const res = await fetchProfile(currentUser.id);

            if (res.data) {
              await setCurrentUser(res.data);
            } else {
              const message = res.error || 'Could not refresh profile. Please try again.';
              Alert.alert('Check Status Failed', message);
              setError(message);
            }
          } catch (e: any) {
            const message = e?.message || 'Unable to refresh status. Please try again.';
            Alert.alert('Check Status Failed', message);
            setError(message);
          } finally {
            setStatusLoading(false);
          }
        }}
      >
        {statusLoading ? (
          <ActivityIndicator color={C.text} />
        ) : (
          <Text style={[styles.btnText, { color: C.text }]}>{t('check_status')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: 'transparent' }]}
        onPress={handleSignOut}
      >
        <Text style={[styles.btnText, { color: C.sub }]}>{t('sign_out')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 200,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});

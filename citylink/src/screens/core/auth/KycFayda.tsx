import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Radius, Shadow } from '../../../theme';
import { CButton, CInput } from '../../../components';
import { useT } from '../../../utils/i18n';
import { GlassView } from '../../../components/GlassView';

export const KycFayda = ({
  C,
  fadeAnim,
  slideAnim,
  kycStep,
  faydaFIN,
  setFaydaFIN,
  faydaOTP,
  setFaydaOTP,
  biometricSimulated,
  setBiometricSimulated,
  loading,
  error,
  onBack,
  onFINSubmit,
  onOTPSubmit,
  onScan,
  onBiometricProceed,
  onComplete,
}: any) => {
  const t = useT();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (kycStep === 3 && !biometricSimulated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [kycStep, biometricSimulated]);

  const renderStepIcon = (step: number) => {
    let iconName: any = 'document-text-outline';
    if (step === 2) iconName = 'chatbubble-ellipses-outline';
    if (step === 3) iconName = 'finger-print-outline';
    if (step === 4) iconName = 'checkmark-circle-outline';

    const isActive = kycStep >= step;

    return (
      <View
        style={[
          styles.stepIcon,
          {
            backgroundColor: isActive ? C.primary : C.surface,
            borderColor: isActive ? C.primary : C.edge,
            transform: [{ scale: kycStep === step ? 1.1 : 1 }],
          },
        ]}
      >
        <Ionicons name={iconName} size={20} color={isActive ? C.ink : C.sub} />
      </View>
    );
  };

  return (
    <Animated.View
      style={[styles.screen, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: C.text, fontFamily: Fonts.headline }]}>
            FAYDA
          </Text>
          <Text style={[styles.subtitle, { color: C.sub, fontFamily: Fonts.bold }]}>
            {t('national_id_verification').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.stepper}>
        {renderStepIcon(1)}
        <View style={[styles.stepLine, { backgroundColor: kycStep > 1 ? C.primary : C.edge }]} />
        {renderStepIcon(2)}
        <View style={[styles.stepLine, { backgroundColor: kycStep > 2 ? C.primary : C.edge }]} />
        {renderStepIcon(3)}
        <View style={[styles.stepLine, { backgroundColor: kycStep > 3 ? C.primary : C.edge }]} />
        {renderStepIcon(4)}
      </View>

      <View style={styles.content}>
        <GlassView intensity={20} style={styles.glassCard}>
          {kycStep === 1 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: C.text }]}>{t('enter_fin')}</Text>
              <Text style={[styles.stepDesc, { color: C.sub }]}>{t('enter_fin_desc')}</Text>
              <CInput
                label={t('fin_number_label')}
                value={faydaFIN}
                onChangeText={setFaydaFIN}
                placeholder="1000 0000 0000"
                iconName="card-outline"
                keyboardType="number-pad"
                maxLength={12}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <CButton
                title={t('verify_fin')}
                onPress={onFINSubmit}
                loading={loading}
                style={{ marginTop: 24 }}
              />
            </View>
          )}

          {kycStep === 2 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: C.text }]}>{t('identity_verification')}</Text>
              <Text style={[styles.stepDesc, { color: C.sub }]}>{t('otp_sent_msg')}</Text>
              <CInput
                label={t('confirmation_code_label')}
                value={faydaOTP}
                onChangeText={setFaydaOTP}
                placeholder="000000"
                iconName="key-outline"
                keyboardType="number-pad"
                maxLength={6}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <CButton
                title={t('submit_code')}
                onPress={onOTPSubmit}
                loading={loading}
                style={{ marginTop: 24 }}
              />
            </View>
          )}

          {kycStep === 3 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: C.text }]}>{t('biometric_scan')}</Text>
              <Text style={[styles.stepDesc, { color: C.sub }]}>{t('biometric_scan_desc')}</Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.scanTarget,
                  {
                    backgroundColor: biometricSimulated ? 'rgba(0, 255, 128, 0.05)' : C.surface,
                    borderColor: biometricSimulated ? C.primary : C.edge,
                  },
                ]}
                onPress={onScan}
              >
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Ionicons
                    name={biometricSimulated ? 'checkmark-circle' : 'finger-print'}
                    size={80}
                    color={biometricSimulated ? C.primary : C.sub}
                  />
                </Animated.View>
                <Text
                  style={[
                    styles.scanText,
                    {
                      color: biometricSimulated ? C.primary : C.sub,
                      fontFamily: Fonts.bold,
                    },
                  ]}
                >
                  {biometricSimulated ? t('verification_successful') : t('tap_to_scan')}
                </Text>

                {!biometricSimulated && (
                  <View style={[styles.scanLine, { backgroundColor: C.primary }]} />
                )}
              </TouchableOpacity>

              <CButton
                title={t('proceed')}
                onPress={onBiometricProceed}
                loading={loading}
                disabled={!biometricSimulated}
                style={{ marginTop: 24 }}
              />
            </View>
          )}

          {kycStep === 4 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: C.text }]}>{t('verification_complete')}</Text>
              <Text style={[styles.stepDesc, { color: C.sub }]}>{t('verified_national_id_msg')}</Text>

              <View
                style={[styles.successCard, { backgroundColor: C.ink, borderColor: C.primary }]}
              >
                <View style={styles.successHeader}>
                  <View style={[styles.verifiedBadge, { backgroundColor: C.primary }]}>
                    <Ionicons name="shield-checkmark" size={24} color={C.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.successTitle, { color: C.text }]}>
                      {t('verified_status')}
                    </Text>
                    <Text style={[styles.successSubtitle, { color: C.sub }]}>
                      {faydaFIN ? `NID: ${faydaFIN}` : t('fayda_digital_id')}
                    </Text>
                  </View>
                </View>
              </View>

              <CButton
                title={t('start_using_citylink')}
                onPress={onComplete}
                loading={loading}
                style={{ marginTop: 24 }}
              />
            </View>
          )}
        </GlassView>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: { fontSize: 24, letterSpacing: 2 },
  subtitle: { fontSize: 10, letterSpacing: 1.5, opacity: 0.7 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: { flex: 1, height: 2, marginHorizontal: -2 },
  content: { flex: 1, paddingHorizontal: 20 },
  glassCard: {
    padding: 24,
    paddingVertical: 32,
    ...Shadow.md,
  },
  stepContent: { gap: 16 },
  stepTitle: { fontSize: 24, fontFamily: Fonts.headline, textAlign: 'center' },
  stepDesc: { fontSize: 15, fontFamily: Fonts.medium, textAlign: 'center', opacity: 0.8, marginBottom: 8 },
  scanTarget: {
    width: '100%',
    height: 220,
    borderRadius: Radius.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    overflow: 'hidden',
  },
  scanText: { marginTop: 20, fontSize: 16, letterSpacing: 0.5 },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    top: '50%',
    opacity: 0.3,
  },
  successCard: {
    borderRadius: Radius.card,
    padding: 20,
    borderWidth: 1,
    marginTop: 16,
  },
  successHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  verifiedBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: { fontSize: 20, fontFamily: Fonts.headline },
  successSubtitle: { fontSize: 13, fontFamily: Fonts.bold, opacity: 0.6 },
  errorText: { color: '#FF4D4D', fontSize: 13, fontFamily: Fonts.bold, textAlign: 'center', marginTop: 8 },
});

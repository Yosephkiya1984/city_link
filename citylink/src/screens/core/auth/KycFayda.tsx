import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../../../theme';
import { CButton, CInput } from '../../../components';
import { useT } from '../../../utils/i18n';

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
  const renderStepIcon = (step: number) => {
    let iconName: any = 'document-text-outline';
    if (step === 2) iconName = 'chatbubble-ellipses-outline';
    if (step === 3) iconName = 'finger-print-outline';
    if (step === 4) iconName = 'checkmark-circle-outline';

    return (
      <View
        style={[
          styles.stepIcon,
          { backgroundColor: kycStep >= step ? C.primary : C.surface, borderColor: C.edge },
        ]}
      >
        <Ionicons name={iconName} size={24} color={kycStep >= step ? C.ink : C.sub} />
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
        <Text style={[styles.title, { color: C.text }]}>{t('fayda_digital_id')}</Text>
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
              style={[styles.scanTarget, { borderColor: biometricSimulated ? C.primary : C.edge }]}
              onPress={onScan}
            >
              <Ionicons
                name={biometricSimulated ? 'checkmark-circle' : 'finger-print'}
                size={80}
                color={biometricSimulated ? C.primary : C.sub}
              />
              <Text style={[styles.scanText, { color: biometricSimulated ? C.primary : C.sub }]}>
                {biometricSimulated ? t('verification_successful') : t('tap_to_scan')}
              </Text>
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
              style={[styles.successCard, { backgroundColor: C.surface, borderColor: C.primary }]}
            >
              <View style={styles.successHeader}>
                <Ionicons name="checkmark-circle" size={40} color={C.primary} />
                <View>
                  <Text style={[styles.successTitle, { color: C.text }]}>
                    {t('verified_status')}
                  </Text>
                  <Text style={[styles.successSubtitle, { color: C.sub }]}>
                    {t('fayda_digital_id')}
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
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.bold,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: -4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContent: {
    gap: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginBottom: 16,
  },
  scanTarget: {
    width: '100%',
    height: 240,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
  },
  scanText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  successCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    marginTop: 24,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  successSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginTop: 8,
  },
});

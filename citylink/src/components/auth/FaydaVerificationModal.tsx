import React, { useState } from 'react';
import { Modal, StyleSheet, View, ActivityIndicator } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Button,
  Card,
  H3,
  Paragraph,
  Theme,
  Circle,
  AnimatePresence,
} from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { FaydaService, FaydaProfile } from '../../services/fayda.service';
import { GlassView } from '../GlassView';
import { useT } from '../../utils/i18n';

interface FaydaVerificationModalProps {
  isVisible: boolean;
  faydaId: string;
  onSuccess: (profile: FaydaProfile) => void;
  onCancel: () => void;
}

/**
 * FaydaVerificationModal
 * 🏛️ Premium UI for the National ID Handshake
 */
export const FaydaVerificationModal: React.FC<FaydaVerificationModalProps> = ({
  isVisible,
  faydaId,
  onSuccess,
  onCancel,
}) => {
  const [step, setStep] = useState<'consent' | 'verifying' | 'success' | 'error'>('consent');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const t = useT();

  const handleConsent = async () => {
    setStep('verifying');
    const result = await FaydaService.requestVerification(faydaId);

    if (result.success && result.profile) {
      setStep('success');
      // Give the user a moment to see the success state
      setTimeout(() => {
        onSuccess(result.profile!);
      }, 1500);
    } else {
      setStep('error');
      setErrorMessage(result.error || 'Identity verification failed');
    }
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.overlay}>
        <Theme name="dark">
          <GlassView style={styles.container}>
            <YStack gap="$5" padding="$5">
              {/* Header */}
              <XStack gap="$3" alignItems="center" alignSelf="center">
                <Circle size="$4" backgroundColor="$green8">
                  <Ionicons name="shield-checkmark" size={24} color="white" />
                </Circle>
                <YStack>
                  <H3 fontSize={18} fontWeight="bold">
                    {t('gov_gateway')}
                  </H3>
                  <Text fontSize={12} opacity={0.6}>
                    {t('nidp_label')}
                  </Text>
                </YStack>
              </XStack>

              <YStack height={2} backgroundColor="$gray5" opacity={0.3} />

              <AnimatePresence>
                {step === 'consent' && (
                  <YStack
                    gap="$4"
                    enterStyle={{ opacity: 0, y: 10 }}
                    exitStyle={{ opacity: 0, y: -10 }}
                  >
                    <Paragraph textAlign="center">
                      {t('citylink_request_fayda', { faydaId })}
                    </Paragraph>

                    <Card
                      backgroundColor="$gray3"
                      padding="$4"
                      borderWidth={1}
                      borderColor="$borderColor"
                    >
                      <YStack gap="$2">
                        <XStack gap="$2" alignItems="center">
                          <Ionicons name="person-circle-outline" size={16} color="#4ade80" />
                          <Text fontSize={14}>{t('full_name_gender')}</Text>
                        </XStack>
                        <XStack gap="$2" alignItems="center">
                          <Ionicons name="lock-closed-outline" size={16} color="#4ade80" />
                          <Text fontSize={14}>{t('registration_status')}</Text>
                        </XStack>
                      </YStack>
                    </Card>

                    <Paragraph fontSize={12} opacity={0.5} textAlign="center">
                      {t('nidp_authorization_msg')}
                    </Paragraph>

                    <YStack gap="$2">
                      <Button
                        backgroundColor="$green9"
                        onPress={handleConsent}
                        icon={<Ionicons name="finger-print" size={20} color="white" />}
                      >
                        {t('consent_verify')}
                      </Button>
                      <Button variant="outlined" onPress={onCancel}>
                        {t('cancel')}
                      </Button>
                    </YStack>
                  </YStack>
                )}

                {step === 'verifying' && (
                  <YStack gap="$4" alignItems="center" paddingVertical="$8">
                    <ActivityIndicator size="large" color="#4ade80" />
                    <Text fontWeight="bold">{t('secure_handshake_progress')}</Text>
                    <Paragraph fontSize={12} opacity={0.5}>
                      {t('verifying_credentials_msg')}
                    </Paragraph>
                  </YStack>
                )}

                {step === 'success' && (
                  <YStack gap="$4" alignItems="center" paddingVertical="$8">
                    <Circle size="$6" backgroundColor="$green10">
                      <Ionicons name="shield-checkmark" size={40} color="white" />
                    </Circle>
                    <H3 color="$green10">{t('identity_verified')}</H3>
                    <Paragraph textAlign="center">{t('handshake_success_welcome')}</Paragraph>
                  </YStack>
                )}

                {step === 'error' && (
                  <YStack gap="$4" alignItems="center" paddingVertical="$8">
                    <Circle size="$6" backgroundColor="$red10">
                      <Ionicons name="alert-circle" size={40} color="white" />
                    </Circle>
                    <H3 color="$red10">{t('verification_failed')}</H3>
                    <Paragraph textAlign="center">{errorMessage}</Paragraph>
                    <Button width="100%" onPress={() => setStep('consent')}>
                      {t('retry')}
                    </Button>
                    <Button variant="outlined" width="100%" onPress={onCancel}>
                      {t('cancel')}
                    </Button>
                  </YStack>
                )}
              </AnimatePresence>
            </YStack>
          </GlassView>
        </Theme>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});

import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors as T, Fonts, Radius } from '../../theme';
import { CButton } from '../index';
import { t } from '../../utils/i18n';

interface RestaurantPinModalProps {
  visible: boolean;
  pin: string;
  onClose: () => void;
}

export function RestaurantPinModal({ visible, pin, onClose }: RestaurantPinModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.pinCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="bicycle" size={40} color={T.primary} />
          </View>

          <Text style={styles.title}>{t('rider_pickup_pin_up')}</Text>
          <Text style={styles.subtitle}>{t('authorized_handover_required')}</Text>

          <View style={styles.pinDisplay}>
            <Text style={styles.pinCode}>{pin}</Text>
          </View>

          <Text style={styles.instruction}>{t('give_secure_code_rider')}</Text>

          <CButton
            title={t('confirm_handover_up')}
            onPress={onClose}
            style={styles.confirmBtn}
            textStyle={{ color: '#000' }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    padding: 24,
  },
  pinCard: {
    backgroundColor: T.surface,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.edge,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.primaryL,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: Fonts.black,
    letterSpacing: 1,
  },
  subtitle: {
    color: T.textSoft,
    fontSize: 12,
    fontFamily: Fonts.bold,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  pinDisplay: {
    backgroundColor: T.bg,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 20,
    marginVertical: 32,
    borderWidth: 1,
    borderColor: T.primary,
  },
  pinCode: {
    fontSize: 64,
    fontFamily: Fonts.black,
    color: T.primary,
    letterSpacing: 16,
    textAlign: 'center',
  },
  instruction: {
    color: T.textSoft,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.medium,
    marginBottom: 32,
  },
  confirmBtn: {
    backgroundColor: T.primary,
    width: '100%',
    height: 56,
    borderRadius: 16,
  },
});

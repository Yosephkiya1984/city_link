import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors as T, Fonts } from '../../theme';
import { t } from '../../utils/i18n';

interface OrderVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  order: any | null;
  pinInput: string;
  setPinInput: (pin: string) => void;
  loading: boolean;
}

export function OrderVerificationModal({
  visible,
  onClose,
  onConfirm,
  order,
  pinInput,
  setPinInput,
  loading,
}: OrderVerificationModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{t('delivery_verification')}</Text>
              <Text style={styles.modalSub}>{t('enter_buyer_pin')}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={T.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.verificationBody}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={48} color={T.primary} />
            </View>

            <Text style={styles.productName}>{order?.product_name}</Text>
            <Text style={styles.orderId}>
              {t('order_id')} #{order?.id?.slice(0, 8).toUpperCase()}
            </Text>

            <TextInput
              style={styles.pinInput}
              placeholder="000000"
              placeholderTextColor={T.textSub}
              keyboardType="numeric"
              maxLength={6}
              value={pinInput}
              onChangeText={setPinInput}
              autoFocus
            />

            <Text style={styles.infoText}>{t('release_funds_info')}</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons
                  name="lock-open-outline"
                  size={18}
                  color="#000"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.submitBtnText}>{t('verify_release_escrow')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: T.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: T.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: T.text,
  },
  modalSub: {
    color: T.textSub,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  verificationBody: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: T.primaryL,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  productName: {
    color: T.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  orderId: {
    color: T.textSub,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  pinInput: {
    backgroundColor: T.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.primary,
    fontSize: 32,
    letterSpacing: 8,
    textAlign: 'center',
    width: '100%',
    height: 70,
    color: T.text,
  },
  infoText: {
    color: T.textSub,
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: T.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

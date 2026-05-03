import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors as T, Fonts } from '../../theme';
import { t } from '../../utils/i18n';

interface JobRejectionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  rejectionType: string;
  setRejectionType: (t: string) => void;
  rejectionComment: string;
  setRejectionComment: (c: string) => void;
}

export function JobRejectionModal({
  visible,
  onClose,
  onConfirm,
  loading,
  rejectionType,
  setRejectionType,
  rejectionComment,
  setRejectionComment,
}: JobRejectionModalProps) {
  const reasons = [
    { id: 'NOT_REACHABLE', label: t('rejection_reason_not_reachable'), icon: 'call' },
    { id: 'WRONG_ITEM', label: t('rejection_reason_wrong_item'), icon: 'basket' },
    { id: 'DAMAGED', label: t('rejection_reason_damaged'), icon: 'warning' },
    { id: 'CHANGED_MIND', label: t('rejection_reason_changed_mind'), icon: 'close-circle' },
    { id: 'OTHER', label: t('rejection_reason_other'), icon: 'ellipsis-horizontal' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t('unable_to_deliver_btn')}</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color={T.textSub} />
            </TouchableOpacity>
          </View>

          <Text style={s.modalInstruction}>{t('rejection_instruction_msg')}</Text>

          <View style={s.reasonsGrid}>
            {reasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  s.reasonOption,
                  rejectionType === reason.id && {
                    borderColor: T.primary,
                    backgroundColor: (T as any).primaryDim,
                  },
                ]}
                onPress={() => setRejectionType(reason.id)}
              >
                <Ionicons
                  name={reason.icon as any}
                  size={20}
                  color={rejectionType === reason.id ? T.primary : T.textSub}
                />
                <Text
                  style={[
                    s.reasonLabel,
                    rejectionType === reason.id && { color: T.primary, fontWeight: '800' },
                  ]}
                >
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={s.rejectionInput}
            placeholder="Provide more details (optional)..."
            placeholderTextColor={T.textSub}
            value={rejectionComment}
            onChangeText={setRejectionComment}
            multiline
          />

          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: T.red }]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={T.bg} />
            ) : (
              <>
                <Ionicons name="alert-circle" size={18} color={T.bg} />
                <Text style={s.actionBtnText}>{t('mark_as_failed_btn')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0B0D11',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#E2E8F0',
  },
  modalInstruction: {
    color: '#8B949E',
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 20,
  },
  reasonsGrid: {
    gap: 10,
    marginBottom: 20,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 12,
  },
  reasonLabel: {
    color: '#8B949E',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectionInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    color: '#E2E8F0',
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 20,
  },
  actionBtn: {
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionBtnText: {
    color: '#0a0e14',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

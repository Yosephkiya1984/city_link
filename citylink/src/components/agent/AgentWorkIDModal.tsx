import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DarkColors as T, Fonts, Radius } from '../../theme';
import { t } from '../../utils/i18n';

interface AgentWorkIDModalProps {
  visible: boolean;
  onClose: () => void;
  agentProfile: any;
  currentUser: any;
}

export function AgentWorkIDModal({
  visible,
  onClose,
  agentProfile,
  currentUser,
}: AgentWorkIDModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('prof_digital_id_title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={T.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.idCardContainer}>
              <LinearGradient colors={['#1A1D24', '#0B0D11']} style={styles.idCard}>
                <View style={styles.idCardHeader}>
                  <View style={styles.sealContainer}>
                    <Ionicons name="shield-checkmark" size={24} color={T.primary} />
                    <Text style={styles.sealText}>{t('citylink_certified_label')}</Text>
                  </View>
                  <View style={styles.chip} />
                </View>

                <View style={styles.profileSection}>
                  <View style={styles.photoContainer}>
                    <Image
                      source={{
                        uri: currentUser?.profile_picture || 'https://via.placeholder.com/150',
                      }}
                      style={styles.photo}
                    />
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark" size={12} color="#000" />
                    </View>
                  </View>
                  <Text style={styles.agentName}>{currentUser?.full_name?.toUpperCase()}</Text>
                  <Text style={styles.agentRole}>{t('logistics_pro_label')}</Text>
                </View>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{t('agent_id_label')}</Text>
                    <Text style={styles.detailValue}>
                      CL-{currentUser?.id?.slice(0, 8).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{t('vehicle_plate_label')}</Text>
                    <Text style={styles.detailValue}>
                      {agentProfile?.plate_number || t('verification_pending')}
                    </Text>
                  </View>
                </View>

                <View style={styles.qrSection}>
                  <View style={styles.qrPlaceholder}>
                    <Ionicons name="qr-code" size={60} color="#000" />
                  </View>
                  <Text style={styles.qrFootnote}>{t('scan_verify_msg')}</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.legalSection}>
              <Text style={styles.legalTitle}>{t('legal_auth_title')}</Text>
              <Text style={styles.legalText}>{t('legal_auth_desc')}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: T.edge,
  },
  modalTitle: {
    color: T.text,
    fontSize: 20,
    fontFamily: Fonts.black,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 24,
  },
  idCardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.primary + '30',
    marginBottom: 32,
  },
  idCard: {
    padding: 24,
  },
  idCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  sealContainer: {
    alignItems: 'center',
    gap: 4,
  },
  sealText: {
    color: T.primary,
    fontSize: 9,
    fontFamily: Fonts.black,
    letterSpacing: 1,
  },
  chip: {
    width: 45,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  photo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: T.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: T.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1A1D24',
  },
  agentName: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: Fonts.black,
    textAlign: 'center',
  },
  agentRole: {
    color: T.primary,
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 3,
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 20,
    marginBottom: 32,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    color: T.textSoft,
    fontSize: 9,
    fontFamily: Fonts.bold,
    marginBottom: 4,
    letterSpacing: 1,
  },
  detailValue: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Fonts.black,
  },
  qrSection: {
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrFootnote: {
    color: T.textSoft,
    fontSize: 10,
    fontFamily: Fonts.medium,
    marginTop: 16,
    textAlign: 'center',
    opacity: 0.6,
  },
  legalSection: {
    backgroundColor: T.bg,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: T.edge,
  },
  legalTitle: {
    color: T.primary,
    fontSize: 11,
    fontFamily: Fonts.black,
    marginBottom: 8,
    letterSpacing: 1,
  },
  legalText: {
    color: T.textSoft,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.medium,
  },
});

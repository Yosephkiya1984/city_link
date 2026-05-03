import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors as T, Fonts, Radius } from '../../theme';
import { CButton } from '../index';
import { fmtETB } from '../../utils';

interface ParkingSessionDetailModalProps {
  visible: boolean;
  onClose: () => void;
  session: any;
  lot: any;
  isVerified: boolean;
  onSettle: (id: string, method: 'WALLET' | 'CASH', amount: number) => void;
  loading?: boolean;
}

export function ParkingSessionDetailModal({
  visible,
  onClose,
  session,
  lot,
  isVerified,
  onSettle,
  loading,
}: ParkingSessionDetailModalProps) {
  if (!session) return null;

  const durationMins = Math.floor((Date.now() - new Date(session.start_time).getTime()) / 60000);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.detailCard}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Session Detail</Text>
              <Text style={styles.subtitle}>
                Vehicle at {lot?.spot_prefix}
                {session.spot_id}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={T.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <DetailRow label="LICENSE PLATE" value={session.plate || 'NO PLATE LOGGED'} />
            <DetailRow
              label="START TIME"
              value={new Date(session.start_time).toLocaleTimeString()}
            />
            <DetailRow label="EST. DURATION" value={`${durationMins} mins`} />
            <DetailRow
              label="CURRENT FARE"
              value={`ETB ${fmtETB(session.calculated_cost || 0)}`}
              isPrimary
            />

            <View style={styles.settlementSection}>
              <Text style={styles.settlementLabel}>SELECT LEGAL SETTLEMENT METHOD</Text>

              <CButton
                title="Settle via Digital Wallet"
                onPress={() => onSettle(session.id, 'WALLET', session.calculated_cost)}
                loading={loading}
                disabled={!isVerified}
                style={[styles.settleBtn, { backgroundColor: isVerified ? T.primary : T.edge }]}
                textStyle={{ color: isVerified ? '#000' : T.textSoft }}
              />

              <CButton
                title="Record Cash Collection"
                onPress={() => onSettle(session.id, 'CASH', session.calculated_cost)}
                loading={loading}
                variant="outline"
                style={styles.cashBtn}
                textStyle={{ color: T.primary }}
              />

              <Text style={styles.legalFootnote}>
                * Cash payments will be logged to the Non-Financial Journal for tax compliance and
                will NOT affect your digital wallet balance.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const DetailRow = ({ label, value, isPrimary }: any) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, isPrimary && styles.primaryValue]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  detailCard: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 50,
    borderWidth: 1,
    borderColor: T.edge,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: T.text,
    fontSize: 20,
    fontFamily: Fonts.black,
  },
  subtitle: {
    color: T.textSoft,
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    color: T.textSoft,
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  detailValue: {
    color: T.text,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  primaryValue: {
    color: T.primary,
    fontSize: 18,
  },
  settlementSection: {
    marginTop: 24,
    gap: 12,
  },
  settlementLabel: {
    color: T.textSoft,
    fontSize: 10,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  settleBtn: {
    height: 56,
    borderRadius: 16,
  },
  cashBtn: {
    height: 56,
    borderRadius: 16,
    borderColor: T.primary,
  },
  legalFootnote: {
    color: T.textSoft,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    opacity: 0.6,
  },
});

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './constants';
import { Fonts } from '../../theme';

interface VerifiedCircleCardProps {
  circle: any;
  onJoin: (circle: any) => void;
}

export const VerifiedCircleCard = memo(({ circle, onJoin }: VerifiedCircleCardProps) => (
  <View style={styles.verifiedCircleCard}>
    <View style={styles.verifiedCircleHeader}>
      <View style={styles.verifiedCircleInfo}>
        <Text style={styles.verifiedCircleName} numberOfLines={1}>{circle.name}</Text>
        <Text style={styles.verifiedCircleGrade}>Official Institutional Circle</Text>
      </View>
    </View>
    <View style={styles.verifiedCircleStats}>
      <View style={styles.verifiedCircleStat}>
        <Text style={styles.verifiedCircleStatLabel}>Monthly</Text>
        <Text style={styles.verifiedCircleStatValue}>
          ETB {(circle.contribution_amount || 0).toLocaleString()}
        </Text>
      </View>
      <View style={styles.verifiedCircleStat}>
        <Text style={styles.verifiedCircleStatLabel}>Members</Text>
        <Text style={styles.verifiedCircleStatValue}>
          {circle.total_members ?? 0}
        </Text>
      </View>
    </View>
    <TouchableOpacity 
      style={styles.verifiedCircleButton} 
      onPress={() => onJoin(circle)}
      accessibilityLabel={`Join ${circle.name} circle`}
      accessibilityRole="button"
    >
      <Text style={styles.verifiedCircleButtonText}>Join Circle</Text>
      <Ionicons name="arrow-forward" size={14} color={COLORS['on-surface']} />
    </TouchableOpacity>
  </View>
));

interface VouchCardProps {
  draw: any;
  onVouch: (approved: boolean) => void;
}

export const VouchCard = memo(({ draw, onVouch }: VouchCardProps) => (
  <View style={styles.vouchCard}>
    <View style={styles.vouchHeader}>
      <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
      <View style={styles.vouchInfo}>
        <Text style={styles.vouchTitle}>Vouch Request</Text>
        <Text style={styles.vouchSubtitle}>Round {draw.round_number} Winner Draw</Text>
      </View>
    </View>
    <Text style={styles.vouchDescription}>
      Please verify that you witnessed the digital draw for this round and approve the disbursement of ETB {(draw.pot_amount || 0).toLocaleString()} to the winner.
    </Text>
    <View style={styles.vouchActions}>
      <TouchableOpacity 
        style={[styles.vouchButton, styles.vouchRejectButton]} 
        onPress={() => onVouch(false)}
        accessibilityLabel="Dispute this draw"
        accessibilityRole="button"
      >
        <Text style={styles.vouchRejectText}>Dispute</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.vouchButton, styles.vouchApproveButton]} 
        onPress={() => onVouch(true)}
        accessibilityLabel="Approve this draw"
        accessibilityRole="button"
      >
        <Text style={styles.vouchApproveText}>Approve Draw</Text>
      </TouchableOpacity>
    </View>
  </View>
));

const styles = StyleSheet.create({
  verifiedCircleCard: { backgroundColor: COLORS['surface-container-low'], borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS['outline-variant'] },
  verifiedCircleHeader: { flexDirection: 'row', marginBottom: 16 },
  verifiedCircleInfo: { flex: 1 },
  verifiedCircleName: { fontSize: 18, fontWeight: '700', color: COLORS['on-surface'], fontFamily: Fonts.headline },
  verifiedCircleGrade: { fontSize: 12, color: COLORS.primary, fontFamily: Fonts.body, marginTop: 2 },
  verifiedCircleStats: { flexDirection: 'row', backgroundColor: COLORS['surface-container'], borderRadius: 12, padding: 12, marginBottom: 16, gap: 16 },
  verifiedCircleStat: { flex: 1 },
  verifiedCircleStatLabel: { fontSize: 10, color: COLORS.outline, fontFamily: Fonts.label, textTransform: 'uppercase' },
  verifiedCircleStatValue: { fontSize: 14, fontWeight: '700', color: COLORS['on-surface'], fontFamily: Fonts.headline, marginTop: 4 },
  verifiedCircleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS['surface-container-high'] },
  verifiedCircleButtonText: { fontSize: 14, fontWeight: '700', color: COLORS['on-surface'], fontFamily: Fonts.label },
  vouchCard: { backgroundColor: COLORS['surface-container-low'], borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS['outline-variant'] },
  vouchHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  vouchInfo: { flex: 1 },
  vouchTitle: { fontSize: 16, fontWeight: '700', color: COLORS['on-surface'] },
  vouchSubtitle: { fontSize: 12, color: COLORS.outline },
  vouchDescription: { fontSize: 13, color: COLORS['on-surface-variant'], lineHeight: 18, marginBottom: 16 },
  vouchActions: { flexDirection: 'row', gap: 12 },
  vouchButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  vouchRejectButton: { borderWidth: 1, borderColor: COLORS.error },
  vouchRejectText: { color: COLORS.error, fontWeight: '700' },
  vouchApproveButton: { backgroundColor: COLORS.primary },
  vouchApproveText: { color: COLORS['on-primary'], fontWeight: '800' },
});

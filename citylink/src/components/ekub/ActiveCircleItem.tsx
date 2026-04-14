import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from './constants';
import { CircularProgress } from './EkubStats';
import { Fonts } from '../../theme';

interface ActiveCircleItemProps {
  circle: any;
  onContribute: (circle: any) => void;
  onSignConsent: (circle: any) => void;
}

const ActiveCircleItem = memo(({ 
  circle, 
  onContribute, 
  onSignConsent 
}: ActiveCircleItemProps) => {
  if (!circle) return null;

  const totalPot = circle.contribution_amount * (circle.max_members || 10);
  const progress = Math.min(100, Math.round((circle.pot_balance / totalPot) * 100));

  const isWinnerAwaitingConsent = circle.status === 'PAUSED' || circle.status === 'AWAITING_CONSENT';

  return (
    <View style={styles.activeCircleItem}>
      <View style={styles.circleProgressContainer}>
        <CircularProgress percentage={progress} color={COLORS.primary} />
      </View>
      <View style={styles.circleInfo}>
        <Text style={styles.circleName}>{circle.name}</Text>
        <Text style={styles.circleDetails}>
          Round {circle.current_round || 1} • ETB {circle.contribution_amount?.toLocaleString()}
        </Text>
      </View>
      <View style={styles.circleActions}>
        {isWinnerAwaitingConsent ? (
          <TouchableOpacity style={styles.consentButton} onPress={() => onSignConsent(circle)}>
            <Text style={styles.consentButtonText}>SIGN</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.payButton} onPress={() => onContribute(circle)}>
            <Text style={styles.payButtonText}>PAY</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

export default ActiveCircleItem;

const styles = StyleSheet.create({
  activeCircleItem: {
    backgroundColor: COLORS['surface-container'],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  circleProgressContainer: { width: 56, height: 56 },
  circleInfo: { flex: 1, gap: 2 },
  circleName: { fontSize: 16, fontWeight: '700', color: COLORS['on-surface'], fontFamily: Fonts.headline },
  circleDetails: { fontSize: 12, color: COLORS.outline, fontFamily: Fonts.body },
  circleActions: { minWidth: 60, alignItems: 'flex-end' },
  consentButton: { backgroundColor: COLORS.secondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  consentButtonText: { fontSize: 13, fontWeight: '800', color: COLORS['on-secondary'], fontFamily: Fonts.label },
  payButton: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  payButtonText: { fontSize: 13, fontWeight: '800', color: COLORS['on-primary'], fontFamily: Fonts.label },
});

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Circle as SvgCircle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './constants';
import { Fonts, Shadow } from '../../theme';
import { fmtETB } from '../../utils';

interface CircularProgressProps {
  percentage: number;
  color: string;
  size?: number;
}

export const CircularProgress = memo(({ percentage, color, size = 56 }: CircularProgressProps) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="4"
          fill="transparent"
        />
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.circleProgressText}>
        <Text style={styles.circleProgressNumber}>{percentage}%</Text>
      </View>
    </View>
  );
});

export const ReliabilityScore = memo(({ score }: { score: number }) => (
  <View style={styles.reliabilityCard}>
    <View style={styles.reliabilityContent}>
      <View style={styles.reliabilityHeader}>
        <Text style={styles.reliabilityLabel}>Reliability</Text>
        <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
      </View>
      <View style={styles.reliabilityScoreRow}>
        <Text style={styles.reliabilityScoreNumber}>{score}</Text>
        <Text style={styles.reliabilityScoreChange}>+12</Text>
      </View>
      <View style={styles.reliabilityProgress}>
        <View style={[styles.reliabilityProgressFill, { width: `${(score / 850) * 100}%` }]} />
      </View>
    </View>
  </View>
));

export const TotalSaved = memo(({ amount }: { amount: number }) => (
  <View style={styles.totalSaved}>
    <View style={styles.totalSavedContent}>
      <View style={styles.totalSavedHeader}>
        <Text style={styles.totalSavedLabel}>Total Pot</Text>
        <Ionicons name="wallet" size={16} color={COLORS.secondary} />
      </View>
      <Text style={styles.totalSavedNumber}>ETB {fmtETB(amount, 0)}</Text>
      <Text style={styles.totalSavedSubtext}>Active across 3 circles</Text>
    </View>
  </View>
));

const styles = StyleSheet.create({
  circleProgressText: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  circleProgressNumber: { fontSize: 10, fontWeight: '700', color: COLORS['on-surface'], fontFamily: Fonts.headline },
  reliabilityCard: { flex: 1, backgroundColor: COLORS['surface-container-low'], borderRadius: 12, padding: 20, borderWidth: 1, borderColor: 'rgba(134, 148, 137, 0.05)' },
  reliabilityContent: { zIndex: 10 },
  reliabilityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  reliabilityLabel: { fontSize: 12, fontWeight: '700', color: COLORS.outline, fontFamily: Fonts.label, textTransform: 'uppercase' },
  reliabilityScoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 16 },
  reliabilityScoreNumber: { fontSize: 48, fontWeight: '700', color: COLORS['on-surface'], fontFamily: Fonts.headline },
  reliabilityScoreChange: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  reliabilityProgress: { width: '100%', height: 6, backgroundColor: COLORS['surface-container-highest'], borderRadius: 3, overflow: 'hidden' },
  reliabilityProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  totalSaved: { flex: 1, backgroundColor: COLORS['surface-container-low'], borderRadius: 12, padding: 20, borderWidth: 1, borderColor: 'rgba(134, 148, 137, 0.05)', justifyContent: 'center' },
  totalSavedContent: { gap: 4 },
  totalSavedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalSavedLabel: { fontSize: 12, fontWeight: '700', color: COLORS.outline, fontFamily: Fonts.label, textTransform: 'uppercase' },
  totalSavedNumber: { fontSize: 24, fontWeight: '700', color: COLORS['on-surface'], fontFamily: Fonts.headline },
  totalSavedSubtext: { fontSize: 10, color: COLORS.outline, fontFamily: Fonts.body, textTransform: 'uppercase' },
});

import React from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { Fonts, FontSize } from '../../theme';

export function CreditScoreRing({ score = 742, maxScore = 850, animValue }) {
  const C = useTheme();
  const percentage = (score / maxScore) * 100;
  const radius = 35;
  const stroke = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getScoreTier = (s) => ({ tier: 'Superior', color: '#59de9b' });
  const tier = getScoreTier(score);

  return (
    <Animated.View
      style={[
        styles.statsCard,
        {
          backgroundColor: C.surface,
          borderColor: C.edge2,
          opacity: animValue,
          transform: [{ scale: animValue }],
        },
      ]}
    >
      <View style={styles.creditRing}>
        <Svg width={90} height={90} viewBox="0 0 100 100">
          <Circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={stroke}
          />
          <Path
            d={`M 50,50 m 0,-${radius} a ${radius},${radius} 0 1,1 0,${radius * 2} a ${radius},${radius} 0 1,1 0,-${radius * 2}`}
            fill="none"
            stroke={tier.color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={styles.creditLabelCenter}>
          <Text style={[styles.scoreText, { color: C.text }]}>{score}</Text>
        </View>
      </View>
      <View style={styles.creditTextContainer}>
        <Text style={[styles.creditTitle, { color: C.sub }]}>CREDIT SCORE</Text>
        <Text style={[styles.creditStatus, { color: tier.color }]}>{tier.tier}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  creditRing: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditLabelCenter: {
    position: 'absolute',
  },
  scoreText: {
    fontSize: 20,
    fontFamily: Fonts.black,
  },
  creditTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  creditTitle: {
    fontSize: 10,
    fontFamily: Fonts.black,
    letterSpacing: 1,
  },
  creditStatus: {
    fontSize: 16,
    fontFamily: Fonts.black,
    marginTop: 2,
  },
});

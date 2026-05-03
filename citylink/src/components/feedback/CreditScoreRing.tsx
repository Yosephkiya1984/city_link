import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, Path, Skia, vec, SweepGradient, Circle, Group } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Fonts, Radius } from '../../theme';
import { CreditService } from '../../services/credit.service';
import { MotiView } from 'moti';

interface CreditScoreRingProps {
  score?: number;
  maxScore?: number;
}

export function CreditScoreRing({ score = 742, maxScore = 850 }: CreditScoreRingProps) {
  const C = useTheme();
  const percentage = (score - 300) / (maxScore - 300); // 0 to 1

  // Reanimated values for smooth Skia interaction
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percentage, {
      duration: 1500,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [percentage]);

  const radius = 40;
  const strokeWidth = 8;
  const center = vec(50, 50);

  const category = CreditService.getCategory(score);

  // Create the path for the ring
  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addCircle(center.x, center.y, radius);
    return p;
  });

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 15, delay: 200 }}
      style={[
        styles.statsCard,
        {
          backgroundColor: C.surface,
          borderColor: C.edge,
        },
      ]}
    >
      <View style={styles.creditRing}>
        <Canvas style={{ width: 100, height: 100 }}>
          <Group>
            {/* Background Circle */}
            <Circle
              cx={center.x}
              cy={center.y}
              r={radius}
              color={C.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
              style="stroke"
              strokeWidth={strokeWidth}
            />
            {/* Animated Progress Path */}
            <Path
              path={path}
              color={category.color}
              style="stroke"
              strokeWidth={strokeWidth}
              strokeCap="round"
              start={0}
              end={progress}
            />
          </Group>
        </Canvas>
        <View style={styles.creditLabelCenter}>
          <Text style={[styles.scoreText, { color: C.text }]}>{score}</Text>
        </View>
      </View>

      <View style={styles.creditTextContainer}>
        <Text style={[styles.creditTitle, { color: C.sub }]}>CREDIT SCORE</Text>
        <Text style={[styles.creditStatus, { color: category.color }]}>{category.label}</Text>
        <Text style={[styles.creditDesc, { color: C.hint }]} numberOfLines={1}>
          Top {Math.max(1, 100 - Math.floor(percentage * 100))}% of users
        </Text>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Radius.card,
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
    fontSize: 22,
    fontFamily: Fonts.headline,
  },
  creditTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  creditTitle: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 1.5,
  },
  creditStatus: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    marginTop: 1,
  },
  creditDesc: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
});

import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { Radius } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

export function SkeletonLoader({ style, lines = 3 }: any) {
  const C = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  return (
    <View style={[{ gap: 8 }, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <Animated.View
          key={index}
          style={{
            height: lines === 1 ? 120 : 20,
            borderRadius: Radius.md,
            backgroundColor: C.edge2,
            opacity: shimmerAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.3, 0.7, 0.3],
            }),
          }}
        />
      ))}
    </View>
  );
}

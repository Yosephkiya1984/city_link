import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { Radius } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

export function SkeletonLoader({ style, lines = 3, height = 20 }: any) {
  const C = useTheme();

  return (
    <View style={[{ gap: 12 }, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          colorMode={C.isDark ? 'dark' : 'light'}
          width={'100%'}
          height={lines === 1 && height === 20 ? 120 : height}
          radius={Radius.md}
          transition={{
            type: 'timing',
            duration: 1500,
          }}
        />
      ))}
    </View>
  );
}

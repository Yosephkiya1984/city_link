import React, { useRef } from 'react';
import { View, Pressable, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Radius, Spacing, Shadow } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  accentColor?: string;
  glow?: boolean;
}

export function Card({ children, style, onPress, accentColor, glow = false }: CardProps) {
  const C = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, tension: 150, friction: 12 }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 150, friction: 12 }).start();
  };
  
  const inner = (
    <View style={[{
      backgroundColor: C.surface,
      borderWidth: 1.5,
      borderColor: accentColor ? accentColor : C.edge2,
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      overflow: 'hidden',
      ...(glow ? Shadow.primary : Shadow.sm),
    }, style]}>
      {glow && (
        <View style={{
          position: 'absolute', top: -50, right: -50, width: 100, height: 100,
          backgroundColor: C.primaryGlow, borderRadius: 50, opacity: 0.5,
        }} />
      )}
      {children}
    </View>
  );

  if (!onPress) return inner;

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: Spacing.md }}>
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        onPressIn={onPressIn} onPressOut={onPressOut}>
        {inner}
      </Pressable>
    </Animated.View>
  );
}

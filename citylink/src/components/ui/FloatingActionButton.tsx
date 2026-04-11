import React, { useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Shadow } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

export function FloatingActionButton({ icon, onPress, color, size = 'md', style }) {
  const C = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, tension: 200, friction: 4 }),
      Animated.timing(rotate, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      Animated.timing(rotate, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const sizeConfig = {
    sm: { size: 48, iconSize: 20 },
    md: { size: 56, iconSize: 24 },
    lg: { size: 64, iconSize: 28 },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  return (
    <Animated.View
      style={{
        transform: [
          { scale },
          { rotate: rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '15deg'] }) },
        ],
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[
          {
            width: config.size,
            height: config.size,
            borderRadius: config.size / 2,
            backgroundColor: color || C.primary,
            alignItems: 'center',
            justifyContent: 'center',
            ...Shadow.lg,
            borderWidth: 2,
            borderColor: C.white + '30',
          },
          style,
        ]}
      >
        <Ionicons name={icon} size={config.iconSize} color={C.white} />
      </TouchableOpacity>
    </Animated.View>
  );
}

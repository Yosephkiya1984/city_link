import React, { useRef } from 'react';
import { View, Animated, TouchableOpacity } from 'react-native';
import { Radius, Shadow } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { GlassView } from '../GlassView';

interface GlassCardProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  accentColor?: string;
  glow?: boolean;
  blur?: boolean;
}

export function GlassCard({
  children,
  style,
  onPress,
  accentColor,
  glow = false,
  blur = true,
}: GlassCardProps) {
  const C = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.8}
      >
        <GlassView
          intensity={blur ? 35 : 0}
          borderRadius={Radius['2xl']}
          borderColor={accentColor ? accentColor + '40' : C.edge2}
          style={{
            ...Shadow.xl,
            minHeight: 40,
          }}
        >
          {glow && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: accentColor || C.primary,
                opacity: 0.8,
              }}
            />
          )}
          <View style={{ padding: 0 }}>{children}</View>
        </GlassView>
      </TouchableOpacity>
    </Animated.View>
  );
}

import React, { useRef } from 'react';
import { View, Text, Animated, ActivityIndicator, Pressable, Platform, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Radius, FontSize, Fonts, Shadow } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface CButtonProps {
  onPress?: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'white';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

export function CButton({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  style,
  textStyle,
  icon,
}: CButtonProps) {
  const C = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const py = size === 'sm' ? 10 : size === 'lg' ? 18 : 14;
  const fs = size === 'sm' ? FontSize.sm : size === 'lg' ? FontSize.xl : FontSize.lg;
  const fw = Fonts.bold;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  };

  async function handlePress() {
    if (disabled || loading) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } catch (_) {}
    onPress?.();
  }

  const isPrimary = variant === 'primary';

  const Content = (
    <View
      style={{
        paddingVertical: py,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: -100,
          width: 100,
          height: '100%',
          backgroundColor: 'rgba(255,255,255,0.3)',
          transform: [
            {
              translateX: (shimmerAnim?.interpolate 
                ? shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 300] })
                : -100) as any,
            },
          ],
        }}
      />
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary ? C.white : C.primary} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={fs + 2} color={isPrimary ? C.white : C.primary} />}
          <Text
            style={[
              {
                color: isPrimary ? C.white : C.primary,
                fontSize: fs,
                fontFamily: fw,
                letterSpacing: 0.5,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }], width: '100%' }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        style={({ pressed }) => ({
          borderRadius: Radius.xl,
          overflow: 'hidden',
          backgroundColor: isPrimary ? undefined : C.surface,
          borderWidth: isPrimary ? 0 : 1.5,
          borderColor: isPrimary ? 'transparent' : C.edge2,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          ...Platform.select({ ios: Shadow.md as ViewStyle, android: {} }),
        })}
      >
        {isPrimary ? (
          <LinearGradient
            colors={C.primaryGrad as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {Content}
          </LinearGradient>
        ) : (
          Content
        )}
      </Pressable>
    </Animated.View>
  );
}

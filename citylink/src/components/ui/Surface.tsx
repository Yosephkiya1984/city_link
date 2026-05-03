import React from 'react';
import { View, ViewProps, StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Shadow } from '../../theme';

interface SurfaceProps extends ViewProps {
  variant?: 'card' | 'lift' | 'flat' | 'outline';
  elevation?: keyof typeof Shadow | 'none';
  radius?: keyof typeof Radius;
  padding?: number;
  gap?: number;
  onPress?: TouchableOpacityProps['onPress'];
  onPressIn?: TouchableOpacityProps['onPressIn'];
  onPressOut?: TouchableOpacityProps['onPressOut'];
}

export function Surface({
  variant = 'card',
  elevation = 'none',
  radius = 'card',
  padding = 16,
  gap,
  style,
  children,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: SurfaceProps) {
  const theme = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border };
      case 'lift':
        return { backgroundColor: theme.lift, borderWidth: 0 };
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.rim };
      case 'flat':
      default:
        return { backgroundColor: theme.surface, borderWidth: 0 };
    }
  };

  const dynamicStyles = {
    ...getVariantStyles(),
    borderRadius: Radius[radius],
    padding,
    ...(gap && { gap }),
    ...(elevation !== 'none' && Shadow[elevation]),
  };

  if (onPress || onPressIn || onPressOut) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[dynamicStyles, style]}
        {...(props as any)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[dynamicStyles, style]} {...props}>
      {children}
    </View>
  );
}

import React from 'react';
import { StyleSheet, View, ViewProps, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../hooks/useTheme';

interface GlassViewProps extends ViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
}

export const GlassView: React.FC<GlassViewProps> = ({
  children,
  intensity = 30,
  tint,
  borderRadius = 16,
  borderWidth = 1,
  borderColor,
  style,
  ...props
}) => {
  const { isDark } = useTheme();

  const defaultTint = tint || (isDark ? 'dark' : 'light');
  const defaultBorderColor = borderColor || (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)');

  return (
    <View
      style={[
        styles.container,
        { borderRadius, borderWidth, borderColor: defaultBorderColor },
        style,
      ]}
      {...props}
    >
      <BlurView
        intensity={intensity}
        tint={defaultTint}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});

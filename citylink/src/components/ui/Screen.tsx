import React from 'react';
import { View, StyleSheet, ViewProps, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ScreenProps extends ViewProps {
  safeArea?: boolean;
  withScroll?: boolean;
}

export function Screen({
  safeArea = true,
  withScroll = false,
  style,
  children,
  ...props
}: ScreenProps) {
  const theme = useTheme();

  const Container = safeArea ? SafeAreaView : View;

  return (
    <Container style={[styles.container, { backgroundColor: theme.bg }, style]} {...props}>
      <StatusBar
        barStyle={theme.bg === '#0B0D11' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
        translucent={Platform.OS === 'android'}
      />
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight } : {}),
  },
});

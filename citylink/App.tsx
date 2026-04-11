import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SpaceGrotesk_400Regular, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Manrope_400Regular, Manrope_700Bold } from '@expo-google-fonts/manrope';

import AppNavigator from './src/navigation';
import { ToastContainer, ErrorBoundary } from './src/components';
import { AppStoreProvider, useAppStore } from './src/store/AppStore';
import { GTFSService } from './src/services/gtfs';
import { useTheme } from './src/hooks/useTheme';

// ── Inner bootstrap component — runs INSIDE AppStoreProvider ─────────────────
function AppBootstrap() {
  const { isDark } = useAppStore();
  const theme = useTheme();
  const [bootstrapped, setBootstrapped] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // 1. Load Fonts Manually
        await Font.loadAsync({
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
          SpaceGrotesk_400Regular,
          SpaceGrotesk_700Bold,
          Manrope_400Regular,
          Manrope_700Bold,
        });
        setFontsLoaded(true);

        // 3. Session Restore & State Hydration
        const { hydrateSession } = useAppStore.getState();
        await hydrateSession();

        const session = useAppStore.getState().currentUser;

        // 4. Start Transit simulation (Lazy)
      } catch (e) {
        console.warn('[App] Boot error:', e);
      } finally {
        setBootstrapped(true);
      }
    }

    prepare();
  }, []);

  if (!bootstrapped || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text
          style={{
            marginTop: 20,
            color: theme.sub,
            fontSize: 16,
          }}
        >
          Loading CityLink...
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.ink}
          translucent={false}
        />
        <ErrorBoundary>
          <AppNavigator />
          <ToastContainer />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ── Root export — wraps everything in AppStoreProvider ───────────────────────
export default function App() {
  return (
    <AppStoreProvider>
      <AppBootstrap />
    </AppStoreProvider>
  );
}

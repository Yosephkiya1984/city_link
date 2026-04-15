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
import { useAuthStore } from './src/store/AuthStore';
import { useSystemStore } from './src/store/SystemStore';
import { migrateLegacyData } from './src/store/StoreUtils';

import { useTheme } from './src/hooks/useTheme';
import { memoryManager, PerformanceProfiler } from './src/utils/debug/memoryManager';
import { cacheManager } from './src/utils/debug/cacheManager';

// ── Inner bootstrap component — runs INSIDE AppStoreProvider ─────────────────
function AppBootstrap() {
  const isDark = useSystemStore(s => s.isDark);
  const theme = useTheme();
  const [bootstrapped, setBootstrapped] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // A. Start Memory Shield
    const stopMemoryMonitor = memoryManager.startMonitoring();
    
    // B. Register Cache Cleanup on critical memory pressure
    memoryManager.registerCleanupTask(() => {
      console.log('[App] Critical Memory Pressure: Clearing transient caches...');
      cacheManager.clear();
    });

    async function prepare() {
      const bootStart = performance.now();
      try {
        // 0. Migrate legacy data if exists
        await migrateLegacyData();

        // 1. Load Fonts Manually
        const fontStart = performance.now();
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
        console.log(`[Performance] Fonts loaded in ${(performance.now() - fontStart).toFixed(2)}ms`);

        // 3. Session Restore & State Hydration
        const authStart = performance.now();
        const { hydrateSession } = useAuthStore.getState();
        await hydrateSession();
        console.log(`[Performance] Session hydrated in ${(performance.now() - authStart).toFixed(2)}ms`);

        const session = useAuthStore.getState().currentUser;
        if (session && __DEV__) {
          console.log(`[App] Welcome back, ${session.full_name || 'User'}`);
        }

        console.log(`[Performance] Total bootstrap took ${(performance.now() - bootStart).toFixed(2)}ms`);
      } catch (e) {
        console.warn('[App] Boot error:', e);
      } finally {
        setBootstrapped(true);
      }
    }

    prepare();
    return () => {
      stopMemoryMonitor?.();
    };
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
    <AppBootstrap />
  );
}

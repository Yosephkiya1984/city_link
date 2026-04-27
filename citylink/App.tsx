import React, { useEffect, useState } from 'react';
import { TamaguiProvider } from 'tamagui';
import { config } from './src/tamagui.config';
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
import { t } from './src/utils/i18n';
import { memoryManager, PerformanceProfiler } from './src/utils/debug/memoryManager';
import { cacheManager } from './src/utils/debug/cacheManager';

import { useBiometricStore } from './src/store/BiometricStore';
import { BiometricLockScreen } from './src/components/auth/BiometricLockScreen';
import { AppState, AppStateStatus } from 'react-native';

import { PerformanceProvider } from './src/utils/debug/performanceMonitor';
import { ErrorReportingProvider } from './src/utils/debug/errorReporting';

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
        // 0. Check Biometric Support
        await useBiometricStore.getState().checkSupport();

        // 0. Migrate legacy data if exists
        try {
          await migrateLegacyData();
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error('[App] migrateLegacyData failed:', message, e);
        }

        // 1 & 2. Load Fonts & Hydrate Session Concurrently
        const fontStart = performance.now();
        const authStart = performance.now();

        const fontPromise = Font.loadAsync({
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
          SpaceGrotesk_400Regular,
          SpaceGrotesk_700Bold,
          Manrope_400Regular,
          Manrope_700Bold,
        }).then(() => {
          setFontsLoaded(true);
          console.log(`[Performance] Fonts loaded in ${(performance.now() - fontStart).toFixed(2)}ms`);
        });

        const { hydrateSession } = useAuthStore.getState();
        const authPromise = hydrateSession().then(() => {
          console.log(`[Performance] Session hydrated in ${(performance.now() - authStart).toFixed(2)}ms`);
        });

        await Promise.all([fontPromise, authPromise]);

        const session = useAuthStore.getState().currentUser;
        if (session) {
          // Hydrate the wallet state (balance + history)
          const { useWalletStore } = await import('./src/store/WalletStore');
          await useWalletStore.getState().hydrateWallet(session.id);

          // Background PIN Hash Sync
          const { ensureFullSync } = await import('./src/services/walletPin');
          await ensureFullSync(session.id);

          if (__DEV__) {
            console.log(`[App] Welcome back, ${session.full_name || 'User'}`);
          }
        }

        if (__DEV__) {
          console.log(`[Performance] Total bootstrap took ${(performance.now() - bootStart).toFixed(2)}ms`);
        }
      } catch (e) {
        console.warn('[App] Boot error:', e);
      } finally {
        setBootstrapped(true);
      }
    }

    // 🛡️ Biometric Session Monitor
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const { isBiometricsEnabled, isBiometricsSupported, setLocked } = useBiometricStore.getState();
      const session = useAuthStore.getState().currentUser;

      if (nextAppState === 'active' && session && isBiometricsEnabled && isBiometricsSupported) {
        setLocked(true);
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    prepare();
    return () => {
      stopMemoryMonitor?.();
      appStateSubscription.remove();
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
          {t('loading_app') || 'Loading CityLink...'}
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PerformanceProvider>
          <ErrorReportingProvider>
            <StatusBar
              barStyle={isDark ? 'light-content' : 'dark-content'}
              backgroundColor={theme.ink}
              translucent={false}
            />
            <ErrorBoundary>
              <AppNavigator />
              <BiometricLockScreen />
              <ToastContainer />
            </ErrorBoundary>
          </ErrorReportingProvider>
        </PerformanceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ── Root export — wraps everything in AppStoreProvider ───────────────────────
export default function App() {
  return (
    <TamaguiProvider config={config} defaultTheme="dark">
      <AppBootstrap />
    </TamaguiProvider>
  );
}

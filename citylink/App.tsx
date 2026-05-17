import React, { useEffect, useState } from 'react';
import { TamaguiProvider } from 'tamagui';
import { config } from './src/tamagui.config';
import { View, ActivityIndicator, StatusBar, Text, InteractionManager } from 'react-native';
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
  const isDark = useSystemStore((s) => s.isDark);
  const lang = useSystemStore((s) => s.lang);
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
        // ── PHASE 1: START CRITICAL ASSETS & AUTH CONCURRENTLY ─────────────────
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
          if (__DEV__) {
            console.log(`[Performance] Fonts loaded in ${(performance.now() - fontStart).toFixed(2)}ms`);
          }
        });

        const authPromise = useAuthStore.getState().hydrateSession().then(() => {
          if (__DEV__) {
            console.log(`[Performance] Session hydrated in ${(performance.now() - authStart).toFixed(2)}ms`);
          }
        });

        // ── PHASE 2: FIRE & FORGET SEMI-CRITICAL TASKS ────────────────────────
        const deferredInitialization = async () => {
          try {
            await Promise.all([
              useBiometricStore.getState().checkSupport(),
              migrateLegacyData().catch(e => console.warn('[App] Migration failed:', e)),
            ]);
          } catch (e) {
            console.warn('[App] Deferred initialization failed:', e);
          }
        };
        deferredInitialization();

        // ── PHASE 3: WAIT FOR UI-BLOCKING ASSETS ──────────────────────────────
        await Promise.all([fontPromise, authPromise]);

        // Release the splash screen as soon as fonts and auth are ready
        setBootstrapped(true);

        if (__DEV__) {
          console.log(`[Performance] Critical bootstrap took ${(performance.now() - bootStart).toFixed(2)}ms`);
        }

        // ── PHASE 4: POST-RENDER WARM-UP (NON-BLOCKING) ───────────────────────
        InteractionManager.runAfterInteractions(async () => {
          try {
            // Initialize Background Services
            const { walletSyncService } = await import('./src/services/WalletSyncService');
            walletSyncService.initialize();

            const session = useAuthStore.getState().currentUser;
            if (session) {
              // Sync language preference if mismatch
              if (session.language && session.language !== useSystemStore.getState().lang) {
                useSystemStore.getState().setLang(session.language);
              }

              // Background Wallet PIN sync
              const { ensureFullSync } = await import('./src/services/walletPin');
              ensureFullSync(session.id).catch(e => console.warn('[App] PIN sync failed:', e));

              if (__DEV__) {
                console.log(`[App] Welcome back, ${session.full_name || 'User'} (Services initialized post-render)`);
              }
            }
          } catch (e) {
            console.warn('[App] Post-render warm-up failed:', e);
          }
        });
      } catch (e) {
        console.error('[App] Critical boot error:', e);
        // Fallback to release the app even if something failed
        setBootstrapped(true);
      }
    }

    // 🛡️ Biometric Session Monitor
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const { isBiometricsEnabled, isBiometricsSupported, setLocked } =
        useBiometricStore.getState();
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
    <GestureHandlerRootView style={{ flex: 1 }} key={lang}>
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

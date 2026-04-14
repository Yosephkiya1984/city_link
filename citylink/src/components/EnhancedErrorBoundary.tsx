/**
 * Enhanced Error Boundary with Offline Support and Error Recovery
 * Provides comprehensive error handling with user-friendly recovery options
 */

import React, { Component } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

import { useAppStore } from '../store/AppStore';
import { Colors, DarkColors, Radius, Shadow, Fonts } from '../theme';
import { CButton } from './ui/CButton';
 
export const NetworkSuppressionContext = React.createContext<{
  suppressNetworkRetries: boolean;
}>({
  suppressNetworkRetries: false,
});

// ── Error Classification ───────────────────────────────────────────────────────────
const ERROR_TYPES = {
  NETWORK: 'network',
  AUTHENTICATION: 'auth',
  PERMISSION: 'permission',
  STORAGE: 'storage',
  NAVIGATION: 'navigation',
  RENDER: 'render',
  UNKNOWN: 'unknown',
} as const;

type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];

function classifyError(error: unknown): ErrorType {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);

  if (message.includes('Network') || message.includes('fetch') || message.includes('timeout')) {
    return ERROR_TYPES.NETWORK;
  }
  if (message.includes('auth') || message.includes('token') || message.includes('unauthorized')) {
    return ERROR_TYPES.AUTHENTICATION;
  }
  if (message.includes('permission') || message.includes('denied') || message.includes('access')) {
    return ERROR_TYPES.PERMISSION;
  }
  if (message.includes('storage') || message.includes('async') || message.includes('disk')) {
    return ERROR_TYPES.STORAGE;
  }
  if (message.includes('navigation') || message.includes('route') || message.includes('screen')) {
    return ERROR_TYPES.NAVIGATION;
  }
  if (message.includes('render') || message.includes('component') || message.includes('props')) {
    return ERROR_TYPES.RENDER;
  }

  return ERROR_TYPES.UNKNOWN;
}

// ── Error Recovery Actions ───────────────────────────────────────────────────────
const RECOVERY_ACTIONS = {
  [ERROR_TYPES.NETWORK]: [
    { label: 'Check Connection', action: 'check_connection' },
    { label: 'Retry', action: 'retry' },
    { label: 'Continue Anyway', action: 'dismiss_error' },
  ],
  [ERROR_TYPES.AUTHENTICATION]: [
    { label: 'Sign Out', action: 'sign_out' },
    { label: 'Sign In Again', action: 'sign_in' },
    { label: 'Clear Cache', action: 'clear_cache' },
  ],
  [ERROR_TYPES.PERMISSION]: [
    { label: 'Open Settings', action: 'open_settings' },
    { label: 'Request Permission', action: 'request_permission' },
    { label: 'Continue Without', action: 'continue_without' },
  ],
  [ERROR_TYPES.STORAGE]: [
    { label: 'Clear Cache', action: 'clear_cache' },
    { label: 'Free Space', action: 'free_space' },
    { label: 'Reset App', action: 'reset_app' },
  ],
  [ERROR_TYPES.NAVIGATION]: [
    { label: 'Go Home', action: 'go_home' },
    { label: 'Reload Screen', action: 'reload_screen' },
    { label: 'Restart App', action: 'restart_app' },
  ],
  [ERROR_TYPES.RENDER]: [
    { label: 'Reload Screen', action: 'reload_screen' },
    { label: 'Go Back', action: 'go_back' },
    { label: 'Report Bug', action: 'report_bug' },
  ],
  [ERROR_TYPES.UNKNOWN]: [
    { label: 'Reload App', action: 'reload_app' },
    { label: 'Report Bug', action: 'report_bug' },
    { label: 'Contact Support', action: 'contact_support' },
  ],
};

// ── Enhanced Error Boundary Component ───────────────────────────────────────────────
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  isDark?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorType: string | null;
  recoveryAttempted: boolean;
  suppressNetworkRetries: boolean;
}

class ErrorBoundaryInner extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null,
      recoveryAttempted: false,
      suppressNetworkRetries: false,
    };
  }
 
  private suppressionTimer: NodeJS.Timeout | null = null;

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error,
      errorType: classifyError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo,
      errorType: classifyError(error),
    });

    // Log to console in development
    if (__DEV__) {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // Store error for analytics
    this.logErrorToAnalytics(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.suppressionTimer) {
      clearTimeout(this.suppressionTimer);
    }
  }

  getCurrentScreen() {
    // This would need to be implemented based on your navigation setup
    // For now, return a generic screen name
    return 'unknown_screen';
  }

  logErrorToAnalytics(error: Error, errorInfo: React.ErrorInfo) {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        screen: this.getCurrentScreen(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        appVersion: '1.0.0', // This should come from your app config
      };

      // Store locally for later sync (using AsyncStorage for React Native)
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.getItem('error_logs')
        .then((raw: string | null) => {
          const storedErrors = JSON.parse(raw || '[]');
          storedErrors.push(errorData);

          // Keep only last 50 errors
          if (storedErrors.length > 50) {
            storedErrors.splice(0, storedErrors.length - 50);
          }

          AsyncStorage.setItem('error_logs', JSON.stringify(storedErrors));
        })
        .catch(() => {});
    } catch (e) {
      console.warn('Failed to log error to analytics:', e);
    }
  }

  handleRecoveryAction = (action: string) => {
    this.setState({ recoveryAttempted: true });

    switch (action) {
      case 'retry':
        setTimeout(() => {
          this.setState({ hasError: false, error: null, errorInfo: null });
        }, 1000);
        break;

      case 'check_connection':
        this.checkNetworkConnectivity();
        break;

      case 'dismiss_error':
        this.dismissError();
        break;

      case 'sign_out':
        this.signOut();
        break;

      case 'sign_in':
        this.navigateToSignIn();
        break;

      case 'clear_cache':
        this.clearCache();
        break;

      case 'open_settings':
        Linking.openSettings();
        break;

      case 'request_permission':
        this.requestPermissions();
        break;

      case 'continue_without':
        this.setState({ hasError: false });
        break;

      case 'go_home':
        this.navigateHome();
        break;

      case 'reload_screen':
        this.reloadScreen();
        break;

      case 'restart_app':
        this.restartApp();
        break;

      case 'report_bug':
        this.reportBug();
        break;

      case 'contact_support':
        this.contactSupport();
        break;

      case 'reload_app':
        this.reloadApp();
        break;

      case 'free_space':
        this.showStorageCleanupGuide();
        break;

      case 'reset_app':
        this.resetApp();
        break;

      default:
        console.warn('Unknown recovery action:', action);
    }
  };

  checkNetworkConnectivity = async () => {
    try {
      const response = await fetch('https://api.supabase.io/rest/v1/', {
        method: 'HEAD',
      });

      if (response.ok) {
        this.setState({ hasError: false });
      } else {
        Alert.alert(
          'Network Issue',
          'Unable to connect to servers. Please check your internet connection.'
        );
      }
    } catch (error) {
      Alert.alert('Network Issue', 'No internet connection. Please check your network settings.');
    }
  };

  dismissError = () => {
    // Dismiss the error state to allow the user to view cached/local content
    // Also suppress network retries for a short period to prevent immediate re-erroring
    if (this.suppressionTimer) {
      clearTimeout(this.suppressionTimer);
    }

    this.setState({ hasError: false, suppressNetworkRetries: true });

    this.suppressionTimer = setTimeout(() => {
      this.setState({ suppressNetworkRetries: false });
      this.suppressionTimer = null;
    }, 30000); // 30-second cooldown
  };

  signOut = () => {
    const { reset } = useAppStore.getState();
    reset();
    this.setState({ hasError: false });
  };

  navigateToSignIn = () => {
    this.setState({ hasError: false });
  };

  clearCache = async () => {
    try {
      const { reset } = useAppStore.getState();
      reset();
      Alert.alert('Cache Cleared', 'App cache has been cleared. Please restart the app.');
      this.setState({ hasError: false });
    } catch (error) {
      Alert.alert('Error', 'Failed to clear cache. Please restart the app manually.');
    }
  };

  requestPermissions = async () => {
    try {
      Alert.alert('Permissions', 'Please grant necessary permissions in app settings.');
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  navigateHome = () => {
    this.setState({ hasError: false });
  };

  reloadScreen = () => {
    this.setState({ hasError: false });
  };

  restartApp = () => {
    if (typeof Updates !== 'undefined' && typeof (Updates as any).reloadAsync === 'function') {
      (Updates as any).reloadAsync();
    } else {
      this.setState({ hasError: false });
    }
  };

  reportBug = () => {
    const { error, errorInfo } = this.state;
    const bugReport = `
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
    `.trim();

    Linking.openURL(
      `mailto:support@citylink.et?subject=Bug Report&body=${encodeURIComponent(bugReport)}`
    );
  };

  contactSupport = () => {
    Linking.openURL('mailto:support@citylink.et?subject=Support Request');
  };

  reloadApp = () => {
    if (typeof Updates !== 'undefined' && typeof (Updates as any).reloadAsync === 'function') {
      (Updates as any).reloadAsync();
    } else {
      this.setState({ hasError: false });
    }
  };

  showStorageCleanupGuide = () => {
    Alert.alert(
      'Storage Space Low',
      'Please free up storage space by:\n\n• Deleting unused apps\n• Clearing app cache\n• Removing old photos/videos\n• Moving files to cloud storage',
      [{ text: 'OK' }]
    );
  };

  resetApp = () => {
    Alert.alert('Reset App', 'This will reset all app data and settings. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          const { reset } = useAppStore.getState();
          reset();
          this.setState({ hasError: false });
        },
      },
    ]);
  };

  render() {
    const { hasError, error, errorType, recoveryAttempted } = this.state;
    const { fallback, isDark } = this.props;
    const C = isDark ? DarkColors : Colors;

    if (!hasError) {
      return (
        <NetworkSuppressionContext.Provider value={{ suppressNetworkRetries: this.state.suppressNetworkRetries }}>
          {this.props.children}
        </NetworkSuppressionContext.Provider>
      );
    }

    if (fallback) {
      return fallback;
    }

    const recoveryActions = RECOVERY_ACTIONS[errorType as ErrorType] || RECOVERY_ACTIONS[ERROR_TYPES.UNKNOWN];
    const errorMessage = error?.message || 'An unexpected error occurred';

    return (
      <View style={{ flex: 1, backgroundColor: C.ink, padding: 20 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: C.red + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Ionicons name="warning" size={40} color={C.red} />
            </View>

            <Text
              style={{
                color: C.text,
                fontSize: 24,
                fontFamily: Fonts.black,
                textAlign: 'center',
                marginBottom: 10,
              }}
            >
              Oops! Something went wrong
            </Text>

            <Text
              style={{
                color: C.sub,
                fontSize: 16,
                fontFamily: Fonts.medium,
                textAlign: 'center',
                marginBottom: 20,
                lineHeight: 24,
              }}
            >
              {errorMessage}
            </Text>

            {__DEV__ && (
              <View
                style={{
                  backgroundColor: C.surface,
                  padding: 15,
                  borderRadius: Radius.lg,
                  marginBottom: 20,
                  width: '100%',
                }}
              >
                <Text
                  style={{
                    color: C.sub,
                    fontSize: 12,
                    fontFamily: Fonts.regular,
                    marginBottom: 10,
                  }}
                >
                  Error Details (Development Mode):
                </Text>
                <Text
                  style={{
                    color: C.hint,
                    fontSize: 10,
                    fontFamily: Fonts.regular,
                  }}
                >
                  {error?.stack || 'No stack trace available'}
                </Text>
              </View>
            )}
          </View>

          <View style={{ gap: 12 }}>
            {recoveryActions.map((action: { label: string; action: string }, index: number) => (
              <CButton
                key={index}
                title={action.label}
                onPress={() => this.handleRecoveryAction(action.action)}
                variant={
                  action.action === 'sign_out' || action.action === 'reset_app'
                    ? 'ghost'
                    : 'primary'
                }
                style={{ marginBottom: 8 }}
              />
            ))}
          </View>

          {recoveryAttempted && (
            <View
              style={{
                marginTop: 20,
                padding: 15,
                backgroundColor: C.amberL,
                borderRadius: Radius.lg,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: C.amber,
                  fontSize: 14,
                  fontFamily: Fonts.medium,
                  textAlign: 'center',
                }}
              >
                Recovery attempt in progress. If the issue persists, please contact support.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }
}

export default function EnhancedErrorBoundary(props: Omit<ErrorBoundaryProps, 'isDark'>) {
  const isDark = useAppStore((s) => s.isDark);
  return <ErrorBoundaryInner {...props} isDark={isDark} />;
}

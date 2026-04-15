/* eslint-disable no-console */
import React, { createContext, useState, useCallback, useEffect, useContext } from 'react';
import { Platform, View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uid } from '../../utils';

// Error types
export interface ErrorReport {
  id: string;
  type: string;
  severity: string;
  message: string;
  stack?: string;
  timestamp: number;
  url?: string;
  userAgent?: string;
  context?: string;
  componentStack?: string;
  objectCount?: number;
  totalMemory?: number;
  [key: string]: any;
}

export interface ErrorStats {
  totalErrors: number;
  criticalErrors: number;
  networkErrors: number;
  apiErrors: number;
  lastError: ErrorReport | null;
}

export interface ErrorContextValue {
  errors: ErrorReport[];
  errorStats: ErrorStats;
  isOnline: boolean;
  isReporting: boolean;
  setIsReporting: (reporting: boolean) => void;
  reportError: (error: Partial<ErrorReport>) => void;
  clearErrors: () => Promise<void>;
  setOnlineStatus: (online: boolean) => void;
}

// Error context with default value
const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

// Error types
const ERROR_TYPES = {
  NETWORK: 'network',
  API: 'api',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  PERMISSION: 'permission',
  STORAGE: 'storage',
  PERFORMANCE: 'performance',
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
};

// Error severity levels
const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

interface ErrorReportingProviderProps {
  children: React.ReactNode;
}

// Error reporting provider
export function ErrorReportingProvider({ children }: ErrorReportingProviderProps) {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [errorStats, setErrorStats] = useState<ErrorStats>({
    totalErrors: 0,
    criticalErrors: 0,
    networkErrors: 0,
    apiErrors: 0,
    lastError: null,
  });
  const [isReporting, setIsReporting] = useState(true);

  // Update error statistics
  const updateErrorStats = useCallback((error: ErrorReport) => {
    setErrorStats((prev) => ({
      totalErrors: prev.totalErrors + 1,
      criticalErrors: prev.criticalErrors + (error.severity === SEVERITY_LEVELS.CRITICAL ? 1 : 0),
      networkErrors: prev.networkErrors + (error.type === ERROR_TYPES.NETWORK ? 1 : 0),
      apiErrors: prev.apiErrors + (error.type === ERROR_TYPES.API ? 1 : 0),
      lastError: error,
    }));
  }, []);

  // Store error locally
  const storeError = useCallback(async (error: ErrorReport) => {
    try {
      const storedErrors = await AsyncStorage.getItem('error_reports');
      const errors = storedErrors ? JSON.parse(storedErrors) : [];
      errors.push(error);

      // Keep only last 100 errors
      if (errors.length > 100) {
        errors.splice(0, errors.length - 100);
      }

      await AsyncStorage.setItem('error_reports', JSON.stringify(errors));
    } catch (storageError) {
      console.error('Failed to store error:', storageError);
    }
  }, []);

  // Report an error
  const reportError = useCallback(
    (errorData: Partial<ErrorReport>) => {
      if (!isReporting) return;

      const error: ErrorReport = {
        id: uid(),
        timestamp: Date.now(),
        ...errorData,
      } as ErrorReport;

      setErrors((prev) => [...prev, error]);
      updateErrorStats(error);
      storeError(error);

      // Log to console in development
      if (__DEV__) {
        console.error('🚨 Error reported:', error);
      }

      // Show user notification for critical errors
      if (error.severity === SEVERITY_LEVELS.CRITICAL) {
        showErrorNotification(error);
      }
    },
    [isReporting, updateErrorStats, storeError]
  );

  // Handle unhandled promise rejections
  const handleUnhandledRejection = useCallback(
    (event: any) => {
      const error = {
        id: uid(),
        type: ERROR_TYPES.CRITICAL,
        severity: SEVERITY_LEVELS.HIGH,
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack || '',
        timestamp: Date.now(),
        url: window.location?.href,
        userAgent: navigator.userAgent,
        context: 'unhandled_promise_rejection',
      };

      reportError(error);
    },
    [reportError]
  );

  // Handle global errors
  const handleGlobalError = useCallback(
    (event: any) => {
      const error = {
        id: uid(),
        type: ERROR_TYPES.CRITICAL,
        severity: SEVERITY_LEVELS.HIGH,
        message: event.message,
        stack: event.error?.stack || '',
        timestamp: Date.now(),
        url: window.location?.href,
        userAgent: navigator.userAgent,
        context: 'global_error',
      };

      reportError(error);
    },
    [reportError]
  );

  // Setup global error handlers
  const setupGlobalErrorHandlers = useCallback(() => {
    // Handle unhandled promise rejections
    if (Platform.OS === 'web') {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', handleGlobalError);
    }

    // Handle React errors in development
    if (__DEV__) {
      console.log('🔧 Error reporting initialized in development mode');
    }
  }, [handleUnhandledRejection, handleGlobalError]);

  // Report errors to backend
  const reportErrorsToBackend = useCallback(async () => {
    if (!isOnline || errors.length === 0) return;

    try {
      // In a real app, this would send to a backend service
      console.log(`📤 Reporting ${errors.length} errors to backend...`);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear reported errors
      await AsyncStorage.removeItem('error_reports');
      setErrors([]);

      console.log('✅ Errors reported successfully');
    } catch (error) {
      console.error('Failed to report errors to backend:', error);
    }
  }, [isOnline, errors.length]);

  // Initialize error reporting
  useEffect(() => {
    if (!isReporting) return;

    // Set up global error handlers
    setupGlobalErrorHandlers();

    // Load stored errors
    loadStoredErrors();

    // Set up periodic error reporting
    const reportInterval = setInterval(() => {
      reportErrorsToBackend();
    }, 60000); // Report every minute

    return () => clearInterval(reportInterval);
  }, [isReporting, setupGlobalErrorHandlers, reportErrorsToBackend]);

  // Load stored errors
  const loadStoredErrors = async () => {
    try {
      const storedErrors = await AsyncStorage.getItem('error_reports');
      if (storedErrors) {
        const errors = JSON.parse(storedErrors);
        setErrors(errors);

        // Update stats
        const stats = errors.reduce(
          (acc: any, error: any) => ({
            totalErrors: acc.totalErrors + 1,
            criticalErrors:
              acc.criticalErrors + (error.severity === SEVERITY_LEVELS.CRITICAL ? 1 : 0),
            networkErrors: acc.networkErrors + (error.type === ERROR_TYPES.NETWORK ? 1 : 0),
            apiErrors: acc.apiErrors + (error.type === ERROR_TYPES.API ? 1 : 0),
          }),
          { totalErrors: 0, criticalErrors: 0, networkErrors: 0, apiErrors: 0 }
        );

        setErrorStats((prev: ErrorStats) => ({ ...prev, ...stats }));
      }
    } catch (error) {
      console.error('Failed to load stored errors:', error);
    }
  };

  // Show error notification
  const showErrorNotification = (error: ErrorReport) => {
    // In a real app, this would show a user-friendly notification
    console.warn('🚨 Critical error occurred:', error.message);

    // You could integrate with a notification system here
    // showToast('An error occurred. The app may not function correctly.', 'error');
  };

  // Clear errors
  const clearErrors = async () => {
    setErrors([]);
    setErrorStats({
      totalErrors: 0,
      criticalErrors: 0,
      networkErrors: 0,
      apiErrors: 0,
      lastError: null,
    });
    await AsyncStorage.removeItem('error_reports');
  };

  // Set online status
  const setOnlineStatus = (online: boolean) => {
    setIsOnline(online);

    if (online) {
      // Report pending errors when coming back online
      reportErrorsToBackend();
    }
  };

  const value = {
    errors,
    errorStats,
    isOnline,
    isReporting,
    setIsReporting,
    reportError,
    clearErrors,
    setOnlineStatus,
  };

  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>;
}

// Hook to use error reporting
export function useErrorReporting() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorReporting must be used within an ErrorReportingProvider');
  }
  return context;
}

// Error boundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  reportError?: (error: any) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Report the error
    const { reportError } = this.props;
    if (reportError) {
      reportError({
        type: ERROR_TYPES.CRITICAL,
        severity: SEVERITY_LEVELS.CRITICAL,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        context: 'react_error_boundary',
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            🚨 Something went wrong
          </Text>
          <Text style={{ fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
            The app encountered an unexpected error. We've been notified and are working on a fix.
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === 'web') {
                window.location.reload();
              }
            }}
            style={{
              backgroundColor: '#007AFF',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Error handling utilities
export const ErrorUtils = {
  // Create standardized error object
  createError: (
    type: string,
    message: string,
    severity = SEVERITY_LEVELS.MEDIUM,
    context: any = null
  ) => ({
    type,
    message,
    severity,
    context,
    timestamp: Date.now(),
  }),

  // Handle API errors - Caller must provide reportError function
  handleApiError: (reportError: Function, error: any, endpoint: string) => {
    const errorData = {
      type: ERROR_TYPES.API,
      severity: error.response?.status >= 500 ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
      message: error.message || 'API request failed',
      endpoint,
      status: error.response?.status,
      context: 'api_call',
    };

    reportError(errorData);
  },

  // Handle network errors
  handleNetworkError: (reportError: Function, error: any, operation: string) => {
    const errorData = {
      type: ERROR_TYPES.NETWORK,
      severity: SEVERITY_LEVELS.MEDIUM,
      message: error.message || 'Network operation failed',
      operation,
      context: 'network_operation',
    };

    reportError(errorData);
  },

  // Handle validation errors
  handleValidationError: (reportError: Function, errors: string[], field: string) => {
    const errorData = {
      type: ERROR_TYPES.VALIDATION,
      severity: SEVERITY_LEVELS.LOW,
      message: `Validation failed for ${field}: ${errors.join(', ')}`,
      field,
      errors,
      context: 'form_validation',
    };

    reportError(errorData);
  },

  // Handle performance errors
  handlePerformanceError: (
    reportError: Function,
    metric: string,
    threshold: number,
    actual: number
  ) => {
    const errorData = {
      type: ERROR_TYPES.PERFORMANCE,
      severity: SEVERITY_LEVELS.MEDIUM,
      message: `Performance threshold exceeded: ${metric} (${actual}ms > ${threshold}ms)`,
      metric,
      threshold,
      actual,
      context: 'performance_monitoring',
    };

    reportError(errorData);
  },

  // Wrap async functions with error handling - Caller must provide reportError
  withErrorHandling: (reportError: Function, fn: Function, context: any = null) => {
    return async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error: any) {
        const errorData = {
          type: ERROR_TYPES.CRITICAL,
          severity: SEVERITY_LEVELS.HIGH,
          message: error.message || 'Async function failed',
          stack: error.stack,
          context: context || 'async_function',
        };

        reportError(errorData);
        throw error;
      }
    };
  },

  // Check error health
  getErrorHealth: (errorStats: ErrorStats) => {
    const health = {
      status: 'healthy',
      score: 100,
      recommendations: [] as string[],
    };

    // Deduct points for errors
    if (errorStats.criticalErrors > 0) {
      health.score -= 50;
      health.status = 'critical';
      health.recommendations.push('Critical errors detected. Immediate attention required.');
    }

    if (errorStats.totalErrors > 10) {
      health.score -= 20;
      if (health.status === 'healthy') health.status = 'warning';
      health.recommendations.push('High error rate detected. Review error patterns.');
    }

    if (errorStats.networkErrors > 5) {
      health.score -= 15;
      health.recommendations.push('Multiple network errors. Check connectivity and API endpoints.');
    }

    if (errorStats.apiErrors > 5) {
      health.score -= 15;
      health.recommendations.push('API errors detected. Review API integration.');
    }

    return health;
  },
};

export default ErrorContext;

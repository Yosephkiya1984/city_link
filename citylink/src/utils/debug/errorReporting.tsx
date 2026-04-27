import React, { createContext, useState, useCallback, useEffect, useContext } from 'react';
import { Platform, View, Text, TouchableOpacity } from 'react-native';
import { SecurePersist } from '../../store/SecurePersist';
import { getClient } from '../../services/supabase';
import { uid } from '../../utils';

export interface ErrorReport {
  id: string;
  type: string;
  severity: string;
  message: string;
  stack?: string;
  timestamp: number;
  url?: string;
  userAgent?: string;
  context?: any;
  metadata?: any;
  componentStack?: string;
}

export interface ErrorStats {
  totalErrors: number;
  criticalErrors: number;
  lastError: ErrorReport | null;
}

export interface ErrorContextValue {
  errors: ErrorReport[];
  errorStats: ErrorStats;
  isOnline: boolean;
  reportError: (error: Partial<ErrorReport>) => void;
  clearErrors: () => Promise<void>;
  setOnlineStatus: (online: boolean) => void;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

export function ErrorReportingProvider({ children }: { children: React.ReactNode }) {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [errorStats, setErrorStats] = useState<ErrorStats>({
    totalErrors: 0,
    criticalErrors: 0,
    lastError: null,
  });

  const storeErrors = useCallback(async (newErrors: ErrorReport[]) => {
    try {
      await SecurePersist.setItem('client_error_reports', JSON.stringify(newErrors));
    } catch (e) {
      console.error('[ErrorService] Failed to persist errors:', e);
    }
  }, []);

  const reportError = useCallback(
    (errorData: Partial<ErrorReport>) => {
      const error: ErrorReport = {
        id: uid(),
        timestamp: Date.now(),
        type: 'generic',
        severity: 'medium',
        message: 'Unknown error',
        ...errorData,
      };

      setErrors((prev) => {
        const updated = [...prev, error].slice(-50); // Keep last 50
        storeErrors(updated);
        return updated;
      });

      setErrorStats((prev) => ({
        totalErrors: prev.totalErrors + 1,
        criticalErrors: prev.criticalErrors + (error.severity === 'critical' ? 1 : 0),
        lastError: error,
      }));

      if (__DEV__) console.error('[CityLink Error]', error);
    },
    [storeErrors]
  );

  const syncWithBackend = useCallback(async () => {
    if (!isOnline || errors.length === 0) return;
    const client = getClient();
    if (!client) return;

    try {
      const { error: rpcErr } = await client.rpc('log_client_errors', { p_errors: errors });
      if (!rpcErr) {
        setErrors([]);
        await SecurePersist.deleteItem('client_error_reports');
      }
    } catch (e) {
      console.error('[ErrorService] Sync failed:', e);
    }
  }, [isOnline, errors]);

  useEffect(() => {
    const load = async () => {
      const stored = await SecurePersist.getItem('client_error_reports');
      if (stored) setErrors(JSON.parse(stored));
    };
    load();

    const interval = setInterval(syncWithBackend, 30000); // Sync every 30s
    return () => clearInterval(interval);
  }, [syncWithBackend]);

  return (
    <ErrorContext.Provider
      value={{
        errors,
        errorStats,
        isOnline,
        reportError,
        setOnlineStatus: setIsOnline,
        clearErrors: async () => {
          setErrors([]);
          await SecurePersist.deleteItem('client_error_reports');
        },
      }}
    >
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorReporting() {
  const context = useContext(ErrorContext);
  if (!context) throw new Error('useErrorReporting must be used within ErrorReportingProvider');
  return context;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            backgroundColor: '#050a10',
          }}
        >
          <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold', marginBottom: 10 }}>
            🚨 System Alert
          </Text>
          <Text style={{ color: '#8b949e', textAlign: 'center', marginBottom: 30 }}>
            An unexpected error has occurred. The system has been locked for your security.
          </Text>
          <TouchableOpacity
            onPress={() => Platform.OS === 'web' && window.location.reload()}
            style={{
              backgroundColor: '#007AFF',
              paddingHorizontal: 30,
              paddingVertical: 15,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reload Application</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

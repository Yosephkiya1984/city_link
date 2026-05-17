import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseStorageAdapter } from './storage.adapter';
import { Config, ConfigUtils } from '../config';

// ── Connection Status Types ──────────────────────────────────────────────────
interface ConnectionStatus {
  isConnected: boolean;
  lastConnected: Date | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  latency: number | null;
  lastValidationAttempt: Date | null;
  consecutiveFailures: number;
  uptime: number; // in milliseconds
  lastError: string | null;
}

interface ConnectionHealthMetrics {
  averageLatency: number;
  successRate: number;
  totalRequests: number;
  failedRequests: number;
  uptimePercentage: number;
  lastHealthCheck: Date;
}

// ── Connection Health Monitoring ─────────────────────────────────────────────
class ConnectionHealthMonitor {
  private metrics: ConnectionHealthMetrics;
  private latencyHistory: number[] = [];
  private maxHistorySize = 50;
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
    this.metrics = {
      averageLatency: 0,
      successRate: 100,
      totalRequests: 0,
      failedRequests: 0,
      uptimePercentage: 100,
      lastHealthCheck: new Date()
    };
  }

  recordRequest(latency: number, success: boolean): void {
    this.metrics.totalRequests++;
    this.metrics.lastHealthCheck = new Date();

    if (success) {
      this.latencyHistory.push(latency);
      if (this.latencyHistory.length > this.maxHistorySize) {
        this.latencyHistory.shift();
      }
      this.updateAverageLatency();
    } else {
      this.metrics.failedRequests++;
    }

    this.updateSuccessRate();
    this.updateUptimePercentage();
  }

  private updateAverageLatency(): void {
    if (this.latencyHistory.length > 0) {
      const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
      this.metrics.averageLatency = sum / this.latencyHistory.length;
    }
  }

  private updateSuccessRate(): void {
    if (this.metrics.totalRequests > 0) {
      const successfulRequests = this.metrics.totalRequests - this.metrics.failedRequests;
      this.metrics.successRate = (successfulRequests / this.metrics.totalRequests) * 100;
    }
  }

  private updateUptimePercentage(): void {
    const now = new Date();
    const totalTime = now.getTime() - this.startTime.getTime();
    const downtime = this.metrics.failedRequests * 1000; // Assume 1s downtime per failure
    this.metrics.uptimePercentage = Math.max(0, ((totalTime - downtime) / totalTime) * 100);
  }

  getMetrics(): ConnectionHealthMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.startTime = new Date();
    this.latencyHistory = [];
    this.metrics = {
      averageLatency: 0,
      successRate: 100,
      totalRequests: 0,
      failedRequests: 0,
      uptimePercentage: 100,
      lastHealthCheck: new Date()
    };
  }
}

// ── Client Initialization ─────────────────────────────────────────────────────
let _client: SupabaseClient | null = null;
let _connectionStatus: ConnectionStatus = {
  isConnected: false,
  lastConnected: null,
  connectionQuality: 'offline',
  latency: null,
  lastValidationAttempt: null,
  consecutiveFailures: 0,
  uptime: 0,
  lastError: null
};
let _healthMonitor: ConnectionHealthMonitor = new ConnectionHealthMonitor();

export function hasSupabase(): boolean {
  return getClient() != null;
}

export function getClient(): SupabaseClient | null {
  if (_client) return _client;

  // Use enhanced configuration validation
  if (!ConfigUtils.isSupabaseConfigured()) {
    if (__DEV__) {
      console.warn('[CityLink] Supabase configuration is invalid:');
      ConfigUtils.getSupabaseValidationErrors().forEach(error => {
        const logFn = error.severity === 'error' ? console.error : console.warn;
        logFn(`  ${error.severity.toUpperCase()}: ${error.field} - ${error.message}`);
      });
    }
    return null;
  }

  try {
    const supabaseConfig = Config.supabase;
    
    const options = {
      auth: {
        storage: SupabaseStorageAdapter,
        ...supabaseConfig.options.auth
      },
      global: {
        headers: supabaseConfig.options.global.headers
      },
      realtime: supabaseConfig.options.realtime
    };

    _client = createClient(supabaseConfig.url, supabaseConfig.anonKey, options);

    // Add RPC tracing in development
    if (__DEV__) {
      const originalRpc = _client.rpc.bind(_client);
      (_client as any).rpc = async (fnName: string, args?: any, opts?: any) => {
        if (Config.devMode) console.log(`[RPC Trace] ${fnName}`);
        return originalRpc(fnName, args, opts);
      };
    }

    if (__DEV__) {
      console.log(`[CityLink] Supabase client initialized for ${supabaseConfig.environment} environment`);
    }

    return _client;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[CityLink] Supabase client initialization failed:', msg);
    return null;
  }
}

// ── Connection Validation ─────────────────────────────────────────────────────
export async function validateConnection(): Promise<boolean> {
  const now = new Date();
  _connectionStatus.lastValidationAttempt = now;

  const client = getClient();
  if (!client) {
    const errorMsg = 'No Supabase client available';
    _connectionStatus = {
      ..._connectionStatus,
      isConnected: false,
      connectionQuality: 'offline',
      latency: null,
      consecutiveFailures: _connectionStatus.consecutiveFailures + 1,
      lastError: errorMsg
    };
    _healthMonitor.recordRequest(0, false);
    return false;
  }

  try {
    const startTime = Date.now();
    
    // Test basic connection with a simple query
    const { error } = await client
      .from('profiles')
      .select('count')
      .limit(1);
    
    const latency = Date.now() - startTime;
    
    if (error) {
      const errorMsg = error.message || 'Unknown connection error';
      if (__DEV__) {
        console.warn('[CityLink] Connection validation failed:', errorMsg);
      }
      
      _connectionStatus = {
        ..._connectionStatus,
        isConnected: false,
        connectionQuality: 'offline',
        latency: null,
        consecutiveFailures: _connectionStatus.consecutiveFailures + 1,
        lastError: errorMsg
      };
      _healthMonitor.recordRequest(latency, false);
      return false;
    }

    // Determine connection quality based on latency
    let quality: ConnectionStatus['connectionQuality'] = 'excellent';
    if (latency > 2000) quality = 'poor';
    else if (latency > 1000) quality = 'good';

    // Calculate uptime
    const uptime = _connectionStatus.lastConnected 
      ? now.getTime() - _connectionStatus.lastConnected.getTime()
      : 0;

    _connectionStatus = {
      ..._connectionStatus,
      isConnected: true,
      lastConnected: now,
      connectionQuality: quality,
      latency,
      consecutiveFailures: 0,
      uptime: uptime,
      lastError: null
    };

    _healthMonitor.recordRequest(latency, true);

    if (__DEV__) {
      console.log(`[CityLink] Connection validated - Quality: ${quality}, Latency: ${latency}ms`);
    }

    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (__DEV__) {
      console.error('[CityLink] Connection validation error:', msg);
    }
    
    _connectionStatus = {
      ..._connectionStatus,
      isConnected: false,
      connectionQuality: 'offline',
      latency: null,
      consecutiveFailures: _connectionStatus.consecutiveFailures + 1,
      lastError: msg
    };
    _healthMonitor.recordRequest(0, false);
    return false;
  }
}

// ── Client Management ─────────────────────────────────────────────────────────
export function getConnectionStatus(): ConnectionStatus {
  return { ..._connectionStatus };
}

export function getConnectionHealthMetrics(): ConnectionHealthMetrics {
  return _healthMonitor.getMetrics();
}

export async function reinitialize(): Promise<void> {
  if (__DEV__) {
    console.log('[CityLink] Reinitializing Supabase client...');
  }
  
  // Perform cleanup first
  await cleanup();
  
  // Reset state
  _connectionStatus = {
    isConnected: false,
    lastConnected: null,
    connectionQuality: 'offline',
    latency: null,
    lastValidationAttempt: null,
    consecutiveFailures: 0,
    uptime: 0,
    lastError: null
  };
  
  // Reset health monitor
  _healthMonitor.reset();
  
  // Reinitialize client
  const client = getClient();
  if (client) {
    await validateConnection();
    if (__DEV__) {
      console.log('[CityLink] Supabase client reinitialized successfully');
    }
  } else {
    if (__DEV__) {
      console.warn('[CityLink] Failed to reinitialize Supabase client');
    }
  }
}

export async function cleanup(): Promise<void> {
  if (__DEV__) {
    console.log('[CityLink] Cleaning up Supabase client resources...');
  }

  // Remove all active channels/subscriptions
  if (_client) {
    try {
      // Get all channels and remove them
      const channels = (_client as any).getChannels?.() || [];
      for (const channel of channels) {
        await _client.removeChannel(channel);
      }
      
      if (__DEV__ && channels.length > 0) {
        console.log(`[CityLink] Cleaned up ${channels.length} active channels`);
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('[CityLink] Error during channel cleanup:', err);
      }
    }
  }

  // Clear client reference
  _client = null;
  
  if (__DEV__) {
    console.log('[CityLink] Supabase client cleanup completed');
  }
}

export function isClientInitialized(): boolean {
  return _client !== null;
}

export function getClientInfo(): { initialized: boolean; hasValidConfig: boolean; environment: string } {
  return {
    initialized: _client !== null,
    hasValidConfig: ConfigUtils.isSupabaseConfigured(),
    environment: Config.supabase.environment
  };
}

// ── Core Query Wrapper ────────────────────────────────────────────────────────
interface SupaQueryOptions {
  isSilent?: boolean;
}

/**
 * supaQuery — Centralized wrapper for error handling and logging.
 * Returns a typed object with data and error.
 */
export async function supaQuery<T = unknown>(
  queryFn: (
    client: SupabaseClient
  ) => PromiseLike<{ data: T | null; error: any; count?: number | null }>,
  options: SupaQueryOptions = {}
): Promise<{ data: T | null; count?: number | null; error: string | null }> {
  const client = getClient();
  if (!client) {
    if (Config.devMode) console.warn('[CityLink] No Supabase client available.');
    return { data: null, error: 'no-credentials' };
  }
  try {
    const result = await queryFn(client);
    if (result.error) {
      const msg = result.error.message || String(result.error);
      if (Config.devMode && !options.isSilent) {
        console.error(`[CityLink] Supabase Error:`, msg);
      }
      return { data: null, error: msg };
    }
    return { data: result.data, count: result.count, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (Config.devMode) console.error(`[CityLink] unexpected query error:`, msg);
    return { data: null, error: msg };
  }
}

// ── Realtime ──────────────────────────────────────────────────────────────────

export type RealtimeChannel = ReturnType<SupabaseClient['channel']>;

export function subscribeToTable<T extends { [key: string]: any } = any>(
  channelName: string,
  table: string,
  filter: string | null,
  callback: (payload: any) => void
): RealtimeChannel | null {
  const client = getClient();
  if (!client || !table) return null;
  const opts: { event: string; schema: string; table: string; filter?: string } = {
    event: '*',
    schema: 'public',
    table,
  };
  if (filter) opts.filter = filter;

  return client
    .channel(channelName)
    .on('postgres_changes' as any, opts, callback as any)
    .subscribe();
}

export function unsubscribe(channel: RealtimeChannel | null) {
  const client = getClient();
  if (client && channel) {
    client.removeChannel(channel);
  }
}

// ── Backward Compatibility ─────────────────────────────────────────────────────
// Aggregate exports removed to break circular dependencies.
// Please import domain services directly (e.g. from './auth.service').

export default {
  hasSupabase,
  supaQuery,
  getClient,
};

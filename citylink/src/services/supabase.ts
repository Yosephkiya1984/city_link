import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../config';

// ── Client Initialization ─────────────────────────────────────────────────────
let _client: SupabaseClient | null = null;

export function hasSupabase(): boolean {
  return getClient() != null;
}

export function getClient(): SupabaseClient | null {
  if (_client) return _client;

  const url = (Config.supaUrl || '').trim();
  const key = (Config.supaKey || '').trim();

  if (!url || url.startsWith('REPLACE') || !key || key.startsWith('REPLACE')) {
    return null;
  }

  try {
    const options = {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: { 'x-application-name': 'citylink-mobile' },
      },
    };

    _client = createClient(url, key, options);
    return _client;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[CityLink] Supabase init failed:', msg);
    return null;
  }
}

// ── Core Query Wrapper ────────────────────────────────────────────────────────
interface SupaQueryOptions {
  isSilent?: boolean;
}

/**
 * supaQuery — Centralized wrapper for error handling and logging.
 * Returns a typed object with data and error.
 */
export async function supaQuery<T>(
  queryFn: (client: SupabaseClient) => PromiseLike<{ data: T | null; error: any; count?: number | null }>,
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
    table 
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

/** @deprecated Use getClient() directly. This getter exists only for backward compatibility. */
export const supabase = new Proxy({} as NonNullable<ReturnType<typeof getClient>>, {
  get(_target, prop) {
    const client = getClient();
    if (!client) {
      console.warn(`[CityLink] supabase.${String(prop)} called but no client available.`);
      return undefined;
    }
    return (client as unknown as Record<string, unknown>)[prop as string];
  },
});

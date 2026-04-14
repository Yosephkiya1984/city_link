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
  } catch (e: any) {
    console.warn('[CityLink] Supabase init failed:', e.message);
    return null;
  }
}

// ── Core Query Wrapper ────────────────────────────────────────────────────────
interface SupaQueryOptions {
  isSilent?: boolean;
}

/**
 * supaQuery — Centralized wrapper for error handling and logging.
 */
export async function supaQuery<T = any>(
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
      if (Config.devMode && !options.isSilent) {
        console.error(`[CityLink] Supabase Error:`, result.error.message);
      }
      return { data: null, error: result.error.message };
    }
    return { data: result.data, count: result.count, error: null };
  } catch (e: any) {
    return { data: null, error: String(e?.message || e) };
  }
}

// ── Realtime ──────────────────────────────────────────────────────────────────
export function subscribeToTable(
  channelName: string,
  table: string,
  filter: string | null,
  callback: (payload: any) => void
) {
  const client = getClient();
  if (!client || !table) return null;
  const opts: { event: string; schema: string; table: string; filter?: string } = { event: '*', schema: 'public', table };
  if (filter) opts.filter = filter;
  return client.channel(channelName).on('postgres_changes' as any, opts, callback).subscribe();
}

export function unsubscribe(channel: any) {
  const client = getClient();
  if (client && channel) client.removeChannel(channel);
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

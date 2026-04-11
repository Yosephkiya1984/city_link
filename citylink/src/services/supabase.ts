import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../config';

// ── Client Initialization ─────────────────────────────────────────────────────
let _client = null;

export function hasSupabase() {
  return getClient() != null;
}

export function getClient() {
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
  } catch (e) {
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
export async function supaQuery(
  queryFn: (client: any) => Promise<any>,
  options: SupaQueryOptions = {}
) {
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
  } catch (e) {
    return { data: null, error: String((e as any)?.message || e) };
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
  const opts: any = { event: '*', schema: 'public', table };
  if (filter) opts.filter = filter;
  return client.channel(channelName).on('postgres_changes', opts, callback).subscribe();
}

export function unsubscribe(channel) {
  const client = getClient();
  if (client && channel) client.removeChannel(channel);
}

// ── Backward Compatibility ─────────────────────────────────────────────────────
// ── Backward Compatibility ─────────────────────────────────────────────────────
// Aggregate exports removed to break circular dependencies.
// Please import domain services directly (e.g. from './auth.service').

export default {
  hasSupabase,
  supaQuery,
  getClient,
};

export const supabase = getClient();

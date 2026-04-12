import { supaQuery } from './supabase';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * DataEngine — Centralized production-grade query bank.
 * This file eliminates query scattering and enforces global data modeling rules.
 */

// ── Shared Types ─────────────────────────────────────────────────────────────

export interface QueryResult<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

// ── Engine Definition ─────────────────────────────────────────────────────────

export const DataEngine = {
  
  // ── Profiles & Users ──
  
  profiles: {
    get: (id: string) => 
      supaQuery((c) => c.from('profiles').select('*').eq('id', id).maybeSingle()),
    
    update: (id: string, updates: any) =>
      supaQuery((c) => c.from('profiles').update(updates).eq('id', id)),
  },

  // ── Wallet & Financial ──
  
  wallets: {
    get: (userId: string) =>
      supaQuery((c) => c.from('wallets').select('*').eq('user_id', userId).maybeSingle()),
    
    getTransactions: (walletId: string, limit = 20) =>
      supaQuery((c) => 
        c.from('transactions')
         .select('*')
         .eq('wallet_id', walletId)
         .order('created_at', { ascending: false })
         .limit(limit)
      ),
  },

  // ── Marketplace & Orders ──

  marketplace: {
    getListings: (category?: string) => {
      return supaQuery((c: any) => {
        let q = c.from('marketplace_listings').select('*, profiles(full_name)');
        if (category && category !== 'All') {
          return q.eq('category', category);
        }
        return q;
      });
    },

    getOrder: (orderId: string) =>
      supaQuery((c) => 
        c.from('marketplace_orders')
         .select('*, merchant:profiles!merchant_id(full_name), buyer:profiles!buyer_id(full_name)')
         .eq('id', orderId)
         .maybeSingle()
      ),
  },

  // ── Ekub ──

  ekub: {
    getGroups: () =>
      supaQuery((c) => c.from('ekub_groups').select('*').eq('is_active', true)),
    
    getMemberStatus: (groupId: string, userId: string) =>
      supaQuery((c) => 
        c.from('ekub_members')
         .select('*')
         .eq('group_id', groupId)
         .eq('user_id', userId)
         .maybeSingle()
      ),
  },

  // ── Delivery ──

  delivery: {
    getAgent: (id: string) =>
      supaQuery((c) => c.from('delivery_agents').select('*').eq('id', id).maybeSingle()),
    
    getActiveJobs: (agentId: string) =>
      supaQuery((c) => 
        c.from('marketplace_orders')
         .select('*')
         .eq('agent_id', agentId)
         .in('status', ['AGENT_ASSIGNED', 'SHIPPED', 'IN_TRANSIT'])
      ),
  },
};

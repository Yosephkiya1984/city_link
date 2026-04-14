import { supaQuery } from './supabase';
import { User, Wallet, Transaction, MarketplaceOrder, EkubGroup, DeliveryAgent, Product, PropertyListing } from '../types';

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
      supaQuery<User>((c) => c.from('profiles').select('*').eq('id', id).maybeSingle()),
    
    update: (id: string, updates: Partial<User>) =>
      supaQuery<User>((c) => c.from('profiles').update(updates).eq('id', id).select().single()),
  },

  // ── Wallet & Financial ──
  
  wallets: {
    get: (userId: string) =>
      supaQuery<Wallet>((c) => c.from('wallets').select('*').eq('user_id', userId).maybeSingle()),
    
    getTransactions: (walletId: string, limit = 20) =>
      supaQuery<Transaction[]>((c) => 
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
      return supaQuery<Product[]>((c) => {
        let q = c.from('products').select('*, profiles(id, full_name, business_name, merchant_name)');
        if (category && category !== 'All') {
          return q.eq('category', category) as any; // Cast needed due to complex return type in select
        }
        return q as any;
      });
    },

    getOrder: (orderId: string) =>
      supaQuery<MarketplaceOrder>((c) => 
        c.from('marketplace_orders')
         .select('*, merchant:profiles!merchant_id(full_name), buyer:profiles!buyer_id(full_name)')
         .eq('id', orderId)
         .maybeSingle()
      ),
  },

  // ── Ekub ──

  ekub: {
    getGroups: () =>
      supaQuery<EkubGroup[]>((c) => c.from('ekubs').select('*').neq('status', 'COMPLETE')),
    
    getMemberStatus: (groupId: string, userId: string) =>
      supaQuery<{ id: string; status: string }>((c) => 
        c.from('ekub_members')
         .select('*')
         .eq('ekub_id', groupId)
         .eq('user_id', userId)
         .maybeSingle()
      ),
  },

  // ── Delivery ──

  delivery: {
    getAgent: (id: string) =>
      supaQuery<DeliveryAgent>((c) => c.from('delivery_agents').select('*').eq('id', id).maybeSingle()),
    
    getActiveJobs: (agentId: string) =>
      supaQuery<MarketplaceOrder[]>((c) => 
        c.from('marketplace_orders')
         .select('*')
         .eq('agent_id', agentId)
         .in('status', ['AGENT_ASSIGNED', 'SHIPPED', 'IN_TRANSIT'])
      ),
  },
};

import { getClient, supaQuery } from './supabase';
import { User, DeliveryAgent, MarketplaceOrder, FoodOrder, ParkingSession, DeliveryDispatch, PropertyListing } from '../types';

/**
 * fetchPendingMerchants — fetches merchants awaiting KYC approval.
 */
export async function fetchPendingMerchants() {
  return supaQuery<User[]>((c) =>
    c
      .from('profiles')
      .select('*')
      .eq('role', 'merchant')
      .eq('kyc_status', 'PENDING')
      .order('created_at', { ascending: false })
  );
}

/**
 * approveMerchant — approves a merchant's KYC and status.
 */
export async function approveMerchant(merchantId: string) {
  if (!merchantId) return { data: null, error: 'No merchant ID provided' };

  return supaQuery<User>((c) =>
    c
      .from('profiles')
      .update({
        kyc_status: 'VERIFIED',
        merchant_status: 'APPROVED',
      })
      .eq('id', merchantId)
      .select()
      .single()
  );
}

/**
 * rejectMerchant — rejects a merchant's application with a reason.
 */
export async function rejectMerchant(merchantId: string, reason: string) {
  return supaQuery<User>((c) =>
    c
      .from('profiles')
      .update({
        kyc_status: 'REJECTED',
        is_verified: false,
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', merchantId)
      .select()
      .single()
  );
}

/**
 * approveAgent — approves a delivery agent in both profiles and delivery_agents tables.
 * Uses upsert for delivery_agents to handle missing records.
 */
export async function approveAgent(agentOrId: string | DeliveryAgent) {
  const agentId = typeof agentOrId === 'object' ? agentOrId.id : agentOrId;
  const agentData = typeof agentOrId === 'object' ? agentOrId : null;

  if (!agentId) return { error: 'No agent ID provided' };

  // 1. Update or Create delivery_agents record
  const agentUpdate: Partial<DeliveryAgent> = {
    id: agentId,
    agent_status: 'APPROVED',
  };

  if (agentData) {
    if (agentData.vehicle_type) agentUpdate.vehicle_type = agentData.vehicle_type;
    if (agentData.license_number) agentUpdate.license_number = agentData.license_number;
    if (agentData.plate_number) agentUpdate.plate_number = agentData.plate_number;
  }

  const res1 = await supaQuery<DeliveryAgent>((c) =>
    c.from('delivery_agents').upsert(agentUpdate, { onConflict: 'id' }).select().single()
  );

  if (res1.error) {
    const errorMsg = String(res1.error);
    const isRLS = errorMsg.includes('RLS') || errorMsg.includes('row-level security policy');
    if (isRLS) {
      return {
        error: 'Database access denied (RLS) on delivery_agents. Please run the admin SQL policy fix.',
      };
    }
    return { error: `Delivery Agent update failed: ${res1.error}` };
  }

  const rows1 = res1.data && Array.isArray(res1.data) ? res1.data.length : (res1.data ? 1 : 0);
  if (rows1 === 0) {
    return {
      error: 'Failed to update delivery_agents table. Ensure the record exists or RLS allows upsert.',
    };
  }

  // 2. Verify the profile
  const res2 = await supaQuery<User>((c) =>
    c.from('profiles').update({ kyc_status: 'VERIFIED' }).eq('id', agentId).select().single()
  );

  if (res2.error) return { error: `Profile update failed: ${res2.error}` };
  const rows2 = res2.data && Array.isArray(res2.data) ? res2.data.length : (res2.data ? 1 : 0);

  console.log(`[CityLink] approveAgent rows affected: delivery_agents=${rows1}, profiles=${rows2}`);

  if (rows2 === 0) {
    return { error: 'Failed to update profiles table. Ensure the agent has an active profile.' };
  }

  return { error: null };
}

/**
 * rejectAgent — rejects a delivery agent in both profiles and delivery_agents tables.
 */
export async function rejectAgent(agentId: string, reason: string) {
  if (!agentId) return { error: 'No agent ID provided' };

  // 1. Update delivery_agents first
  const res1 = await supaQuery<DeliveryAgent>((c) =>
    c.from('delivery_agents').update({ agent_status: 'REJECTED' }).eq('id', agentId).select().single()
  );

  if (res1.error) return { error: res1.error };
  const rows1 = res1.data && Array.isArray(res1.data) ? res1.data.length : (res1.data ? 1 : 0);

  if (rows1 === 0) {
    return { error: 'Agent record not found or access denied (RLS).' };
  }

  // 2. Update profile
  const res2 = await supaQuery<User>((c) =>
    c
      .from('profiles')
      .update({
        kyc_status: 'REJECTED',
        rejection_reason: reason,
      })
      .eq('id', agentId)
      .select()
      .single()
  );

  if (res2.error) return { error: res2.error };
  const rows2 = res2.data && Array.isArray(res2.data) ? res2.data.length : (res2.data ? 1 : 0);

  console.log(`[CityLink] rejectAgent rows affected: delivery_agents=${rows1}, profiles=${rows2}`);

  if (rows2 === 0) {
    return { error: 'Failed to update the agent profile record.' };
  }

  return { error: null };
}

export interface AdminStats {
  identities: number;
  revenue: number;
  deliveries: number;
  realEstate: number;
  parking: number;
  openDisputes: number;
}

export const fetchAdminLiveStats = async (): Promise<{ data: AdminStats; error?: string }> => {
  try {
    const [
      profilesRes,
      mktOrdersRes,
      foodOrdersRes,
      deliveryRes,
      listingsRes,
      parkingRes,
      disputeMktRes,
      disputeFoodRes,
    ] = await Promise.all([
      supaQuery<{id: string}[]>((c) => c.from('profiles').select('id', { count: 'exact', head: true })),
      supaQuery<{ total: number }[]>((c) => c.from('marketplace_orders').select('total')),
      supaQuery<{ total: number }[]>((c) => c.from('food_orders').select('total')),
      supaQuery<{id: string}[]>((c) => c.from('delivery_dispatches').select('id', { count: 'exact', head: true })),
      supaQuery<{id: string}[]>((c) => c.from('property_listings').select('id', { count: 'exact', head: true })),
      supaQuery<{id: string}[]>((c) => c.from('parking_sessions').select('id', { count: 'exact', head: true })),
      supaQuery<{id: string}[]>((c) =>
        c
          .from('marketplace_orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'DISPUTED')
      ),
      supaQuery<{id: string}[]>((c) =>
        c.from('food_orders').select('id', { count: 'exact', head: true }).eq('status', 'DISPUTED')
      ),
    ]);

    const mktRevenue = (mktOrdersRes.data || []).reduce(
      (acc, o) => acc + (Number(o.total) || 0),
      0
    );
    const foodRevenue = (foodOrdersRes.data || []).reduce(
      (acc, o) => acc + (Number(o.total) || 0),
      0
    );
    
    return {
      data: {
        identities: profilesRes.count || 0,
        revenue: mktRevenue + foodRevenue,
        deliveries: deliveryRes.count || 0,
        realEstate: listingsRes.count || 0,
        parking: parkingRes.count || 0,
        openDisputes: (disputeMktRes.count || 0) + (disputeFoodRes.count || 0),
      },
    };
  } catch (e: any) {
    console.error('🔧 fetchAdminLiveStats crash:', e);
    return {
      data: { identities: 0, revenue: 0, deliveries: 0, realEstate: 0, parking: 0, openDisputes: 0 },
      error: e.message,
    };
  }
};

/**
 * subscribeToGlobalEvents — establishes realtime subscription for critical events.
 */
export const subscribeToGlobalEvents = (callback: (data: { type: string; payload: any }) => void) => {
  const client = getClient();
  if (!client) return null;

  return client
    .channel('global_admin_updates')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'marketplace_orders' },
      (payload) => callback({ type: 'ORDER', payload })
    )
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) =>
      callback({ type: 'PROFILE', payload })
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'marketplace_orders',
        filter: 'status=eq.DISPUTED',
      },
      (payload) => callback({ type: 'DISPUTE', payload })
    )
    .subscribe();
};

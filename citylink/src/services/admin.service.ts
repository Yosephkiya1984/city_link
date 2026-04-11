import { getClient, supaQuery } from './supabase';

/**
 * fetchPendingMerchants — fetches merchants awaiting KYC approval.
 */
export async function fetchPendingMerchants() {
  return supaQuery((c) =>
    c.from('profiles').select('*').eq('role', 'merchant').eq('kyc_status', 'PENDING').order('created_at', { ascending: false })
  );
}

/**
 * approveMerchant — approves a merchant's KYC and status.
 */
export async function approveMerchant(merchantId) {
  if (!merchantId) return { data: null, error: 'No merchant ID provided' };
  
  const res = await supaQuery((c) =>
    c.from('profiles')
      .update({ 
        kyc_status: 'VERIFIED',
        merchant_status: 'APPROVED'
      })
      .eq('id', merchantId)
      .select()
  );
  
  if (!res.error && (!res.data || res.data.length === 0)) {
    return { data: null, error: 'Database access denied (RLS). You cannot update this merchant.' };
  }
  return res;
}

/**
 * rejectMerchant — rejects a merchant's application with a reason.
 */
export async function rejectMerchant(merchantId, reason) {
  return supaQuery((c) =>
    c.from('profiles').update({ 
      kyc_status: 'REJECTED', 
      is_verified: false,
      rejection_reason: reason,
      updated_at: new Date().toISOString() 
    }).eq('id', merchantId)
  );
}

/**
 * approveAgent — approves a delivery agent in both profiles and delivery_agents tables.
 * Uses upsert for delivery_agents to handle missing records.
 */
export async function approveAgent(agentOrId: any) {
  const agentId = typeof agentOrId === 'object' ? agentOrId.id : agentOrId;
  const agentData = typeof agentOrId === 'object' ? agentOrId : null;

  if (!agentId) return { error: 'No agent ID provided' };

  // 1. Update or Create delivery_agents record
  const agentUpdate: any = { 
    id: agentId, 
    agent_status: 'APPROVED'
  };

  // If we have full data, include it to ensure a valid record if we're upserting
  if (agentData) {
    if (agentData.vehicle_type) agentUpdate.vehicle_type = agentData.vehicle_type;
    if (agentData.license_number) agentUpdate.license_number = agentData.license_number;
    if (agentData.plate_number) agentUpdate.plate_number = agentData.plate_number;
  }

  const res1 = await supaQuery(c => 
    c.from('delivery_agents').upsert(agentUpdate, { onConflict: 'id' }).select()
  );

  if (res1.error) {
    const isRLS = res1.error.includes('RLS') || res1.error.includes('row-level security policy');
    if (isRLS) {
      return { error: 'Database access denied (RLS) on delivery_agents. Please run the admin SQL policy fix.' };
    }
    return { error: `Delivery Agent update failed: ${res1.error}` };
  }
  
  const rows1 = res1.data?.length || 0;
  if (rows1 === 0) {
    return { error: 'Failed to update delivery_agents table. Ensure the record exists or RLS allows upsert.' };
  }

  // 2. Verify the profile
  const res2 = await supaQuery(c => 
    c.from('profiles').update({ kyc_status: 'VERIFIED' }).eq('id', agentId).select()
  );

  if (res2.error) return { error: `Profile update failed: ${res2.error}` };
  const rows2 = res2.data?.length || 0;

  console.log(`[CityLink] approveAgent rows affected: delivery_agents=${rows1}, profiles=${rows2}`);

  if (rows2 === 0) {
    return { error: 'Failed to update profiles table. Ensure the agent has an active profile.' };
  }
  
  return { error: null };
}

/**
 * rejectAgent — rejects a delivery agent in both profiles and delivery_agents tables.
 */
export async function rejectAgent(agentId, reason) {
  if (!agentId) return { error: 'No agent ID provided' };

  // 1. Update delivery_agents first
  const res1 = await supaQuery(c => 
    c.from('delivery_agents').update({ agent_status: 'REJECTED' }).eq('id', agentId).select()
  );

  if (res1.error) return { error: res1.error };
  const rows1 = res1.data?.length || 0;

  if (rows1 === 0) {
    return { error: 'Agent record not found or access denied (RLS).' };
  }

  // 2. Update profile
  const res2 = await supaQuery(c => 
    c.from('profiles').update({ 
      kyc_status: 'REJECTED', 
      rejection_reason: reason 
    }).eq('id', agentId).select()
  );

  if (res2.error) return { error: res2.error };
  const rows2 = res2.data?.length || 0;
  
  console.log(`[CityLink] rejectAgent rows affected: delivery_agents=${rows1}, profiles=${rows2}`);

  if (rows2 === 0) {
    return { error: 'Failed to update the agent profile record.' };
  }

  return { error: null };
}

export const fetchAdminLiveStats = async () => {
  try {
    const [
      profilesRes, 
      mktOrdersRes, 
      foodOrdersRes, 
      jobsRes, 
      listingsRes, 
      parkingRes, 
      disputeMktRes, 
      disputeFoodRes
    ] = await Promise.all([
      supaQuery(c => c.from('profiles').select('id', { count: 'exact', head: true })),
      supaQuery(c => c.from('marketplace_orders').select('total')),
      supaQuery(c => c.from('food_orders').select('total')),
      supaQuery(c => c.from('job_listings').select('id', { count: 'exact', head: true })),
      supaQuery(c => c.from('property_listings').select('id', { count: 'exact', head: true })),
      supaQuery(c => c.from('parking_sessions').select('id', { count: 'exact', head: true })),
      supaQuery(c => c.from('marketplace_orders').select('id', { count: 'exact', head: true }).eq('status', 'DISPUTED')),
      supaQuery(c => c.from('food_orders').select('id', { count: 'exact', head: true }).eq('status', 'DISPUTED'))
    ]);

    // Log errors for debugging
    if (profilesRes.error) console.error('🔧 AdminStats Profiles Error:', profilesRes.error);
    if (mktOrdersRes.error) console.error('🔧 AdminStats MktOrders Error:', mktOrdersRes.error);

    const mktRevenue = (mktOrdersRes.data || []).reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
    const foodRevenue = (foodOrdersRes.data || []).reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
    const totalRevenue = mktRevenue + foodRevenue;

    return {
      data: {
        identities: profilesRes.count || 0,
        revenue: totalRevenue,
        jobs: jobsRes.count || 0,
        realEstate: listingsRes.count || 0,
        parking: parkingRes.count || 0,
        openDisputes: (disputeMktRes.count || 0) + (disputeFoodRes.count || 0),
      }
    };
  } catch (e) {
    console.error('🔧 fetchAdminLiveStats crash:', e);
    return { data: { identities: 0, revenue: 0, jobs: 0, realEstate: 0, parking: 0, openDisputes: 0 }, error: e.message };
  }
};

/**
 * subscribeToGlobalEvents — establishes realtime subscription for critical events.
 */
export const subscribeToGlobalEvents = (callback) => {
  const client = getClient();
  if (!client) return null;

  return client
    .channel('global_admin_updates')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'marketplace_orders' }, payload => callback({ type: 'ORDER', payload }))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, payload => callback({ type: 'PROFILE', payload }))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'marketplace_orders', filter: 'status=eq.DISPUTED' }, payload => callback({ type: 'DISPUTE', payload }))
    .subscribe();
};

import { getClient, supaQuery } from './supabase';
import {
  User,
  DeliveryAgent,
  MarketplaceOrder,
  FoodOrder,
  ParkingSession,
  DeliveryDispatch,
  PropertyListing,
} from '../types';
import { flattenUser } from './profile.service';

/**
 * fetchPendingMerchants — fetches merchants awaiting KYC approval.
 */
export async function fetchPendingMerchants() {
  const res = await supaQuery<any[]>((c) =>
    c
      .from('profiles')
      .select('*, merchants(*)')
      .eq('role', 'merchant')
      .eq('kyc_status', 'PENDING')
      .order('created_at', { ascending: false })
  );
  return {
    ...res,
    data: (res.data || []).map((m) => flattenUser(m)).filter(Boolean) as User[],
  };
}

/**
 * approveMerchant — approves a merchant's KYC and status.
 */
export async function approveMerchant(
  merchantId: string
): Promise<{ data: User | null; error: string | null }> {
  if (!merchantId) return { data: null, error: 'No merchant ID provided' };

  const res = await supaQuery<{ success: boolean; data?: User; error?: string }>((c) =>
    c.rpc('admin_approve_merchant', { p_merchant_id: merchantId })
  );

  if (res.error) return { data: null, error: res.error };
  if (res.data && !res.data.success)
    return { data: null, error: res.data.error || 'Merchant approval failed' };

  return { data: res.data?.data as User, error: null };
}

/**
 * rejectMerchant — rejects a merchant's application with a reason.
 * Uses the admin_reject_merchant RPC which enforces server-side role authorization,
 * consistent with approveMerchant. Direct table mutations were removed because they
 * bypass the auth.uid() role check enforced inside SECURITY DEFINER RPCs.
 */
export async function rejectMerchant(
  merchantId: string,
  reason: string
): Promise<{ data: null; error: string | null }> {
  if (!merchantId) return { data: null, error: 'No merchant ID provided' };
  if (!reason?.trim()) return { data: null, error: 'Rejection reason is required' };

  const res = await supaQuery<{ success: boolean; error?: string }>((c) =>
    c.rpc('admin_reject_merchant', {
      p_merchant_id: merchantId,
      p_reason: reason.trim(),
    })
  );

  if (res.error) return { data: null, error: res.error };
  if (res.data && !res.data.success)
    return { data: null, error: res.data.error || 'Rejection failed' };

  return { data: null, error: null };
}

/**
 * approveAgent — approves a delivery agent in both profiles and delivery_agents tables.
 * Uses upsert for delivery_agents to handle missing records.
 */
export async function approveAgent(
  agentOrId: string | DeliveryAgent
): Promise<{ error: string | null }> {
  const agentId = typeof agentOrId === 'object' ? agentOrId.id : agentOrId;
  const agentData = typeof agentOrId === 'object' ? agentOrId : null;

  if (!agentId) return { error: 'No agent ID provided' };

  const res = await supaQuery<{ success: boolean; data?: DeliveryAgent; error?: string }>((c) =>
    c.rpc('admin_approve_agent', {
      p_agent_id: agentId,
      p_vehicle_type: agentData?.vehicle_type ?? null,
      p_license_number: agentData?.license_number ?? null,
      p_plate_number: agentData?.plate_number ?? null,
    })
  );

  if (res.error) return { error: res.error };
  if (res.data && !res.data.success) return { error: res.data.error ?? 'Agent approval failed' };

  return { error: null };
}

/**
 * rejectAgent — rejects a delivery agent in both profiles and delivery_agents tables.
 * Uses the admin_reject_agent RPC for secure server-side role authorization and atomicity.
 */
export async function rejectAgent(agentId: string, reason: string) {
  if (!agentId) return { error: 'No agent ID provided' };
  if (!reason?.trim()) return { error: 'Rejection reason is required' };

  const res = await supaQuery<{ success: boolean; error?: string }>((c) =>
    c.rpc('admin_reject_agent', {
      p_agent_id: agentId,
      p_reason: reason.trim(),
    })
  );

  if (res.error) return { error: res.error };
  if (res.data && !res.data.success) return { error: res.data.error || 'Rejection failed' };

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
      revenueRes,
    ] = await Promise.all([
      supaQuery<{ id: string }[]>((c) =>
        c.from('profiles').select('id', { count: 'exact', head: true })
      ),
      // Use count-only HEAD queries — never fetch full row data for counting
      supaQuery<{ id: string }[]>((c) =>
        c.from('marketplace_orders').select('id', { count: 'exact', head: true })
      ),
      supaQuery<{ id: string }[]>((c) =>
        c.from('food_orders').select('id', { count: 'exact', head: true })
      ),
      supaQuery<{ id: string }[]>((c) =>
        c.from('delivery_dispatches').select('id', { count: 'exact', head: true })
      ),
      supaQuery<{ id: string }[]>((c) =>
        c.from('property_listings').select('id', { count: 'exact', head: true })
      ),
      supaQuery<{ id: string }[]>((c) =>
        c.from('parking_sessions').select('id', { count: 'exact', head: true })
      ),
      supaQuery<{ id: string }[]>((c) =>
        c
          .from('marketplace_orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'DISPUTED')
      ),
      supaQuery<{ id: string }[]>((c) =>
        c.from('food_orders').select('id', { count: 'exact', head: true }).eq('status', 'DISPUTED')
      ),
      // Single RPC returns both marketplace + food revenue as SUM() — no row fetching
      supaQuery<{ marketplace_revenue: number; food_revenue: number }>((c) =>
        c.rpc('get_platform_revenue')
      ),
    ]);

    const mktRevenue = revenueRes.data?.marketplace_revenue ?? 0;
    const foodRevenue = revenueRes.data?.food_revenue ?? 0;

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
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e);
    console.error('🔧 fetchAdminLiveStats crash:', e);
    return {
      data: {
        identities: 0,
        revenue: 0,
        deliveries: 0,
        realEstate: 0,
        parking: 0,
        openDisputes: 0,
      },
      error: error,
    };
  }
};

/**
 * subscribeToGlobalEvents — establishes realtime subscription for critical events.
 */
export const subscribeToGlobalEvents = (
  callback: (data: { type: string; payload: unknown }) => void
) => {
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

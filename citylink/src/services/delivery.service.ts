/**
 * CityLink Delivery Agent Service
 * Handles GPS, proximity dispatch, job management, and earnings.
 */
import { supaQuery, subscribeToTable, getClient, hasSupabase } from './supabase';
import { 
  DeliveryAgent, 
  DeliveryDispatch, 
  AgentTelemetry, 
  MarketplaceOrder, 
  VehicleType 
} from '../types';
import { RealtimePayload } from './realtime';

import * as Location from 'expo-location';
import { decode } from 'base64-arraybuffer';
import { uid } from '../utils';

// ── Haversine distance (km) ───────────────────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * calculateETA
 * Simple ETA based on distance and average speed (20km/h in Addis traffic)
 */
export function calculateETA(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dist = haversine(lat1, lng1, lat2, lng2);
  const avgSpeedKmh = 20; 
  const hours = dist / avgSpeedKmh;
  const minutes = Math.ceil(hours * 60);
  return Math.max(2, minutes); // Min 2 mins
}

export async function registerDeliveryAgent({ 
  agentId, 
  vehicleType, 
  plateNumber, 
  licenseNumber 
}: { 
  agentId: string; 
  vehicleType: VehicleType; 
  plateNumber?: string; 
  licenseNumber: string; 
}) {
  if (!agentId) return { error: 'Missing authenticated agent ID' };
  return supaQuery<DeliveryAgent>((c) =>
    c.from('delivery_agents').upsert(
      {
        id: agentId,
        vehicle_type: vehicleType,
        plate_number: plateNumber || null,
        license_number: licenseNumber,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    ).select().single()
  );
}

// ── GPS Location ──────────────────────────────────────────────────────────────
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') {
    const req = await Location.requestForegroundPermissionsAsync();
    if (req.status !== 'granted') return null;
  }
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch {
    return null;
  }
}

export async function updateAgentLocation(agentId: string, lat: number, lng: number) {
  if (!hasSupabase()) return;
  return supaQuery<void>((c) =>
    c
      .from('delivery_agents')
      .update({ current_lat: lat, current_lng: lng, location_updated_at: new Date().toISOString() })
      .eq('id', agentId)
  );
}

// ── Online/Offline Toggle ─────────────────────────────────────────────────────
export async function setAgentOnlineStatus(agentId: string, isOnline: boolean, lat: number | null, lng: number | null) {
  if (!hasSupabase()) return { ok: true };
  return supaQuery<void>((c) =>
    c
      .from('delivery_agents')
      .update({
        is_online: isOnline,
        current_lat: isOnline ? lat : null,
        current_lng: isOnline ? lng : null,
        location_updated_at: new Date().toISOString(),
      })
      .eq('id', agentId)
  );
}

// ── Fetch Agent Profile ───────────────────────────────────────────────────────
export async function fetchAgentProfile(agentId: string) {
  if (!hasSupabase()) return { data: null, error: null };
  return supaQuery<DeliveryAgent>((c) => c.from('delivery_agents').select('*').eq('id', agentId).single());
}

// ── Find Nearby Agents ────────────────────────────────────────────────────────
export async function findNearbyAgents(merchantLat: number, merchantLng: number, radiusKm = 10): Promise<DeliveryAgent[]> {
  if (!hasSupabase()) return [];
  
  const heartbeatThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supaQuery<DeliveryAgent[]>((c) =>
    c
      .from('delivery_agents')
      .select(`*, profile:profiles!delivery_agents_id_fkey(full_name, phone)`)
      .eq('is_online', true)
      .eq('agent_status', 'APPROVED')
      .gt('location_updated_at', heartbeatThreshold)
      .not('current_lat', 'is', null)
      .not('current_lng', 'is', null)
  );

  if (error || !data) return [];

  return (data as (DeliveryAgent & { distanceKm?: number })[])
    .map((a) => ({
      ...a,
      distanceKm: (a.current_lat && a.current_lng) ? haversine(merchantLat, merchantLng, a.current_lat, a.current_lng) : radiusKm + 1,
    }))
    .filter((a) => (a.distanceKm || 0) <= radiusKm)
    .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
    .slice(0, 10);
}

// ── Dispatch Job ──────────────────────────────────────────────────────────────
export async function dispatchOrderToAgents(orderId: string, agentIds: string[]): Promise<{ ok: boolean; error?: string; expiresAt?: string; dispatchedTo?: number }> {
  if (!hasSupabase() || !agentIds.length) return { ok: false, error: 'no_agents' };

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); 

  const { error } = await supaQuery<void>((c) =>
    c
      .from('marketplace_orders')
      .update({
        dispatch_expires_at: expiresAt,
        dispatch_attempts: 1, 
        status: 'DISPATCHING',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
  );
  if (error) return { ok: false, error };

  const records = agentIds.map((agentId) => ({
    order_id: orderId,
    agent_id: agentId,
    expires_at: expiresAt,
    status: 'PENDING' as const,
  }));

  await supaQuery<void>((c) =>
    c.from('delivery_dispatches').upsert(records, { onConflict: 'order_id,agent_id' })
  );

  return { ok: true, expiresAt, dispatchedTo: agentIds.length };
}

// ── Accept Delivery Job ───────────────────────────────────────────────────────
export async function acceptDeliveryJob(orderId: string, agentId: string): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabase()) return { ok: true };

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const { data, error } = await supaQuery<{ ok: boolean; error?: string }>((c) =>
        c.rpc('accept_delivery_job', {
          p_order_id: orderId,
          p_agent_id: agentId,
        })
      );

      if (!error && data?.ok) {
        return { ok: true };
      }

      if (error || !data?.ok) {
        const msg = error || data?.error || 'failed_to_accept_job';
        if (msg.includes('already_accepted') || msg.includes('not_available')) {
          return { ok: false, error: msg };
        }
        throw new Error(msg);
      }
    } catch (e: any) {
      attempts++;
      if (attempts >= maxAttempts) {
        return { ok: false, error: e.message };
      }
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempts - 1)));
    }
  }

  return { ok: false, error: 'Max retry attempts reached' };
}

// ── Decline Delivery Job ──────────────────────────────────────────────────────
export async function declineDeliveryJob(orderId: string, agentId: string) {
  if (!hasSupabase()) return { ok: true };
  return supaQuery<void>((c) =>
    c
      .from('delivery_dispatches')
      .update({ status: 'DECLINED', responded_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('agent_id', agentId)
  );
}

// ── Mark Picked Up (Merchant + Agent dual confirmation) ──────────────────────
export async function markOrderPickedUp(orderId: string, agentId: string): Promise<{ ok: boolean; error?: string; status?: string; pin?: string }> {
  if (!hasSupabase()) return { ok: true };
  const { data, error } = await supaQuery<{ ok: boolean; status: string; delivery_pin: string; error?: string }>((c) =>
    c.rpc('confirm_order_pickup', {
      p_order_id: orderId,
      p_user_id: agentId,
    })
  );
  if (error || !data?.ok)
    return { ok: false, error: error || data?.error || 'pickup_failed' };
  return { ok: true, status: data.status, pin: data.delivery_pin };
}

// ── Mark Delivered (triggers PIN flow) ────────────────────────────────────────
export async function markOrderDeliveredByAgent(orderId: string, agentId: string) {
  if (!hasSupabase()) return { ok: true };
  return supaQuery<void>((c) =>
    c
      .from('marketplace_orders')
      .update({ status: 'AWAITING_PIN', delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('agent_id', agentId)
  );
}

// ── Confirm Delivery with PIN (completes order) ───────────────────────────────
export async function confirmDeliveryWithPin(orderId: string, pin: string, agentId: string | null = null): Promise<{ ok: boolean; error?: string; agent_share?: number }> {
  if (!hasSupabase()) return { ok: true };

  const { data, error } = await supaQuery<{ ok: boolean; error?: string; agent_share: number }>((c) =>
    c.rpc('confirm_delivery_with_pin', {
      p_order_id: orderId,
      p_pin: pin,
      p_agent_id: agentId,
    })
  );

  if (error || !data?.ok) {
    return { ok: false, error: error || data?.error || 'failed_to_confirm' };
  }

  return { ok: data.ok, agent_share: data.agent_share };
}

// ── Proof of Delivery (POD) ───────────────────────────────────────────────────
export async function uploadDeliveryProof(orderId: string, base64Image: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const client = getClient();
  if (!client) return { ok: false, error: 'no-client' };

  try {
    const fileName = `pod/${orderId}_${uid()}.jpg`;
    const { error: uploadError } = await client.storage
      .from('delivery-proofs')
      .upload(fileName, decode(base64Image), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = client.storage.from('delivery-proofs').getPublicUrl(fileName);
    const publicUrl = data.publicUrl;

    const { error: updateError } = await supaQuery<void>((c) =>
      c.from('marketplace_orders').update({ delivery_proof_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', orderId)
    );

    if (updateError) throw updateError;
    return { ok: true, url: publicUrl };
  } catch (err: any) {
    console.error('POD Upload Error:', err);
    return { ok: false, error: err.message };
  }
}

// ── Agent Telemetry (Breadcrumbs) ─────────────────────────────────────────────
const _telemetryCache: Record<string, { ts: number; lat: number; lng: number }> = {};

/**
 * recordTelemetry
 * Records agent GPS coordinates with client-side throttling to save database resources.
 */
export async function recordTelemetry(agentId: string, orderId: string, lat: number, lng: number, speed: number | null = null, heading: number | null = null) {
  if (!hasSupabase()) return;

  const now = Date.now();
  const last = _telemetryCache[agentId];

  if (last) {
    const timePassed = now - last.ts;
    const distMoved = haversine(last.lat, last.lng, lat, lng) * 1000; // meters

    if (timePassed < 15000 && distMoved < 50) {
      return { throttled: true };
    }
  }

  _telemetryCache[agentId] = { ts: now, lat, lng };

  return supaQuery<void>((c) =>
    c.from('agent_telemetry').insert({
      agent_id: agentId,
      order_id: orderId,
      lat,
      lng,
      speed,
      heading,
      created_at: new Date().toISOString()
    })
  );
}

// ── Fetch Pending Dispatches for Agent ────────────────────────────────────────
export async function fetchPendingDispatches(agentId: string): Promise<DeliveryDispatch[]> {
  if (!hasSupabase()) return [];
  const { data } = await supaQuery<DeliveryDispatch[]>((c) =>
    c
      .from('delivery_dispatches')
      .select(`*, order:order_id(*, merchant:merchant_id(full_name, business_name, subcity))`)
      .eq('agent_id', agentId)
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
  );
  return (data as DeliveryDispatch[]) || [];
}

// ── Fetch Active Job for Agent ────────────────────────────────────────────────
export async function fetchActiveJobs(agentId: string): Promise<MarketplaceOrder[]> {
  if (!hasSupabase()) return [];
  const { data } = await supaQuery<MarketplaceOrder[]>((c) =>
    c
      .from('marketplace_orders')
      .select(
        `*, merchant:merchant_id(full_name, business_name, subcity, woreda), buyer:buyer_id(full_name, phone)`
      )
      .eq('agent_id', agentId)
      .in('status', ['AGENT_ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'AWAITING_PIN'])
      .order('created_at', { ascending: false })
  );
  return (data as MarketplaceOrder[]) || [];
}

// ── Fetch Agent Delivery History ──────────────────────────────────────────────
export async function fetchAgentHistory(agentId: string, limit = 20): Promise<Partial<MarketplaceOrder>[]> {
  if (!hasSupabase()) return [];
  const { data } = await supaQuery<Partial<MarketplaceOrder>[]>((c) =>
    c
      .from('marketplace_orders')
      .select(`id, product_name, total, status, delivered_at, merchant:merchant_id(business_name)`)
      .eq('agent_id', agentId)
      .eq('status', 'COMPLETED')
      .order('delivered_at', { ascending: false })
      .limit(limit)
  );
  return (data as Partial<MarketplaceOrder>[]) || [];
}

// ── Subscribe to Dispatches (Agent Dashboard) ─────────────────────────────────
export function subscribeToAgentDispatches(agentId: string, onDispatch: (payload: RealtimePayload<DeliveryDispatch>) => void) {
  return subscribeToTable(
    `agent-dispatches-${agentId}`,
    'delivery_dispatches',
    `agent_id=eq.${agentId}`,
    onDispatch
  );
}

// ── Subscribe to Order Status (Active Job) ────────────────────────────────────
export function subscribeToOrderStatus(orderId: string, onUpdate: (payload: RealtimePayload<MarketplaceOrder>) => void) {
  return subscribeToTable(
    `order-status-${orderId}`,
    'marketplace_orders',
    `id=eq.${orderId}`,
    onUpdate
  );
}

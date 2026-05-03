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
  FoodOrder,
  VehicleType,
} from '../types';
export type RealtimePayload<T> = { new: T; old: T; eventType: 'INSERT' | 'UPDATE' | 'DELETE' };

export type OrderType = 'MARKETPLACE' | 'FOOD';

export interface UnifiedOrder {
  id: string;
  order_type: OrderType;
  status: string;
  merchant_id: string;
  buyer_id: string;
  total: number;
  delivery_pin?: string;
  created_at: string;
  updated_at?: string;
  agent_id?: string;
  merchant_confirmed_pickup?: boolean;
  agent_confirmed_pickup?: boolean;
  merchant?: {
    business_name?: string;
    merchant_name?: string;
    subcity?: string;
    woreda?: string;
    lat?: number;
    lng?: number;
  };
  buyer?: { full_name?: string; phone?: string };
  display_name?: string; // Product name or Restaurant name
  shipping_address?: string;
  destination_lat?: number;
  destination_lng?: number;
}

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
  licenseNumber,
}: {
  agentId: string;
  vehicleType: VehicleType;
  plateNumber?: string;
  licenseNumber: string;
}) {
  if (!agentId) return { data: null, error: 'Missing authenticated agent ID' };
  if (!vehicleType) return { data: null, error: 'Vehicle type is required' };
  if (!licenseNumber || licenseNumber.length < 5)
    return { data: null, error: 'Valid license number is required' };

  return supaQuery<DeliveryAgent>((c) =>
    c
      .from('delivery_agents')
      .upsert(
        {
          id: agentId,
          vehicle_type: vehicleType,
          plate_number: plateNumber || null,
          license_number: licenseNumber,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single()
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
    // 1. Try to grab the last known position instantly so we never hang the ping
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) {
      // Fire a background update for accuracy next time, but don't wait for it
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => {});
      return { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };
    }

    // 2. If no last known, try current position with a strict 5-second timeout
    const locPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));

    const loc = await Promise.race([locPromise, timeoutPromise]);
    if (loc) {
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    }

    return null;
  } catch (err) {
    console.log('[Location] Failed to get location:', err);
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
export async function setAgentOnlineStatus(
  agentId: string,
  isOnline: boolean,
  lat: number | null,
  lng: number | null
) {
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
  return supaQuery<DeliveryAgent>((c) =>
    c.from('delivery_agents').select('*').eq('id', agentId).single()
  );
}

// ── Find Nearby Agents ────────────────────────────────────────────────────────
export async function findNearbyAgents(
  merchantLat: number,
  merchantLng: number,
  radiusMeters = 5000
): Promise<DeliveryAgent[]> {
  if (!hasSupabase()) return [];

  const { data, error } = await supaQuery<any[]>((c) =>
    c.rpc('get_nearby_agents', {
      p_lat: merchantLat,
      p_lng: merchantLng,
      p_radius_meters: radiusMeters,
    })
  );

  if (error || !data) return [];

  // Map RPC result back to DeliveryAgent type
  return data.map((a) => ({
    id: a.agent_id,
    first_name: a.first_name,
    last_name: a.last_name,
    vehicle_type: a.vehicle_type,
    current_status: a.current_status,
    distance_meters: a.distance_meters,
  })) as any[];
}

// ── Dispatch Job ──────────────────────────────────────────────────────────────
export async function dispatchOrderToAgents(
  orderId: string,
  agentIds: string[],
  orderType: OrderType = 'MARKETPLACE'
): Promise<{ ok: boolean; error?: string; expiresAt?: string; dispatchedTo?: number }> {
  if (!hasSupabase() || !agentIds.length) return { ok: false, error: 'no_agents' };

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const table = orderType === 'MARKETPLACE' ? 'marketplace_orders' : 'food_orders';

  const { error } = await supaQuery<void>((c) =>
    c
      .from(table)
      .update({
        dispatch_expires_at: expiresAt,
        dispatch_attempts: 1,
        status: 'DISPATCHING',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
  );
  if (error) return { ok: false, error };

  const records = agentIds.map((agentId) => ({
    order_id: orderId,
    agent_id: agentId,
    order_type: orderType,
    expires_at: expiresAt,
    status: 'PENDING' as const,
  }));

  await supaQuery<void>((c) =>
    c.from('delivery_dispatches').upsert(records, { onConflict: 'order_id,agent_id' })
  );

  return { ok: true, expiresAt, dispatchedTo: agentIds.length };
}

// ── Accept Delivery Job ───────────────────────────────────────────────────────
export async function acceptDeliveryJob(
  orderId: string,
  agentId: string,
  orderType: OrderType = 'MARKETPLACE'
): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabase()) return { ok: true };

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const { data, error } = await supaQuery<{ ok: boolean; error?: string }>((c) =>
        c.rpc('accept_delivery_job', {
          p_order_id: orderId,
          p_agent_id: agentId,
          p_order_type: orderType || 'MARKETPLACE',
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
    } catch (e: unknown) {
      attempts++;
      const error = e instanceof Error ? e.message : String(e);
      if (attempts >= maxAttempts) {
        return { ok: false, error: error };
      }
      // Exponential backoff WITH jitter: prevents thundering herd when many agents
      // simultaneously fail to accept a job and retry at identical intervals.
      const baseDelay = 500 * Math.pow(2, attempts - 1);
      const jitter = Math.random() * 500; // ±500ms random spread
      await new Promise((r) => setTimeout(r, baseDelay + jitter));
    }
  }

  return { ok: false, error: 'Max retry attempts reached' };
}

// ── Decline Delivery Job ──────────────────────────────────────────────────────
export async function declineDeliveryJob(
  orderId: string,
  agentId: string
): Promise<{ data: void | null; count?: number | null; error: string | null }> {
  if (!hasSupabase()) return { data: null, error: null, count: null };
  return supaQuery<void>((c) =>
    c
      .from('delivery_dispatches')
      .update({ status: 'DECLINED', responded_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('agent_id', agentId)
  );
}

// ── Mark Picked Up (Merchant + Agent dual confirmation) ──────────────────────
export async function markOrderPickedUp(
  orderId: string,
  agentId: string,
  orderType: OrderType = 'MARKETPLACE'
): Promise<{ ok: boolean; error?: string; status?: string; pin?: string }> {
  if (!hasSupabase()) return { ok: true };
  const { data, error } = await supaQuery<{
    ok: boolean;
    status: string;
    delivery_pin: string;
    error?: string;
  }>((c) =>
    c.rpc('confirm_order_pickup', {
      p_order_id: orderId,
      p_user_id: agentId,
      p_order_type: orderType,
    })
  );
  if (error || !data?.ok) return { ok: false, error: error || data?.error || 'pickup_failed' };
  return { ok: true, status: data.status, pin: data.delivery_pin };
}

// ── Mark Delivered (triggers PIN flow) ────────────────────────────────────────
export async function markOrderDeliveredByAgent(
  orderId: string,
  agentId: string,
  orderType: OrderType = 'MARKETPLACE'
) {
  return supaQuery<{ ok: boolean; error?: string }>((c) =>
    c.rpc('mark_delivery_delivered_atomic', {
      p_order_id: orderId,
      p_agent_id: agentId,
      p_order_type: orderType,
    })
  );
}

// ── Confirm Delivery with PIN (completes order) ───────────────────────────────
export async function confirmDeliveryWithPin(
  orderId: string,
  pin: string,
  agentId: string | null = null,
  orderType: OrderType = 'MARKETPLACE'
): Promise<{ ok: boolean; error?: string; agent_share?: number }> {
  if (!hasSupabase()) return { ok: true };

  const { data, error } = await supaQuery<{ ok: boolean; error?: string; agent_share: number }>(
    (c) =>
      c.rpc('confirm_delivery_with_pin', {
        p_order_id: orderId,
        p_pin: pin,
        p_agent_id: agentId,
        p_order_type: orderType,
      })
  );

  if (error || !data?.ok) {
    return { ok: false, error: error || data?.error || 'failed_to_confirm' };
  }

  return { ok: data.ok, agent_share: data.agent_share };
}

// ── Proof of Delivery (POD) ───────────────────────────────────────────────────
export async function uploadDeliveryProof(
  orderId: string,
  agentId: string,
  base64Image: string,
  orderType: 'FOOD' | 'MARKETPLACE' = 'MARKETPLACE'
): Promise<{ ok: boolean; url?: string; error?: string }> {
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

    // Use explicit orderType param — never infer table from ID string prefix (brittle heuristic)
    const table = orderType === 'FOOD' ? 'food_orders' : 'marketplace_orders';
    const { error: updateError } = await supaQuery<void>((c) =>
      c
        .from(table)
        .update({ delivery_proof_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('agent_id', agentId)
    );

    if (updateError) throw updateError;
    return { ok: true, url: publicUrl };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('POD Upload Error:', err);
    return { ok: false, error: error };
  }
}

// ── Agent Telemetry (Breadcrumbs) ─────────────────────────────────────────────
const _telemetryCache: Record<string, { ts: number; lat: number; lng: number }> = {};

/**
 * recordTelemetry
 * Records agent GPS coordinates with client-side throttling to save database resources.
 */
export async function recordTelemetry(
  agentId: string,
  orderId: string,
  lat: number,
  lng: number,
  orderType: OrderType = 'MARKETPLACE',
  speed: number | null = null,
  heading: number | null = null
) {
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
      order_type: orderType,
      lat,
      lng,
      speed,
      heading,
      created_at: new Date().toISOString(),
    })
  );
}

// ── Fetch Pending Dispatches for Agent ────────────────────────────────────────
export async function fetchPendingDispatches(agentId: string): Promise<DeliveryDispatch[]> {
  if (!hasSupabase()) return [];

  // 1. Fetch the dispatches first
  const { data: dispatches, error } = await supaQuery<any[]>((c) =>
    c
      .from('delivery_dispatches')
      .select('*')
      .eq('agent_id', agentId)
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
  );

  if (!dispatches || dispatches.length === 0) return [];

  // 2. Fetch order details for each type
  const marketplaceIds = dispatches
    .filter((d) => d.order_type === 'MARKETPLACE' || !d.order_type)
    .map((d) => d.order_id);

  const foodIds = dispatches.filter((d) => d.order_type === 'FOOD').map((d) => d.order_id);

  let marketplaceOrders: any[] = [];
  let foodOrders: any[] = [];

  if (marketplaceIds.length > 0) {
    const { data } = await supaQuery<any[]>((c) =>
      c
        .from('marketplace_orders')
        .select(
          `*, merchant:profiles!marketplace_orders_merchant_id_fkey(full_name, business_name, subcity)`
        )
        .in('id', marketplaceIds)
    );
    marketplaceOrders = data || [];
  }

  if (foodIds.length > 0) {
    const { data } = await supaQuery<any[]>((c) =>
      c
        .from('food_orders')
        .select(
          `*, merchant:profiles!food_orders_merchant_id_fkey(full_name, business_name, subcity)`
        )
        .in('id', foodIds)
    );
    foodOrders = data || [];
  }

  // 3. Merge details back to dispatches
  return dispatches
    .map((d) => {
      let orderDetails = null;
      if (d.order_type === 'FOOD') {
        orderDetails = foodOrders.find((o) => o.id === d.order_id);
      } else {
        orderDetails = marketplaceOrders.find((o) => o.id === d.order_id);
      }

      return {
        ...d,
        order: orderDetails
          ? {
              ...orderDetails,
              merchant: Array.isArray(orderDetails.merchant)
                ? orderDetails.merchant[0]
                : orderDetails.merchant,
            }
          : null,
      };
    })
    .filter((d) => d.order !== null) as DeliveryDispatch[];
}

// ── Fetch Active Job for Agent ────────────────────────────────────────────────
export async function fetchActiveJobs(agentId: string): Promise<UnifiedOrder[]> {
  if (!hasSupabase()) return [];

  // Fetch from both tables
  const [marketRes, foodRes] = await Promise.all([
    supaQuery<MarketplaceOrder[]>((c) =>
      c
        .from('marketplace_orders')
        .select(
          `*, merchant:profiles!marketplace_orders_merchant_id_fkey(full_name, business_name, subcity, woreda, latitude, longitude), buyer:profiles!marketplace_orders_buyer_id_fkey(full_name, phone)`
        )
        .eq('agent_id', agentId)
        .in('status', ['AGENT_ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'AWAITING_PIN'])
    ),
    supaQuery<FoodOrder[]>((c) =>
      c
        .from('food_orders')
        .select(
          `*, merchant:profiles!food_orders_merchant_id_fkey(full_name, business_name, subcity, woreda, latitude, longitude), buyer:profiles!food_orders_citizen_id_fkey(full_name, phone)`
        )
        .eq('agent_id', agentId)
        .in('status', ['AGENT_ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'AWAITING_PIN'])
    ),
  ]);

  const unified: UnifiedOrder[] = [];

  if (marketRes.data) {
    unified.push(
      ...marketRes.data.map((m: any) => ({
        ...m,
        order_type: 'MARKETPLACE' as const,
        display_name: m.product_name,
        buyer_id: m.buyer_id,
        merchant: Array.isArray(m.merchant)
          ? {
              ...m.merchant[0],
              lat: (m.merchant[0] as any).latitude,
              lng: (m.merchant[0] as any).longitude,
            }
          : {
              ...(m.merchant as any),
              lat: (m.merchant as any)?.latitude,
              lng: (m.merchant as any)?.longitude,
            },
        buyer: Array.isArray(m.buyer) ? m.buyer[0] : m.buyer,
        shipping_address: m.shipping_address,
        destination_lat: m.destination_lat,
        destination_lng: m.destination_lng,
      }))
    );
  }

  if (foodRes.data) {
    unified.push(
      ...foodRes.data.map((f: any) => ({
        ...f,
        order_type: 'FOOD' as const,
        display_name: f.restaurant_name,
        buyer_id: f.citizen_id,
        merchant: Array.isArray(f.merchant)
          ? {
              ...f.merchant[0],
              lat: (f.merchant[0] as any).latitude,
              lng: (f.merchant[0] as any).longitude,
            }
          : {
              ...(f.merchant as any),
              lat: (f.merchant as any)?.latitude,
              lng: (f.merchant as any)?.longitude,
            },
        buyer: Array.isArray(f.buyer) ? f.buyer[0] : f.buyer,
        shipping_address: f.shipping_address,
        destination_lat: f.destination_lat,
        destination_lng: f.destination_lng,
      }))
    );
  }

  return unified.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// ── Fetch Agent Delivery History ──────────────────────────────────────────────
export async function fetchAgentHistory(agentId: string, limit = 20): Promise<any[]> {
  if (!hasSupabase()) return [];

  const [marketRes, foodRes] = await Promise.all([
    supaQuery<any[]>((c) =>
      c
        .from('marketplace_orders')
        .select(
          `id, product_name, total, agent_fee, status, delivered_at, merchant:profiles!marketplace_orders_merchant_id_fkey(business_name)`
        )
        .eq('agent_id', agentId)
        .eq('status', 'COMPLETED')
        .order('delivered_at', { ascending: false })
        .limit(limit)
    ),
    supaQuery<any[]>((c) =>
      c
        .from('food_orders')
        .select(
          `id, restaurant_name, total, agent_fee, status, delivered_at, merchant:profiles!food_orders_merchant_id_fkey(business_name)`
        )
        .eq('agent_id', agentId)
        .eq('status', 'COMPLETED')
        .order('delivered_at', { ascending: false })
        .limit(limit)
    ),
  ]);

  const unified = [
    ...(marketRes.data || []).map((o) => ({
      ...o,
      display_name: o.product_name,
      order_type: 'MARKETPLACE',
    })),
    ...(foodRes.data || []).map((o) => ({
      ...o,
      display_name: o.restaurant_name,
      order_type: 'FOOD',
    })),
  ];

  return unified
    .sort((a, b) => new Date(b.delivered_at).getTime() - new Date(a.delivered_at).getTime())
    .slice(0, limit);
}

// ── Subscribe to Dispatches (Agent Dashboard) ─────────────────────────────────
export function subscribeToAgentDispatches(
  agentId: string,
  onDispatch: (payload: RealtimePayload<DeliveryDispatch>) => void
) {
  return subscribeToTable(
    `agent-dispatches-${agentId}`,
    'delivery_dispatches',
    `agent_id=eq.${agentId}`,
    onDispatch
  );
}

// ── Subscribe to Order Status (Active Job) ────────────────────────────────────
export function subscribeToOrderStatus(
  orderId: string,
  onUpdate: (payload: RealtimePayload<MarketplaceOrder>) => void
) {
  return subscribeToTable(
    `order-status-${orderId}`,
    'marketplace_orders',
    `id=eq.${orderId}`,
    onUpdate
  );
}

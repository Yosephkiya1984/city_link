/**
 * CityLink Delivery Agent Service
 * Handles GPS, proximity dispatch, job management, and earnings.
 */
import { supaQuery, subscribeToTable, getClient, hasSupabase } from './supabase';
import { rpcCreditWallet } from './wallet.service';
import { releaseMarketplaceEscrow } from './marketplace.service';

import * as Location from 'expo-location';
import { decode } from 'base64-arraybuffer';
import { uid } from '../utils';

// ── Haversine distance (km) ───────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
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
 * Simple ETA based on distance and average speed (25km/h in Addis traffic)
 */
export function calculateETA(lat1, lng1, lat2, lng2) {
  const dist = haversine(lat1, lng1, lat2, lng2);
  const avgSpeedKmh = 20; // Conservative Addis traffic speed
  const hours = dist / avgSpeedKmh;
  const minutes = Math.ceil(hours * 60);
  return Math.max(2, minutes); // Min 2 mins
}

export async function registerDeliveryAgent({ agentId, vehicleType, plateNumber, licenseNumber }) {
  if (!agentId) return { error: 'Missing authenticated agent ID' };
  return supaQuery((c) =>
    c.from('delivery_agents').upsert(
      {
        id: agentId,
        vehicle_type: vehicleType,
        plate_number: plateNumber || null,
        license_number: licenseNumber,
      },
      { onConflict: 'id' }
    )
  );
}

// ── GPS Location ──────────────────────────────────────────────────────────────
export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation() {
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

export async function updateAgentLocation(agentId, lat, lng) {
  if (!hasSupabase()) return;
  return supaQuery((c) =>
    c
      .from('delivery_agents')
      .update({ current_lat: lat, current_lng: lng, location_updated_at: new Date().toISOString() })
      .eq('id', agentId)
  );
}

// ── Online/Offline Toggle ─────────────────────────────────────────────────────
export async function setAgentOnlineStatus(agentId, isOnline, lat, lng) {
  if (!hasSupabase()) return { ok: true };
  return supaQuery((c) =>
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
export async function fetchAgentProfile(agentId) {
  if (!hasSupabase()) return { data: null, error: null };
  return supaQuery((c) => c.from('delivery_agents').select('*').eq('id', agentId).single());
}

// ── Find Nearby Agents ────────────────────────────────────────────────────────
export async function findNearbyAgents(merchantLat, merchantLng, radiusKm = 5) {
  if (!hasSupabase()) return [];
  const { data, error } = await supaQuery((c) =>
    c
      .from('delivery_agents')
      .select(`*, profile:profiles!delivery_agents_id_fkey(full_name, phone)`)
      .eq('is_online', true)
      .eq('agent_status', 'APPROVED')
      .not('current_lat', 'is', null)
      .not('current_lng', 'is', null)
  );
  if (error || !data) return [];

  return data
    .map((a) => ({
      ...a,
      distanceKm: haversine(merchantLat, merchantLng, a.current_lat, a.current_lng),
    }))
    .filter((a) => a.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);
}

// ── Dispatch Job ──────────────────────────────────────────────────────────────
export async function dispatchOrderToAgents(orderId, agentIds) {
  if (!hasSupabase() || !agentIds.length) return { ok: false, error: 'no_agents' };

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

  // Record who we dispatched to and the expiry
  const { error } = await supaQuery((c) =>
    c
      .from('marketplace_orders')
      .update({
        dispatch_expires_at: expiresAt,
        dispatch_attempts: 1, // Safe fallback
        status: 'DISPATCHING',
      })
      .eq('id', orderId)
  );
  if (error) return { ok: false, error: error.message };

  // Write dispatch records for each candidate agent
  const records = agentIds.map((agentId) => ({
    order_id: orderId,
    agent_id: agentId,
    expires_at: expiresAt,
    status: 'PENDING',
  }));

  await supaQuery((c) =>
    c.from('delivery_dispatches').upsert(records, { onConflict: 'order_id,agent_id' })
  );

  return { ok: true, expiresAt, dispatchedTo: agentIds.length };
}

// ── Accept Delivery Job ───────────────────────────────────────────────────────
export async function acceptDeliveryJob(orderId, agentId) {
  if (!hasSupabase()) return { ok: true };

  const { data, error } = await supaQuery((c) =>
    c.rpc('accept_delivery_job', {
      p_order_id: orderId,
      p_agent_id: agentId,
    })
  );

  if (error || !data?.ok) {
    return { ok: false, error: error?.message || data?.error || 'failed_to_accept_job' };
  }

  return { ok: true };
}

// ── Decline Delivery Job ──────────────────────────────────────────────────────
export async function declineDeliveryJob(orderId, agentId) {
  if (!hasSupabase()) return { ok: true };
  return supaQuery((c) =>
    c
      .from('delivery_dispatches')
      .update({ status: 'DECLINED', responded_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('agent_id', agentId)
  );
}

// ── Mark Picked Up (Merchant + Agent dual confirmation) ──────────────────────
export async function markOrderPickedUp(orderId, agentId) {
  if (!hasSupabase()) return { ok: true };
  const { data, error } = await supaQuery((c) =>
    c.rpc('confirm_order_pickup', {
      p_order_id: orderId,
      p_user_id: agentId,
    })
  );
  if (error || !data?.ok)
    return { ok: false, error: error?.message || data?.error || 'pickup_failed' };
  return { ok: true, status: data.status, pin: data.delivery_pin };
}

// ── Mark Delivered (triggers PIN flow) ────────────────────────────────────────
export async function markOrderDeliveredByAgent(orderId, agentId) {
  if (!hasSupabase()) return { ok: true };
  return supaQuery((c) =>
    c
      .from('marketplace_orders')
      .update({ status: 'AWAITING_PIN', delivered_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('agent_id', agentId)
  );
}

// ── Confirm Delivery with PIN (completes order) ───────────────────────────────
export async function confirmDeliveryWithPin(orderId, pin, agentId = null, merchantId = null) {
  if (!hasSupabase()) return { ok: true };

  const { data, error } = await supaQuery((c) =>
    c.rpc('confirm_delivery_with_pin', {
      p_order_id: orderId,
      p_pin: pin,
      p_agent_id: agentId,
    })
  );

  if (error || !data?.ok) {
    return { ok: false, error: error?.message || data?.error || 'failed_to_confirm' };
  }

  return data;
}

// ── Proof of Delivery (POD) ───────────────────────────────────────────────────
export async function uploadDeliveryProof(orderId, base64Image) {
  const client = getClient();
  if (!client) return { error: 'no-client' };

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

    // Update order with proof URL
    const { error: updateError } = await supaQuery((c) =>
      c.from('marketplace_orders').update({ delivery_proof_url: publicUrl }).eq('id', orderId)
    );

    if (updateError) throw updateError;
    return { ok: true, url: publicUrl };
  } catch (err) {
    console.error('POD Upload Error:', err);
    return { ok: false, error: err.message };
  }
}

// ── Agent Telemetry (Breadcrumbs) ─────────────────────────────────────────────
const _telemetryCache = {};

/**
 * recordTelemetry
 * Records agent GPS coordinates with client-side throttling to save database resources.
 */
export async function recordTelemetry(agentId, orderId, lat, lng, speed = null, heading = null) {
  if (!hasSupabase()) return;

  const now = Date.now();
  const last = _telemetryCache[agentId];

  if (last) {
    const timePassed = now - last.ts;
    const distMoved = haversine(last.lat, last.lng, lat, lng) * 1000; // meters

    // Threshold: 15s OR 50m movement
    if (timePassed < 15000 && distMoved < 50) {
      return { throttled: true };
    }
  }

  // Update cache
  _telemetryCache[agentId] = { ts: now, lat, lng };

  return supaQuery((c) =>
    c.from('agent_telemetry').insert({
      agent_id: agentId,
      order_id: orderId,
      lat,
      lng,
      speed,
      heading,
    })
  );
}

// ── Fetch Pending Dispatches for Agent ────────────────────────────────────────
export async function fetchPendingDispatches(agentId) {
  if (!hasSupabase()) return [];
  const { data } = await supaQuery((c) =>
    c
      .from('delivery_dispatches')
      .select(`*, order:order_id(*, merchant:merchant_id(full_name, business_name, subcity))`)
      .eq('agent_id', agentId)
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
  );
  return data || [];
}

// ── Fetch Active Job for Agent ────────────────────────────────────────────────
export async function fetchActiveJobs(agentId) {
  if (!hasSupabase()) return [];
  const { data } = await supaQuery((c) =>
    c
      .from('marketplace_orders')
      .select(
        `*, merchant:merchant_id(full_name, business_name, subcity, woreda), buyer:buyer_id(full_name, phone)`
      )
      .eq('agent_id', agentId)
      .in('status', ['AGENT_ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'AWAITING_PIN'])
      .order('created_at', { ascending: false })
  );
  return data || [];
}

// ── Fetch Agent Delivery History ──────────────────────────────────────────────
export async function fetchAgentHistory(agentId, limit = 20) {
  if (!hasSupabase()) return [];
  const { data } = await supaQuery((c) =>
    c
      .from('marketplace_orders')
      .select(`id, product_name, total, status, delivered_at, merchant:merchant_id(business_name)`)
      .eq('agent_id', agentId)
      .eq('status', 'COMPLETED')
      .order('delivered_at', { ascending: false })
      .limit(limit)
  );
  return data || [];
}

// ── Subscribe to Dispatches (Agent Dashboard) ─────────────────────────────────
export function subscribeToAgentDispatches(agentId, onDispatch) {
  return subscribeToTable(
    `agent-dispatches-${agentId}`,
    'delivery_dispatches',
    `agent_id=eq.${agentId}`,
    onDispatch
  );
}

// ── Subscribe to Order Status (Active Job) ────────────────────────────────────
export function subscribeToOrderStatus(orderId, onUpdate) {
  return subscribeToTable(
    `order-status-${orderId}`,
    'marketplace_orders',
    `id=eq.${orderId}`,
    onUpdate
  );
}

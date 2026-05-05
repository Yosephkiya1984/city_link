import { hasSupabase, supaQuery, getClient } from './supabase';
import { Restaurant, MenuItem, FoodOrder } from '../types';
import { uid } from '../utils';
import { decode } from 'base64-arraybuffer';

import { FoodApi } from '../modules/food';

/**
 * fetchRestaurants — fetches all active restaurants.
 */
export const fetchRestaurants = FoodApi.fetchRestaurants;

/**
 * fetchFoodItems — fetches food menu items for a specific merchant.
 */
export const fetchFoodItems = FoodApi.fetchFoodItems;

/**
 * placeOrder — places a new food order using atomic purchase RPC.
 */
export const placeOrder = FoodApi.placeOrder;

/**
 * fetchMyFoodOrders — fetches food orders placed by a specific citizen.
 */
export async function fetchMyFoodOrders(userId: string) {
  return supaQuery<FoodOrder[]>((c) =>
    c
      .from('food_orders')
      .select('*')
      .eq('citizen_id', userId)
      .order('created_at', { ascending: false })
  );
}

/**
 * completeFoodOrder — processes payout for a completed food order.
 */
export const completeFoodOrder = FoodApi.completeFoodOrder;

/**
 * revealFoodOrderPin — reveals the delivery PIN for a food order with rate limiting.
 */
export const revealFoodOrderPin = FoodApi.revealFoodOrderPin;

/**
 * fetchFoodOrdersByMerchant — fetches all food orders for a merchant.
 */
export async function fetchFoodOrdersByMerchant(merchantId: string) {
  return supaQuery<FoodOrder[]>((c) =>
    c
      .from('food_orders')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(80)
  );
}

/**
 * fetchFoodOrderById — fetches a single food order by its unique ID.
 */
export async function fetchFoodOrderById(orderId: string) {
  return supaQuery<FoodOrder>((c) =>
    c
      .from('food_orders')
      .select('*')
      .eq('id', orderId)
      .single()
  );
}

// ── Merchant Dashboard Functions ───────────────────────────────────────

export const fetchRestaurantOrders = async (
  merchantId: string
): Promise<{ data: FoodOrder[]; error: string | null }> => {
  const res = await supaQuery<FoodOrder[]>((client) =>
    client
      .from('food_orders')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
  );
  return { data: res.data ?? [], error: res.error };
};

export const fetchRestaurantMenu = async (
  merchantId: string
): Promise<{ data: MenuItem[]; error: string | null }> => {

  // 1. Find the restaurant ID for this merchant
  const restRes = await supaQuery<any[]>((c) =>
    c.from('restaurants').select('id').eq('merchant_id', merchantId).limit(1)
  );

  const restaurantId = restRes.data?.[0]?.id || merchantId;

  const res = await supaQuery<MenuItem[]>((client) =>
    client
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('category', { ascending: true })
  );
  return { data: res.data ?? [], error: res.error };
};

export const fetchMerchantRestaurant = async (
  merchantId: string
): Promise<{ data: Restaurant | null; error: string | null }> => {
  const res = await supaQuery<Restaurant>((c) =>
    c.from('restaurants').select('*').eq('merchant_id', merchantId).single()
  );
  return { data: res.data, error: res.error };
};

export const updateOrderStatus = FoodApi.updateOrderStatus;

export const settleFoodOrderPayment = FoodApi.settleFoodOrderPayment;

/**
 * rejectFoodOrder — rejects a food order and triggers escrow refund to the citizen.
 */
export const rejectFoodOrder = FoodApi.rejectFoodOrder;

/**
 * dispatchFoodOrder — triggers the unified dispatch system for a food order.
 */
export async function dispatchFoodOrder(
  orderId: string,
  merchantId: string,
  lat: number | null = null,
  lng: number | null = null
) {
  const res = await supaQuery<{ ok: boolean; dispatched_count: number; error?: string }>((c) =>
    c.rpc('dispatch_order', {
      p_order_id: orderId,
      p_merchant_id: merchantId,
      p_lat: lat,
      p_lng: lng,
      p_order_type: 'FOOD',
    })
  );
  if (res.error || !res.data?.ok)
    throw res.error || new Error(res.data?.error || 'Failed to dispatch order');
  return {
    success: true,
    dispatchedCount: res.data.dispatched_count,
  };
}

export const updateMenuItem = FoodApi.updateMenuItem;

/**
 * uploadRestaurantBanner — uploads a wide banner image for a restaurant.
 * Stored in the dedicated 'restaurant-banners' bucket.
 */
export async function uploadRestaurantBanner(imageData: {
  uri: string;
  base64: string;
}): Promise<{ data: string | null; error: string | null }> {
  const client = getClient();
  if (!client) return { data: null, error: 'no-credentials' };

  try {
    const rawName = imageData.uri.split('/').pop() || `banner_${Date.now()}.jpg`;
    const fileName = `banner-${uid()}-${rawName}`;
    const contentType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    const { error: uploadError } = await client.storage
      .from('restaurant-banners')
      .upload(fileName, decode(imageData.base64), {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = client.storage.from('restaurant-banners').getPublicUrl(fileName);
    return { data: data.publicUrl, error: null };
  } catch (error: any) {
    console.error('Banner upload failed:', error.message);
    return { data: null, error: error.message };
  }
}

/**
 * updateRestaurantProfile — updates the restaurant's profile (banner, cover, name, etc.)
 */
export async function updateRestaurantProfile(
  merchantId: string,
  updates: Partial<{
    banner_url: string;
    cover_photo_url: string;
    name: string;
    description: string;
    phone: string;
    open_time: string;
    close_time: string;
    avg_delivery_minutes: number;
    delivery_fee: number;
    min_order: number;
    wifi_available: boolean;
    outdoor_seating: boolean;
    cuisine_tags: string[];
    is_open: boolean;
  }>
): Promise<{ data: any; error: string | null }> {
  const client = getClient();
  if (!client) return { data: null, error: 'No Supabase client' };

  const { data, error } = await client
    .from('restaurants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('merchant_id', merchantId)
    .select()
    .single();

  return { data, error: error?.message ?? null };
}

/**
 * fetchRestaurantTables — fetches all tables for a restaurant.
 */
export async function fetchRestaurantTables(
  merchantId: string
): Promise<{ data: any[]; error: string | null }> {
  const client = getClient();
  if (!client) return { data: [], error: null };

  const { data, error } = await client
    .from('restaurant_tables')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('table_number', { ascending: true });

  return { data: data ?? [], error: error?.message ?? null };
}

/**
 * addRestaurantTable — creates a new table for a restaurant.
 */
export async function addRestaurantTable(
  merchantId: string,
  restaurantId: string,
  tableNumber: string,
  capacity: number,
  label: string = '',
  status: 'free' | 'vip' = 'free'
): Promise<{ data: any; error: string | null }> {
  const client = getClient();
  if (!client) return { data: null, error: 'No Supabase client' };

  const { data, error } = await client
    .from('restaurant_tables')
    .insert({
      id: uid(),
      merchant_id: merchantId,
      restaurant_id: restaurantId,
      table_number: tableNumber,
      capacity,
      label,
      status,
    })
    .select()
    .single();

  return { data, error: error?.message ?? null };
}

/**
 * setTableStatus — sets the status of a restaurant table.
 */
export async function setTableStatus(
  tableId: string,
  status: 'free' | 'occupied' | 'reserved' | 'vip'
): Promise<{ error: string | null }> {
  const client = getClient();
  if (!client) return { error: 'No Supabase client' };

  const { error } = await client
    .from('restaurant_tables')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', tableId);

  return { error: error?.message ?? null };
}

export const uploadDishImage = FoodApi.uploadDishImage;

/**
 * updateStockQuantity — updates the quantity of a stock item.
 */
export async function updateStockQuantity(
  stockId: string,
  quantity: number
): Promise<{ error: string | null }> {
  const client = getClient();
  if (!client) return { error: 'No Supabase client' };

  const { error } = await client
    .from('restaurant_stock')
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq('id', stockId);

  return { error: error?.message ?? null };
}

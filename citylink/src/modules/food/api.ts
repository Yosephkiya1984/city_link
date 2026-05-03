import { supaQuery, getClient } from '../../services/supabase';
import { Restaurant, MenuItem, FoodOrder } from '../../types';
import { uid } from '../../utils';
import { decode } from 'base64-arraybuffer';

/**
 * Food Domain API
 * Handles restaurant discovery, menu management, and order processing.
 */
export const FoodApi = {
  /**
   * fetchRestaurants — fetches all active restaurants.
   */
  async fetchRestaurants(
    category?: string
  ): Promise<{ data: Restaurant[] | null; error: string | null }> {
    const client = getClient();
    if (!client) return { data: [], error: null };

    let q = client.from('restaurants').select('*').eq('is_open', true);
    if (category) {
      q = q.eq('category', category.toUpperCase());
    }

    const { data, error } = await q.order('rating', { ascending: false });
    return { data: data as Restaurant[] | null, error: error?.message ?? null };
  },

  /**
   * fetchFoodItems — fetches food menu items for a specific merchant.
   */
  async fetchFoodItems(merchantId: string) {
    const client = getClient();
    if (!client) return { data: [], error: null };

    const restRes = await client
      .from('restaurants')
      .select('id')
      .eq('merchant_id', merchantId)
      .limit(1);
    const restaurantId = restRes.data?.[0]?.id || merchantId;

    return supaQuery<MenuItem[]>((c) =>
      c.from('menu_items').select('*').eq('restaurant_id', restaurantId).eq('is_available', true)
    );
  },

  /**
   * placeOrder — places a new food order using atomic purchase RPC.
   */
  async placeOrder(
    orderData: Partial<FoodOrder> & {
      items_count: number;
      restaurant: string;
      restaurant_id: string;
      shipping_address?: string;
    }
  ) {
    const res = await supaQuery<{ ok: boolean; error?: string; data?: Record<string, unknown> }>(
      (c) =>
        c.rpc('process_food_purchase', {
          p_order_id: orderData.id,
          p_citizen_id: orderData.citizen_id,
          p_merchant_id: orderData.merchant_id,
          p_restaurant_id: orderData.restaurant_id,
          p_restaurant_name: orderData.restaurant,
          p_items_count: orderData.items_count,
          p_total: orderData.total,
          p_delivery_pin: orderData.delivery_pin,
          p_items_json: orderData.items,
          p_shipping_address: orderData.shipping_address,
          p_lat: orderData.destination_lat,
          p_lng: orderData.destination_lng,
        })
    );

    if (res.error) return { ok: false, error: res.error };
    return { ok: res.data?.ok !== false, data: res.data };
  },

  /**
   * completeFoodOrder — processes payout for a completed food order.
   */
  async completeFoodOrder(
    orderId: string,
    merchantId: string,
    pickupPin?: string
  ): Promise<{ ok: boolean; error?: string; merchantNewBalance?: number }> {
    const res = await supaQuery<{ ok: boolean; new_balance: number }>((c) =>
      c.rpc('complete_food_order_payout', {
        p_order_id: orderId,
        p_merchant_id: merchantId,
        p_pickup_pin: pickupPin || null,
      })
    );

    if (res.error) return { ok: false, error: res.error };
    return { ok: res.data?.ok !== false, merchantNewBalance: res.data?.new_balance };
  },

  /**
   * revealFoodOrderPin — reveals the delivery PIN for a food order with rate limiting.
   */
  async revealFoodOrderPin(
    orderId: string
  ): Promise<{ ok: boolean; delivery_pin?: string; error?: string }> {
    const res = await supaQuery<{ ok: boolean; delivery_pin: string; error?: string }[]>(
      (c) =>
        c.rpc('reveal_food_order_pin', {
          p_order_id: orderId,
        })
    );

    if (res.error) return { ok: false, error: res.error };
    
    // Unwrap from array if necessary (similar to marketplace fix)
    const data = Array.isArray(res.data) ? res.data[0] : res.data;
    
    if (!data?.ok) return { ok: false, error: data?.error || 'reveal_failed' };
    return { ok: true, delivery_pin: data.delivery_pin };
  },

  /**
   * updateOrderStatus — updates the status of a food order.
   */
  async updateOrderStatus(
    orderId: string,
    merchantId: string,
    status: string,
    pickupPin?: string
  ): Promise<{ ok: boolean; error: string | null }> {
    const payload: any = { status };
    if (pickupPin) payload.pickup_pin = pickupPin;

    const res = await supaQuery<void>((client) =>
      client.from('food_orders').update(payload).eq('id', orderId).eq('merchant_id', merchantId)
    );
    return { ok: !res.error, error: res.error };
  },

  /**
   * rejectFoodOrder — rejects a food order and triggers escrow refund.
   */
  async rejectFoodOrder(orderId: string, merchantId: string) {
    const res = await supaQuery<{ ok: boolean; error?: string }>((c) =>
      c.rpc('reject_food_order_refund', {
        p_order_id: orderId,
        p_merchant_id: merchantId,
      })
    );
    if (res.error || !res.data?.ok)
      throw res.error || new Error(res.data?.error || 'Failed to reject order');
    return { success: true };
  },

  /**
   * updateMenuItem — manages menu items, including auto-creating restaurants if missing.
   */
  async updateMenuItem(
    merchantId: string,
    menuItem: Partial<MenuItem>
  ): Promise<{ data: any; error: string | null }> {
    const client = getClient();
    if (!client) return { data: null, error: 'No Supabase client' };

    const restRes = await client
      .from('restaurants')
      .select('id')
      .eq('merchant_id', merchantId)
      .limit(1);

    let restaurantId: string;

    if (restRes.data && restRes.data.length > 0) {
      restaurantId = restRes.data[0].id;
    } else {
      const merchantRes = await client
        .from('merchants')
        .select('business_name')
        .eq('id', merchantId)
        .single();
      const bizName = merchantRes.data?.business_name || 'My Restaurant';

      const newRest = await client
        .from('restaurants')
        .insert({
          merchant_id: merchantId,
          name: bizName,
          category: 'GENERAL',
          is_open: true,
          gallery_json: [],
        })
        .select('id')
        .single();

      if (newRest.error)
        return { data: null, error: `Failed to auto-create restaurant: ${newRest.error.message}` };
      restaurantId = newRest.data.id;
    }

    const dbItem = { ...menuItem, restaurant_id: restaurantId };
    if ('available' in menuItem) {
      (dbItem as any).is_available = (menuItem as any).available;
      delete (dbItem as any).available;
    }
    delete (dbItem as any).created_at;

    const res = await supaQuery<MenuItem>((c) =>
      c.from('menu_items').upsert(dbItem).select().single()
    );
    return { data: res.data, error: res.error };
  },

  /**
   * uploadDishImage — uploads an image for a menu item.
   */
  async uploadDishImage(imageData: {
    uri: string;
    base64: string;
  }): Promise<{ data: string | null; error: string | null }> {
    const client = getClient();
    if (!client) return { data: null, error: 'no-credentials' };

    try {
      const fileName = `dish-${uid()}-${imageData.uri.split('/').pop() || 'dish.jpg'}`;
      const { error: uploadError } = await client.storage
        .from('menu')
        .upload(fileName, decode(imageData.base64), {
          contentType: fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;
      const { data } = client.storage.from('menu').getPublicUrl(fileName);
      return { data: data.publicUrl, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },
};

import { hasSupabase, supaQuery } from './supabase';

/**
 * fetchRestaurants — fetches all active restaurants.
 */
export async function fetchRestaurants() {
  return supaQuery((c) => c.from('restaurants').select('*').eq('is_open', true));
}

/**
 * fetchFoodItems — fetches food menu items for a specific merchant.
 */
export async function fetchFoodItems(merchantId: string) {
  return supaQuery((c) =>
    c.from('food_items').select('*').eq('merchant_id', merchantId).eq('available', true)
  );
}

/**
 * placeOrder — places a new food order using atomic purchase RPC.
 */
export async function placeOrder(orderData: any) {
  const res = await supaQuery((c) =>
    c.rpc('process_food_purchase', {
      p_order_id: orderData.id,
      p_citizen_id: orderData.citizen_id,
      p_merchant_id: orderData.merchant_id,
      p_restaurant_name: orderData.restaurant,
      p_items_count: orderData.items,
      p_total: orderData.total,
      p_delivery_pin: orderData.delivery_pin,
      p_items_json: orderData.items_json,
    })
  );

  if (res.error) return { ok: false, error: res.error };
  return { ok: true, data: res.data };
}

/**
 * fetchMyFoodOrders — fetches food orders placed by a specific citizen.
 */
export async function fetchMyFoodOrders(userId: string) {
  return supaQuery((c) =>
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
export async function completeFoodOrder(orderId: string, merchantId: string) {
  const res = await supaQuery((c) =>
    c.rpc('complete_food_order_payout', {
      p_order_id: orderId,
      p_merchant_id: merchantId,
    })
  );

  if (res.error) return { ok: false, error: res.error };
  return { ok: true, merchantNewBalance: res.data?.new_balance };
}

/**
 * fetchFoodOrdersByMerchant — fetches all food orders for a merchant.
 */
export async function fetchFoodOrdersByMerchant(merchantId: string) {
  return supaQuery((c) =>
    c
      .from('food_orders')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(80)
  );
}

// ── Merchant Dashboard Functions ───────────────────────────────────────

export const fetchRestaurantOrders = async (merchantId: string) => {
  if (!hasSupabase()) {
    return {
      data: [
        {
          id: 'order1',
          restaurant_id: merchantId,
          customer_name: 'Dawit H.',
          items: [{ name: 'Injera', quantity: 2 }],
          total: 1200,
          status: 'NEW',
          created_at: new Date().toISOString(),
        },
        {
          id: 'order2',
          restaurant_id: merchantId,
          customer_name: 'Tigist B.',
          items: [{ name: 'Tibs', quantity: 1 }],
          total: 850,
          status: 'PREPARING',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      error: null,
    };
  }
  return supaQuery((client) =>
    client
      .from('food_orders')
      .select('*')
      .eq('restaurant_id', merchantId)
      .order('created_at', { ascending: false })
  );
};

export const fetchRestaurantMenu = async (merchantId: string) => {
  if (!hasSupabase()) {
    return {
      data: [
        {
          id: 'menu1',
          restaurant_id: merchantId,
          name: 'Injera',
          category: 'Main',
          price: 450,
          available: true,
        },
        {
          id: 'menu2',
          restaurant_id: merchantId,
          name: 'Tibs',
          category: 'Main',
          price: 850,
          available: true,
        },
      ],
      error: null,
    };
  }
  return supaQuery((client) =>
    client
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', merchantId)
      .order('category', { ascending: true })
  );
};

export const updateOrderStatus = async (orderId: string, status: string): Promise<{ok: boolean, error: any}> => {
  if (!hasSupabase()) {
    return { ok: true, error: null };
  }
  const res = await supaQuery((client) => client.from('food_orders').update({ status }).eq('id', orderId));
  return { ok: !res.error, error: res.error };
};

export const updateMenuItem = async (menuItem: any): Promise<{ok: boolean, error: any}> => {
  if (!hasSupabase()) {
    return { ok: true, error: null };
  }
  const res = await supaQuery((client) => client.from('menu_items').upsert(menuItem));
  return { ok: !res.error, error: res.error };
};

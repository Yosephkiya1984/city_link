import { getClient, supaQuery, hasSupabase } from './supabase';
import { rpcDebitWallet, rpcCreditWallet } from './wallet.service';
import { uid } from '../utils';
import { decode } from 'base64-arraybuffer';

// ── Configuration ─────────────────────────────────────────────────────────────
const PRODUCT_COLS =
  '*, merchant:profiles(id, full_name, business_name, merchant_name)';
const ORDER_COLS =
  '*, buyer:profiles(full_name, phone), merchant:profiles(business_name, merchant_name)';

// Helper to map relational result to existing flat structure for backward compatibility
const mapProductMerchant = (p: any) => {
  if (!p) return p;
  const merchant = p.merchant?.[0] || p.merchant; // handle single vs array return
  return {
    ...p,
    business_name: merchant?.business_name,
    merchant_name: merchant?.merchant_name || merchant?.full_name,
  };
};

// —— Products ——————————————————————————————————————————————————————————————————

export async function fetchProducts(limit: number = 50) {
  const res = await supaQuery((c) =>
    c
      .from('products')
      .select(PRODUCT_COLS)
      .eq('status', 'active')
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(limit)
  );
  return { ...res, data: res.data?.map(mapProductMerchant) || [] };
}

export async function searchProducts(query: string, limit: number = 40) {
  if (!query?.trim()) return fetchProducts(limit);
  const res = await supaQuery((c) =>
    c
      .from('products')
      .select(PRODUCT_COLS)
      .eq('status', 'active')
      .gt('stock', 0)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit)
  );
  return { ...res, data: res.data?.map(mapProductMerchant) || [] };
}

export async function fetchProductsByCategory(category: string, limit: number = 40) {
  if (!category || category === 'All') return fetchProducts(limit);
  const res = await supaQuery((c) =>
    c
      .from('products')
      .select(PRODUCT_COLS)
      .eq('status', 'active')
      .gt('stock', 0)
      .ilike('category', category)
      .order('created_at', { ascending: false })
      .limit(limit)
  );
  return { ...res, data: res.data?.map(mapProductMerchant) || [] };
}

export async function fetchProductById(productId: string) {
  return supaQuery((c) =>
    c.from('products').select(PRODUCT_COLS).eq('id', productId).maybeSingle()
  );
}

export async function fetchMerchantInventory(merchantId: string) {
  return supaQuery((c) =>
    c
      .from('products')
      .select('*')
      .eq('merchant_id', merchantId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false })
  );
}

export async function insertProduct(product: any) {
  const officialProduct = {
    ...product,
    id: product.id || uid(),
    image_url: product.image_url || product.image,
    images_json: product.images_json || (product.images ? product.images : []),
    created_at: new Date().toISOString(),
  };
  delete (officialProduct as any).image;
  delete (officialProduct as any).images;
  return supaQuery((c) => c.from('products').insert(officialProduct).select().single());
}

export async function updateProduct(productId: string, updates: any) {
  return supaQuery((c) =>
    c
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select()
      .single()
  );
}

export async function deleteProduct(productId: string) {
  return supaQuery((c) =>
    c
      .from('products')
      .update({ status: 'removed', updated_at: new Date().toISOString() })
      .eq('id', productId)
  );
}

export async function uploadProductImage(imageData: any) {
  const client = getClient();
  if (!client) return { data: null, error: 'no-credentials' };
  try {
    const fileExt = imageData.uri.split('.').pop().toLowerCase() || 'jpg';
    const fileName = `${uid()}.${fileExt}`;
    const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;
    const { error: uploadError } = await client.storage
      .from('products')
      .upload(fileName, decode(imageData.base64), { contentType, cacheControl: '3600' });
    if (uploadError) throw uploadError;
    const { data } = client.storage.from('products').getPublicUrl(fileName);
    return { data: data.publicUrl, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// ── Orders & Escrow ──────────────────────────────────────────────────────────

// —— Orders & Escrow ——————————————————————————————————————————————————————————

export async function fetchMarketplaceOrdersByBuyer(buyerId: string) {
  // Use SECURITY DEFINER RPC to bypass RLS — works even without a live auth session
  const res = await supaQuery((c) => c.rpc('fetch_buyer_orders', { p_buyer_id: buyerId }));
  if (res.error) console.error('🔧 fetchMarketplaceOrdersByBuyer error:', res.error);
  console.log('🔧 fetchMarketplaceOrdersByBuyer count:', (res.data as any[])?.length || 0);
  return res;
}

export async function fetchMarketplaceOrdersByMerchant(merchantId: string) {
  // Use SECURITY DEFINER RPC to bypass RLS — mirrors the buyer-side pattern
  const res = await supaQuery((c) => c.rpc('fetch_merchant_orders', { p_merchant_id: merchantId }));
  if (res.error) console.error('🔧 fetchMarketplaceOrdersByMerchant error:', res.error);
  console.log('🔧 fetchMarketplaceOrdersByMerchant count:', (res.data as any[])?.length || 0);
  return res;
}

export async function executeMarketplacePurchase({
  product,
  buyerId,
  qty,
  address,
}: {
  product: any;
  buyerId: string;
  qty: number;
  address: string;
}) {
  const merchantId = product.merchant_id || product.seller_id;

  // Use atomic server-side RPC for security and consistency
  const res = await supaQuery((c) =>
    c.rpc('process_marketplace_purchase', {
      p_buyer_id: buyerId,
      p_product_id: product.id,
      p_merchant_id: merchantId,
      p_qty: qty,
      p_shipping_address: address,
    })
  );

  if (res.error) return { ok: false, error: res.error.message || 'purchase_failed' };
  const data = res.data as any;
  if (!data?.ok) return { ok: false, error: data?.error || 'purchase_failed' };

  return { ok: true, orderId: data.order_id, total: data.total };
}

export async function releaseMarketplaceEscrow(orderId: string, escrowId: string) {
  // Uses hardened release_escrow RPC
  return supaQuery((c) =>
    c.rpc('release_escrow', {
      p_order_id: orderId,
      p_escrow_id: escrowId,
      p_release_method: 'delivery_pin',
    })
  );
}

export async function openMarketplaceDispute(orderId: string, buyerId: string, reason: string) {
  const { data, error } = await supaQuery((c: any) =>
    c
      .from('marketplace_orders')
      .update({ status: 'DISPUTED', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('buyer_id', buyerId)
      .select()
      .single()
  );

  if (!error && data) {
    const orderData = data as any;
    await supaQuery((c: any) =>
      c.from('disputes').insert({
        order_id: orderId,
        buyer_id: buyerId,
        merchant_id: orderData.merchant_id,
        product_name: orderData.product_name,
        amount: orderData.total,
        reason: reason || 'Other',
        description: reason || 'Other',
        stage: 'MERCHANT_REVIEW',
        status: 'OPEN',
        raised_at: new Date().toISOString(),
      })
    );
  }

  return { ok: !error, error };
}

export async function merchantMarkShippedMarketplace(
  orderId: string,
  merchantId: string,
  pin: string
) {
  return supaQuery((c) =>
    c
      .from('marketplace_orders')
      .update({ status: 'SHIPPED', delivery_pin: pin, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('merchant_id', merchantId)
  );
}

// —— Legacy Aliases & RPC Wrappers —————————————————————————————————————————————
export async function rpcReleaseEscrow(escrowId: string, orderId: string) {
  return releaseMarketplaceEscrow(orderId, escrowId);
}

export async function rpcCancelAndRefundOrder(orderId: string, reason: string) {
  return supaQuery((c) =>
    c.rpc('cancel_and_refund_marketplace_order', {
      p_order_id: orderId,
      p_reason: reason,
    })
  );
}

// —— Metrics & Analytics ——————————————————————————————————————————————————————

export async function fetchMerchantMetrics(merchantId: string) {
  if (!hasSupabase() || !merchantId)
    return { totalRevenue: 0, activeOrders: 0, totalProducts: 0, lowStock: 0 };

  const [{ data: ordersData }, { data: productsData }] = await Promise.all([
    supaQuery((c) => c.rpc('fetch_merchant_orders', { p_merchant_id: merchantId })),
    supaQuery((c) =>
      c
        .from('products')
        .select('id, stock, status')
        .eq('merchant_id', merchantId)
        .neq('status', 'removed')
    ),
  ]);

  const orders = (ordersData as any[]) || [];
  const products = (productsData as any[]) || [];

  const allActiveStatuses = [
    'PAID',
    'DISPATCHING',
    'AGENT_ASSIGNED',
    'SHIPPED',
    'IN_TRANSIT',
    'AWAITING_PIN',
  ];
  const revenueStatuses = [...allActiveStatuses, 'COMPLETED'];

  const totalRevenue = orders
    .filter((o) => revenueStatuses.includes(o.status))
    .reduce((sum, o) => sum + Number(o.total || 0), 0);
  const activeOrders = orders.filter((o) => allActiveStatuses.includes(o.status)).length;
  const totalProducts = products.filter((p) => p.status === 'active').length;
  const lowStock = products.filter((p) => (p.stock || 0) <= 5 && p.status === 'active').length;

  return { totalRevenue, activeOrders, totalProducts, lowStock };
}

export async function fetchMerchantSalesHistory(merchantId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  // Use RPC to bypass RLS, then filter client-side
  const { data: allOrdersData } = await supaQuery((c) =>
    c.rpc('fetch_merchant_orders', { p_merchant_id: merchantId })
  );
  const allOrders = (allOrdersData as any[]) || [];

  const salesStatuses = [
    'PAID',
    'DISPATCHING',
    'AGENT_ASSIGNED',
    'SHIPPED',
    'IN_TRANSIT',
    'AWAITING_PIN',
    'COMPLETED',
  ];
  const orders = allOrders.filter(
    (o) => salesStatuses.includes(o.status) && o.created_at >= sevenDaysAgo.toISOString()
  );

  const dailyMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap[d.toISOString().split('T')[0]] = 0;
  }
  orders?.forEach((o) => {
    const key = o.created_at.split('T')[0];
    if (dailyMap[key] !== undefined) dailyMap[key] += Number(o.total || 0);
  });
  const values = Object.values(dailyMap);
  const maxVal = Math.max(...values, 1);
  return {
    curve: values.map((v: number) => v / maxVal),
    raw: values,
    labels: Object.keys(dailyMap),
  };
}
// —— Unified Service Object ———————————————————————————————————————————————————

export const marketplaceService = {
  /**
   * getActiveProducts — fetches all active products with stock > 0
   */
  getActiveProducts: async (limit: number = 50) => {
    const { data, error } = await fetchProducts(limit);
    if (error) throw error || new Error('Failed to fetch products');
    return (data as any[]) || [];
  },

  /**
   * getProductsByCategory — filters products by category string
   */
  getProductsByCategory: async (category: string, limit: number = 50) => {
    const { data, error } = await fetchProductsByCategory(category, limit);
    if (error) throw error || new Error(`Failed to fetch category ${category}`);
    return (data as any[]) || [];
  },

  /**
   * searchProducts — performs a fuzzy search on name, title, category, description
   */
  searchProducts: async (query: string, limit: number = 50) => {
    const { data, error } = await searchProducts(query, limit);
    if (error) throw error || new Error(`Failed to search for ${query}`);
    return (data as any[]) || [];
  },

  /**
   * completePurchase — unified wrapper for marketplace transaction & escrow
   */
  completePurchase: async ({
    product,
    buyerId,
    qty,
    shippingAddress,
  }: {
    product: any;
    buyerId: string;
    qty: number;
    shippingAddress: string;
  }) => {
    const res = await executeMarketplacePurchase({
      product,
      buyerId,
      qty,
      address: shippingAddress,
    });
    if (!res.ok) throw new Error(res.error || 'Purchase failed');
    return { success: true, orderId: res.orderId, total: res.total };
  },

  /**
   * fetchWalletTransactions — fetches history for a specific wallet
   */
  fetchWalletTransactions: async (walletId: string) => {
    return supaQuery((c) =>
      c
        .from('transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .limit(20)
    );
  },

  /**
   * getMerchantSalesHistory — daily sales curve for merchant dashboard
   */
  getMerchantSalesHistory: async (merchantId: string) => {
    return fetchMerchantSalesHistory(merchantId);
  },

  /**
   * getMerchantOpenDisputes — fetches currently disputed orders for merchant
   */
  getMerchantOpenDisputes: async (merchantId: string) => {
    const { data }: any = await supaQuery((c) =>
      c.rpc('fetch_merchant_orders', { p_merchant_id: merchantId })
    );
    return (data || []).filter((o: any) => o.status === 'DISPUTED');
  },

  /**
   * updateProduct — updates existing product listing
   */
  updateProduct: async (productId: string, updates: any) => {
    return updateProduct(productId, updates);
  },

  /**
   * deleteProduct — soft-deletes a product listing
   */
  deleteProduct: async (productId: string) => {
    return deleteProduct(productId);
  },

  /**
   * shipOrder — initiates agent search (DISPATCHING) without generating PIN yet
   */
  shipOrder: async (
    orderId: string,
    merchantId: string,
    lat: number | null = null,
    lng: number | null = null
  ) => {
    // Uses dispatch_marketplace_order RPC
    const { data, error } = (await supaQuery((c) =>
      c.rpc('dispatch_marketplace_order', {
        p_order_id: orderId,
        p_merchant_id: merchantId,
        p_lat: lat,
        p_lng: lng,
      })
    )) as any;
    if (error || !data?.ok) throw error || new Error(data?.error || 'Failed to dispatch order');
    return {
      success: true,
      dispatchedCount: data.dispatched_count,
    };
  },

  /**
   * confirmPickup — confirms that the delivery agent has taken the item
   */
  confirmPickup: async (orderId: string, userId: string) => {
    const { data, error } = (await supaQuery((c) =>
      c.rpc('confirm_order_pickup', {
        p_order_id: orderId,
        p_user_id: userId,
      })
    )) as any;
    if (error || !data?.ok) throw error || new Error(data?.error || 'Pickup confirmation failed');
    return {
      success: true,
      status: data.status,
      delivery_pin: data.delivery_pin, // Only available if both confirmed
    };
  },

  /**
   * cancelOrder — cancels order and triggers potential refund logic
   */
  cancelOrder: async (orderId: string, reason: string) => {
    // Use RPC to cancel + refund escrow atomically
    const { data, error } = (await supaQuery((c) =>
      c.rpc('cancel_and_refund_marketplace_order', {
        p_order_id: orderId,
        p_reason: reason || 'cancelled_by_merchant',
      })
    )) as any;
    if (error) return { success: false, error };
    return { success: data?.ok === true, error: data?.error || null };
  },

  /**
   * subscribeToProducts — real-time helper for product updates
   */
  subscribeToProducts: (callback: any) => {
    const { subscribeToTable } = require('./supabase');
    return subscribeToTable('products-realtime', 'products', null, callback);
  },
};

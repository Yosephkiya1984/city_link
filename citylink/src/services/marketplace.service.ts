import { getClient, supaQuery, hasSupabase } from './supabase';
import { rpcDebitWallet, rpcCreditWallet } from './wallet.service';
import { uid } from '../utils';
import { decode } from 'base64-arraybuffer';

// ── Configuration ─────────────────────────────────────────────────────────────
const PRODUCT_COLS =
  'id, name, title, description, price, category, image_url, images_json, stock, status, condition, merchant_id, created_at, updated_at';
const ORDER_COLS =
  'id, escrow_id, buyer_id, product_id, quantity, shipping_address, tracking_number, created_at, merchant_id, product_name, qty, total, status, escrow_release_at, updated_at, delivery_pin, expires_at';

// ── Helper: Attach Profiles ───────────────────────────────────────────────────
const attachMerchantProfiles = async (products) => {
  if (!products || products.length === 0) return products;
  const merchantIds = [...new Set(products.map((p) => p.merchant_id).filter(Boolean))];
  if (merchantIds.length === 0) return products;

  const { data: profiles } = await supaQuery((c) =>
    c.from('profiles').select('id, full_name, business_name, merchant_name').in('id', merchantIds)
  );

  if (profiles) {
    const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
    return products.map((p) => ({
      ...p,
      business_name: profileMap[p.merchant_id]?.business_name,
      merchant_name:
        profileMap[p.merchant_id]?.merchant_name || profileMap[p.merchant_id]?.full_name,
    }));
  }
  return products;
};

// ── Products ──────────────────────────────────────────────────────────────────

export async function fetchProducts(limit = 50) {
  const res = await supaQuery((c) =>
    c
      .from('products')
      .select(PRODUCT_COLS)
      .eq('status', 'active')
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(limit)
  );
  return { ...res, data: await attachMerchantProfiles(res.data) };
}

export async function searchProducts(query, limit = 40) {
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
  return { ...res, data: await attachMerchantProfiles(res.data) };
}

export async function fetchProductsByCategory(category, limit = 40) {
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
  return { ...res, data: await attachMerchantProfiles(res.data) };
}

export async function fetchProductById(productId) {
  return supaQuery((c) =>
    c.from('products').select(PRODUCT_COLS).eq('id', productId).maybeSingle()
  );
}

export async function fetchMerchantInventory(merchantId) {
  return supaQuery((c) =>
    c
      .from('products')
      .select('*')
      .eq('merchant_id', merchantId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false })
  );
}

export async function insertProduct(product) {
  const officialProduct = {
    ...product,
    id: product.id || uid(),
    image_url: product.image_url || product.image,
    images_json: product.images_json || (product.images ? product.images : []),
    created_at: new Date().toISOString(),
  };
  delete officialProduct.image;
  delete officialProduct.images;
  return supaQuery((c) => c.from('products').insert(officialProduct).select().single());
}

export async function updateProduct(productId, updates) {
  return supaQuery((c) =>
    c
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select()
      .single()
  );
}

export async function deleteProduct(productId) {
  return supaQuery((c) =>
    c
      .from('products')
      .update({ status: 'removed', updated_at: new Date().toISOString() })
      .eq('id', productId)
  );
}

export async function uploadProductImage(imageData) {
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
  } catch (error) {
    return { data: null, error: error.message };
  }
}

// ── Orders & Escrow ──────────────────────────────────────────────────────────

export async function fetchMarketplaceOrdersByBuyer(buyerId) {
  // Use SECURITY DEFINER RPC to bypass RLS — works even without a live auth session
  const res = await supaQuery((c) => c.rpc('fetch_buyer_orders', { p_buyer_id: buyerId }));
  if (res.error) console.error('🔧 fetchMarketplaceOrdersByBuyer error:', res.error);
  console.log('🔧 fetchMarketplaceOrdersByBuyer count:', res.data?.length || 0);
  return res;
}

export async function fetchMarketplaceOrdersByMerchant(merchantId) {
  // Use SECURITY DEFINER RPC to bypass RLS — mirrors the buyer-side pattern
  const res = await supaQuery((c) => c.rpc('fetch_merchant_orders', { p_merchant_id: merchantId }));
  if (res.error) console.error('🔧 fetchMarketplaceOrdersByMerchant error:', res.error);
  console.log('🔧 fetchMarketplaceOrdersByMerchant count:', res.data?.length || 0);
  return res;
}

export async function executeMarketplacePurchase({ product, buyerId, qty, address }) {
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
  if (!res.data?.ok) return { ok: false, error: res.data?.error || 'purchase_failed' };

  return { ok: true, orderId: res.data.order_id, total: res.data.total };
}

export async function releaseMarketplaceEscrow(orderId, escrowId) {
  // Uses hardened release_escrow RPC
  return supaQuery((c) =>
    c.rpc('release_escrow', {
      p_order_id: orderId,
      p_escrow_id: escrowId,
      p_release_method: 'delivery_pin',
    })
  );
}

export async function openMarketplaceDispute(orderId, buyerId, reason) {
  const { data, error } = await supaQuery((c) =>
    c
      .from('marketplace_orders')
      .update({ status: 'DISPUTED', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('buyer_id', buyerId)
      .select()
      .single()
  );

  if (!error && data) {
    await supaQuery((c) =>
      c.from('disputes').insert({
        order_id: orderId,
        buyer_id: buyerId,
        merchant_id: data.merchant_id,
        product_name: data.product_name,
        amount: data.total,
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

export async function merchantMarkShippedMarketplace(orderId, merchantId, pin) {
  return supaQuery((c) =>
    c
      .from('marketplace_orders')
      .update({ status: 'SHIPPED', delivery_pin: pin, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('merchant_id', merchantId)
  );
}

// ── Legacy Aliases & RPC Wrappers ─────────────────────────────────────────────
export async function rpcReleaseEscrow(escrowId, orderId) {
  return releaseMarketplaceEscrow(orderId, escrowId);
}

export async function rpcCancelAndRefundOrder(orderId, reason) {
  return supaQuery((c) =>
    c.rpc('cancel_and_refund_marketplace_order', {
      p_order_id: orderId,
      p_reason: reason,
    })
  );
}

// ── Metrics & Analytics ──────────────────────────────────────────────────────

export async function fetchMerchantMetrics(merchantId) {
  if (!hasSupabase() || !merchantId)
    return { totalRevenue: 0, activeOrders: 0, totalProducts: 0, lowStock: 0 };

  const [{ data: orders }, { data: products }] = await Promise.all([
    supaQuery((c) => c.rpc('fetch_merchant_orders', { p_merchant_id: merchantId })),
    supaQuery((c) =>
      c
        .from('products')
        .select('id, stock, status')
        .eq('merchant_id', merchantId)
        .neq('status', 'removed')
    ),
  ]);

  const allActiveStatuses = [
    'PAID',
    'DISPATCHING',
    'AGENT_ASSIGNED',
    'SHIPPED',
    'IN_TRANSIT',
    'AWAITING_PIN',
  ];
  const revenueStatuses = [...allActiveStatuses, 'COMPLETED'];

  const totalRevenue = (orders || [])
    .filter((o) => revenueStatuses.includes(o.status))
    .reduce((sum, o) => sum + Number(o.total || 0), 0);
  const activeOrders = (orders || []).filter((o) => allActiveStatuses.includes(o.status)).length;
  const totalProducts = (products || []).filter((p) => p.status === 'active').length;
  const lowStock = (products || []).filter(
    (p) => (p.stock || 0) <= 5 && p.status === 'active'
  ).length;

  return { totalRevenue, activeOrders, totalProducts, lowStock };
}

export async function fetchMerchantSalesHistory(merchantId) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  // Use RPC to bypass RLS, then filter client-side
  const { data: allOrders } = await supaQuery((c) =>
    c.rpc('fetch_merchant_orders', { p_merchant_id: merchantId })
  );
  const salesStatuses = [
    'PAID',
    'DISPATCHING',
    'AGENT_ASSIGNED',
    'SHIPPED',
    'IN_TRANSIT',
    'AWAITING_PIN',
    'COMPLETED',
  ];
  const orders = (allOrders || []).filter(
    (o) => salesStatuses.includes(o.status) && o.created_at >= sevenDaysAgo.toISOString()
  );

  const dailyMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap[d.toISOString().split('T')[0]] = 0;
  }
  orders?.forEach((o) => {
    const key = o.created_at.split('T')[0];
    if (dailyMap[key] !== undefined) dailyMap[key] += Number(o.total || 0);
  });
  const values = Object.values(dailyMap) as number[];
  const maxVal = Math.max(...values, 1);
  return {
    curve: values.map((v: number) => v / maxVal),
    raw: values,
    labels: Object.keys(dailyMap),
  };
}
// ── Unified Service Object ───────────────────────────────────────────────────

export const marketplaceService = {
  /**
   * getActiveProducts — fetches all active products with stock > 0
   */
  getActiveProducts: async (limit = 50) => {
    const { data, error } = await fetchProducts(limit);
    if (error) throw error || new Error('Failed to fetch products');
    return data || [];
  },

  /**
   * getProductsByCategory — filters products by category string
   */
  getProductsByCategory: async (category, limit = 50) => {
    const { data, error } = await fetchProductsByCategory(category, limit);
    if (error) throw error || new Error(`Failed to fetch category ${category}`);
    return data || [];
  },

  /**
   * searchProducts — performs a fuzzy search on name, title, category, description
   */
  searchProducts: async (query, limit = 50) => {
    const { data, error } = await searchProducts(query, limit);
    if (error) throw error || new Error(`Failed to search for ${query}`);
    return data || [];
  },

  /**
   * completePurchase — unified wrapper for marketplace transaction & escrow
   */
  completePurchase: async ({ product, buyerId, qty, shippingAddress }) => {
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
  fetchWalletTransactions: async (walletId) => {
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
  getMerchantSalesHistory: async (merchantId) => {
    return fetchMerchantSalesHistory(merchantId);
  },

  /**
   * getMerchantOpenDisputes — fetches currently disputed orders for merchant
   */
  getMerchantOpenDisputes: async (merchantId) => {
    const { data } = await supaQuery((c) =>
      c.rpc('fetch_merchant_orders', { p_merchant_id: merchantId })
    );
    return (data || []).filter((o) => o.status === 'DISPUTED');
  },

  /**
   * updateProduct — updates existing product listing
   */
  updateProduct: async (productId, updates) => {
    return updateProduct(productId, updates);
  },

  /**
   * deleteProduct — soft-deletes a product listing
   */
  deleteProduct: async (productId) => {
    return deleteProduct(productId);
  },

  /**
   * shipOrder — initiates agent search (DISPATCHING) without generating PIN yet
   */
  shipOrder: async (orderId, merchantId, lat = null, lng = null) => {
    // Uses dispatch_marketplace_order RPC
    const { data, error } = await supaQuery((c) =>
      c.rpc('dispatch_marketplace_order', {
        p_order_id: orderId,
        p_merchant_id: merchantId,
        p_lat: lat,
        p_lng: lng,
      })
    );
    if (error || !data?.ok) throw error || new Error(data?.error || 'Failed to dispatch order');
    return {
      success: true,
      dispatchedCount: data.dispatched_count,
    };
  },

  /**
   * confirmPickup — confirms that the delivery agent has taken the item
   */
  confirmPickup: async (orderId, userId) => {
    const { data, error } = await supaQuery((c) =>
      c.rpc('confirm_order_pickup', {
        p_order_id: orderId,
        p_user_id: userId,
      })
    );
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
  cancelOrder: async (orderId, reason) => {
    // Use RPC to cancel + refund escrow atomically
    const { data, error } = await supaQuery((c) =>
      c.rpc('cancel_and_refund_marketplace_order', {
        p_order_id: orderId,
        p_reason: reason || 'cancelled_by_merchant',
      })
    );
    if (error) return { success: false, error };
    return { success: data?.ok === true, error: data?.error || null };
  },

  /**
   * subscribeToProducts — real-time helper for product updates
   */
  subscribeToProducts: (callback) => {
    const { subscribeToTable } = require('./supabase');
    return subscribeToTable('products-realtime', 'products', null, callback);
  },
};

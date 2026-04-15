import { getClient, supaQuery, hasSupabase } from './supabase';
import { rpcDebitWallet, rpcCreditWallet } from './wallet.service';
import { uid } from '../utils';
import { decode } from 'base64-arraybuffer';
import { 
  Product, 
  MarketplaceOrder, 
  Dispute, 
  MerchantMetrics, 
  User 
} from '../types';

// ── Configuration ─────────────────────────────────────────────────────────────
const PRODUCT_COLS =
  '*, merchant:profiles(id, full_name, business_name, merchant_name)';
const ORDER_COLS =
  '*, buyer:profiles(full_name, phone), merchant:profiles(business_name, merchant_name)';

/**
 * Type for product joined with merchant info from Supabase
 */
interface ProductWithMerchant extends Product {
  merchant?: {
    id: string;
    full_name: string;
    business_name: string;
    merchant_name: string;
  } | {
    id: string;
    full_name: string;
    business_name: string;
    merchant_name: string;
  }[];
}

// Helper to map relational result to existing flat structure for backward compatibility
const mapProductMerchant = (p: ProductWithMerchant): Product => {
  if (!p) return p;
  const rawMerchant = p.merchant;
  const merchant = Array.isArray(rawMerchant) ? rawMerchant[0] : rawMerchant;
  
  return {
    ...p,
    business_name: merchant?.business_name,
    merchant_name: merchant?.merchant_name || merchant?.full_name,
  };
};

// —— Products ——————————————————————————————————————————————————————————————————

export async function fetchProducts(limit: number = 50) {
  const res = await supaQuery<ProductWithMerchant[]>((c) =>
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
  const res = await supaQuery<ProductWithMerchant[]>((c) =>
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
  const res = await supaQuery<ProductWithMerchant[]>((c) =>
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
  return supaQuery<ProductWithMerchant>((c) =>
    c.from('products').select(PRODUCT_COLS).eq('id', productId).maybeSingle()
  );
}

export async function fetchMerchantInventory(merchantId: string) {
  return supaQuery<Product[]>((c) =>
    c
      .from('products')
      .select('*')
      .eq('merchant_id', merchantId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false })
  );
}

export async function insertProduct(product: Partial<Product>) {
  const officialProduct: Partial<Product> = {
    ...product,
    id: product.id || uid(),
    created_at: new Date().toISOString(),
  };
  
  // Clean up any legacy fields that might be passed from UI
  const { image, images, ...payload } = officialProduct as (Partial<Product> & { image?: string; images?: any });
  if (image && !payload.image_url) (payload as any).image_url = image;
  if (images && !payload.images_json) (payload as any).images_json = images;

  return supaQuery<Product>((c) => (c.from('products') as any).insert(payload).select().single());
}

export async function updateProduct(productId: string, updates: Partial<Product>) {
  return supaQuery<Product>((c) =>
    c
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select()
      .single()
  );
}

export async function deleteProduct(productId: string) {
  return supaQuery<void>((c) =>
    c
      .from('products')
      .update({ status: 'removed', updated_at: new Date().toISOString() })
      .eq('id', productId)
  );
}

export async function uploadProductImage(imageData: { uri: string; base64: string }): Promise<{ data: string | null; error: string | null }> {
  const client = getClient();
  if (!client) return { data: null, error: 'no-credentials' };
  try {
    const fileExt = imageData.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${uid()}.${fileExt}`;
    const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;
    const { error: uploadError } = await client.storage
      .from('products')
      .upload(fileName, decode(imageData.base64), { contentType, cacheControl: '3600' });
    if (uploadError) throw uploadError;
    const { data } = client.storage.from('products').getPublicUrl(fileName);
    return { data: data.publicUrl, error: null };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { data: null, error: errorMsg };
  }
}

// ── Orders & Escrow ──────────────────────────────────────────────────────────

export async function fetchMarketplaceOrdersByBuyer(buyerId: string) {
  return supaQuery<MarketplaceOrder[]>((c) => c.rpc('fetch_buyer_orders', { p_buyer_id: buyerId }));
}

export async function fetchMarketplaceOrdersByMerchant(merchantId: string) {
  return supaQuery<MarketplaceOrder[]>((c) => c.rpc('fetch_merchant_orders', { p_merchant_id: merchantId }));
}

export async function executeMarketplacePurchase({
  product,
  buyerId,
  qty,
  address,
}: {
  product: Product;
  buyerId: string;
  qty: number;
  address: string;
}) {
  const merchantId = product.merchant_id;

  const res = await supaQuery<{ ok: boolean; order_id: string; total: number; error?: string }>((c) =>
    c.rpc('process_marketplace_purchase', {
      p_buyer_id: buyerId,
      p_product_id: product.id,
      p_merchant_id: merchantId,
      p_qty: qty,
      p_shipping_address: address,
    })
  );

  if (res.error) return { ok: false, error: res.error || 'purchase_failed' };
  const data = res.data;
  if (!data?.ok) return { ok: false, error: data?.error || 'purchase_failed' };

  return { ok: true, orderId: data.order_id, total: data.total };
}

export async function releaseMarketplaceEscrow(orderId: string, escrowId: string) {
  return supaQuery<void>((c) =>
    c.rpc('release_escrow', {
      p_order_id: orderId,
      p_escrow_id: escrowId,
      p_release_method: 'delivery_pin',
    })
  );
}

export async function openMarketplaceDispute(orderId: string, buyerId: string, reason: string) {
  const { data, error } = await supaQuery<MarketplaceOrder>((c) =>
    c
      .from('marketplace_orders')
      .update({ status: 'DISPUTED', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('buyer_id', buyerId)
      .select()
      .single()
  );

  if (!error && data) {
    await supaQuery<Dispute>((c) =>
      c.from('disputes').insert({
        order_id: orderId,
        buyer_id: buyerId,
        merchant_id: data.merchant_id,
        product_name: data.product_name || 'Generic Product',
        amount: data.total,
        reason: reason || 'Other',
        description: reason || 'Other',
        stage: 'before_pin',
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
  return supaQuery<void>((c) =>
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
  return supaQuery<{ ok: boolean; error?: string }>((c) =>
    c.rpc('cancel_and_refund_marketplace_order', {
      p_order_id: orderId,
      p_reason: reason,
    })
  );
}

// —— Metrics & Analytics ——————————————————————————————————————————————————————

export async function fetchMerchantMetrics(merchantId: string): Promise<MerchantMetrics> {
  if (!hasSupabase() || !merchantId)
    return { totalRevenue: 0, activeOrders: 0, totalProducts: 0, lowStock: 0 };

  const [{ data: ordersData }, { data: productsData }] = await Promise.all([
    fetchMarketplaceOrdersByMerchant(merchantId),
    supaQuery<Pick<Product, 'id' | 'stock' | 'status'>[]>((c) =>
      c
        .from('products')
        .select('id, stock, status')
        .eq('merchant_id', merchantId)
        .neq('status', 'removed')
    ),
  ]);

  const orders = ordersData || [];
  const products = productsData || [];

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
  
  const { data: allOrdersData } = await fetchMarketplaceOrdersByMerchant(merchantId);
  const allOrders = allOrdersData || [];

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
  getActiveProducts: async (limit: number = 50) => {
    const { data } = await fetchProducts(limit);
    return data || [];
  },

  getProductsByCategory: async (category: string, limit: number = 50) => {
    const { data } = await fetchProductsByCategory(category, limit);
    return data || [];
  },

  searchProducts: async (query: string, limit: number = 50) => {
    const { data } = await searchProducts(query, limit);
    return data || [];
  },

  completePurchase: async ({
    product,
    buyerId,
    qty,
    shippingAddress,
  }: {
    product: Product;
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

  getMerchantSalesHistory: async (merchantId: string) => {
    return fetchMerchantSalesHistory(merchantId);
  },

  getMerchantOpenDisputes: async (merchantId: string) => {
    const { data } = await fetchMarketplaceOrdersByMerchant(merchantId);
    return (data || []).filter((o) => o.status === 'DISPUTED');
  },

  updateProduct: async (productId: string, updates: Partial<Product>) => {
    return updateProduct(productId, updates);
  },

  deleteProduct: async (productId: string) => {
    return deleteProduct(productId);
  },

  shipOrder: async (
    orderId: string,
    merchantId: string,
    lat: number | null = null,
    lng: number | null = null
  ) => {
    const res = await supaQuery<{ ok: boolean; dispatched_count: number; error?: string }>((c) =>
      c.rpc('dispatch_marketplace_order', {
        p_order_id: orderId,
        p_merchant_id: merchantId,
        p_lat: lat,
        p_lng: lng,
      })
    );
    if (res.error || !res.data?.ok) throw res.error || new Error(res.data?.error || 'Failed to dispatch order');
    return {
      success: true,
      dispatchedCount: res.data.dispatched_count,
    };
  },

  confirmPickup: async (orderId: string, userId: string) => {
    const res = await supaQuery<{ ok: boolean; status: string; delivery_pin?: string; error?: string }>((c) =>
      c.rpc('confirm_order_pickup', {
        p_order_id: orderId,
        p_user_id: userId,
      })
    );
    if (res.error || !res.data?.ok) throw res.error || new Error(res.data?.error || 'Pickup confirmation failed');
    return {
      success: true,
      status: res.data.status,
      delivery_pin: res.data.delivery_pin,
    };
  },

  cancelOrder: async (orderId: string, reason: string) => {
    const { data, error } = await supaQuery<{ ok: boolean; error?: string }>((c) =>
      c.rpc('cancel_and_refund_marketplace_order', {
        p_order_id: orderId,
        p_reason: reason || 'cancelled_by_merchant',
      })
    );
    if (error) return { success: false, error };
    return { success: data?.ok === true, error: data?.error || null };
  },

  subscribeToProducts: (callback: (payload: any) => void) => {
    const { subscribeToTable } = require('./supabase');
    return subscribeToTable('products-realtime', 'products', null, callback);
  },
};

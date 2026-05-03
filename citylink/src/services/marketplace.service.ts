import { getClient, supaQuery, hasSupabase, subscribeToTable } from './supabase';
import { uid } from '../utils';
import { decode } from 'base64-arraybuffer';
import { Product, MarketplaceOrder, Dispute, MerchantMetrics } from '../types';

import { MarketplaceApi, ProductWithMerchant } from '../modules/marketplace';

// —— Products ——————————————————————————————————————————————————————————————————

export async function fetchProducts(limit: number = 50) {
  return MarketplaceApi.fetchProducts(limit);
}

export async function searchProducts(query: string, limit: number = 40) {
  return MarketplaceApi.searchProducts(query, limit);
}

export async function fetchProductsByCategory(category: string, limit: number = 40) {
  return MarketplaceApi.fetchProductsByCategory(category, limit);
}

export async function fetchProductById(productId: string) {
  return MarketplaceApi.fetchProductById(productId);
}

export async function fetchMerchantInventory(merchantId: string) {
  return MarketplaceApi.fetchMerchantInventory(merchantId);
}

export async function insertProduct(product: Partial<Product>) {
  return MarketplaceApi.insertProduct(product);
}

export async function updateProduct(
  productId: string,
  merchantId: string,
  updates: Partial<Product>
) {
  return MarketplaceApi.updateProduct(productId, merchantId, updates);
}

export async function deleteProduct(productId: string, merchantId: string) {
  return MarketplaceApi.deleteProduct(productId, merchantId);
}

export async function uploadProductImage(imageData: {
  uri: string;
  base64: string;
}): Promise<{ data: string | null; error: string | null }> {
  const client = getClient();
  if (!client) return { data: null, error: 'no-credentials' };

  try {
    // Extract file info from URI and prefix with UUID to prevent bucket collisions
    // between merchants who upload files with the same original name (e.g. "product.jpg")
    const rawName = imageData.uri.split('/').pop() || `image_${Date.now()}.jpg`;
    const fileName = `${uid()}-${rawName}`; // 🛡️ FIX (HIGH-4): Namespaced per upload
    const fileSize = (imageData.base64.length * 3) / 4; // Approximate base64 to bytes

    const contentType = fileName.toLowerCase().endsWith('.png')
      ? 'image/png'
      : fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')
        ? 'image/jpeg'
        : fileName.toLowerCase().endsWith('.gif')
          ? 'image/gif'
          : fileName.toLowerCase().endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg';

    // Validate image before upload
    const isValid = await supaQuery((c) =>
      c.rpc('validate_image_upload', {
        p_file_name: fileName,
        p_content_type: contentType,
        p_file_size_bytes: fileSize,
      })
    );

    if (isValid.error || !isValid.data) {
      return {
        data: null,
        error: 'Invalid image file. Only JPG, PNG, GIF, WebP under 5MB allowed.',
      };
    }
    const { error: uploadError } = await client.storage
      .from('products')
      .upload(fileName, decode(imageData.base64), {
        contentType,
        cacheControl: '3600',
        upsert: false, // Prevent overwriting existing files
      });

    if (uploadError) {
      // Handle specific storage errors
      if (uploadError.message.includes('already exists')) {
        return { data: null, error: 'File already exists. Please rename and try again.' };
      }
      throw uploadError;
    }

    const { data } = client.storage.from('products').getPublicUrl(fileName);
    return { data: data.publicUrl, error: null };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Image upload failed:', errorMsg);
    return { data: null, error: `Upload failed: ${errorMsg}` };
  }
}

// ── Orders & Escrow ──────────────────────────────────────────────────────────

export async function fetchMarketplaceOrdersByBuyer(buyerId: string) {
  return supaQuery<MarketplaceOrder[]>((c) => c.rpc('fetch_buyer_orders', { p_buyer_id: buyerId }));
}

export async function fetchMarketplaceOrdersByMerchant(merchantId: string) {
  return supaQuery<MarketplaceOrder[]>((c) =>
    c.rpc('fetch_merchant_orders', { p_merchant_id: merchantId })
  );
}

export async function executeMarketplacePurchase({
  product,
  buyerId,
  qty,
  address,
  deliveryFee = 0,
  idempotencyKey,
}: {
  product: Product;
  buyerId: string;
  qty: number;
  address: string;
  deliveryFee?: number;
  idempotencyKey?: string;
}) {
  const merchantId = product.merchant_id;
  const iKey = idempotencyKey || `purchase-${uid()}`;

  const res = await supaQuery<{ ok: boolean; order_id: string; total: number; error?: string }>(
    (c) =>
      c.rpc('process_marketplace_purchase', {
        p_buyer_id: buyerId,
        p_product_id: product.id,
        p_merchant_id: merchantId,
        p_qty: qty,
        p_shipping_address: address,
        p_delivery_fee: deliveryFee,
        p_expected_price: product.price,
        p_idempotency_key: iKey,
      })
  );

  if (res.error) return { ok: false, error: res.error || 'purchase_failed' };
  const data = res.data;
  if (!data?.ok) return { ok: false, error: data?.error || 'purchase_failed' };

  return { ok: true, orderId: data.order_id, total: data.total };
}

export async function releaseMarketplaceEscrow(orderId: string, escrowId: string, pin?: string) {
  return supaQuery<void>((c) =>
    c.rpc('release_escrow', {
      p_escrow_id: escrowId,
      p_order_id: orderId,
      p_release_method: pin ? 'delivery_pin' : 'manual_confirmation',
      p_delivery_pin: pin,
    })
  );
}

export async function requestWithdrawal(
  userId: string,
  amount: number,
  bankName: string,
  accountNum: string
) {
  return supaQuery<{ ok: boolean; new_balance: number; error?: string }>((c) =>
    c.rpc('request_merchant_withdrawal', {
      p_user_id: userId,
      p_amount: amount,
      p_bank_name: bankName,
      p_account_number: accountNum,
    })
  );
}

export async function openMarketplaceDispute(orderId: string, buyerId: string, reason: string) {
  const res = await supaQuery<{ success: boolean; error?: string }>((c) =>
    c.rpc('open_order_dispute', {
      p_order_id: orderId,
      p_buyer_id: buyerId,
      p_reason: reason || 'Other',
    })
  );

  return {
    ok: res.data?.success === true,
    error: res.error || (res.data && !res.data.success ? res.data.error : null),
  };
}

export async function merchantMarkShippedMarketplace(
  orderId: string,
  merchantId: string,
  pin: string
) {
  // Use RPC to enforce server-side validation:
  // - Order must be in PAID state (not already shipped/cancelled)
  // - Merchant must be the order owner
  // - Merchant must have APPROVED status
  // - PIN format is validated server-side
  return supaQuery<{ ok: boolean; error?: string }>((c) =>
    c.rpc('merchant_mark_shipped', {
      p_order_id: orderId,
      p_merchant_id: merchantId,
      p_delivery_pin: pin,
    })
  );
}

export async function confirmAgentHandoverMarketplace(
  orderId: string,
  agentId: string,
  pickupPin: string
) {
  return supaQuery<{ ok: boolean; status?: string; error?: string }>((c) =>
    c.rpc('confirm_agent_handover', {
      p_order_id: orderId,
      p_agent_id: agentId,
      p_pickup_pin: pickupPin,
    })
  );
}

export async function rejectMarketplaceDelivery(
  orderId: string,
  buyerId: string,
  reasonCode: string,
  comment: string = ''
) {
  return supaQuery<{ ok: boolean; status?: string; error?: string }>((c) =>
    c.rpc('reject_delivery_by_buyer', {
      p_order_id: orderId,
      p_buyer_id: buyerId,
      p_reason_code: reasonCode,
      p_comment: comment,
    })
  );
}

/**
 * ADMIN ONLY: Resolves a marketplace dispute with a specific payout logic.
 */
export async function resolveMarketplaceDispute(
  orderId: string,
  resolutionType: 'BUYER_FAULT' | 'MERCHANT_AT_FAULT' | 'ORDER_CANCELLED_REFUND'
) {
  return supaQuery<{ ok: boolean; resolution: string; buyer_refunded: number; error?: string }>(
    (c) =>
      c.rpc('resolve_marketplace_dispute', {
        p_order_id: orderId,
        p_resolution_type: resolutionType,
      })
  );
}

export async function acceptMarketplaceDeliveryJob(orderId: string, agentId: string) {
  return supaQuery<{ ok: boolean; error?: string }>((c) =>
    c.rpc('accept_delivery_job', {
      p_order_id: orderId,
      p_agent_id: agentId,
    })
  );
}

// —— Legacy Aliases & RPC Wrappers —————————————————————————————————————————————
export async function rpcReleaseEscrow(escrowId: string, orderId: string) {
  return releaseMarketplaceEscrow(orderId, escrowId);
}

export async function rpcCancelAndRefundOrder(orderId: string, userId: string, reason: string) {
  return supaQuery<{ ok: boolean; error?: string }>((c) =>
    c.rpc('cancel_and_refund_marketplace_order', {
      p_order_id: orderId,
      p_user_id:  userId,
      p_reason:   reason,
    })
  );
}

// —— Metrics & Analytics ——————————————————————————————————————————————————————

export async function fetchMerchantMetrics(merchantId: string): Promise<MerchantMetrics> {
  if (!hasSupabase() || !merchantId)
    return { totalRevenue: 0, activeOrders: 0, totalProducts: 0, lowStock: 0 };

  const { data, error } = await supaQuery<{
    total_revenue: number;
    active_orders: number;
    total_products: number;
    low_stock_products: number;
  }>((c) =>
    c
      .from('merchant_metrics')
      .select('total_revenue, active_orders, total_products, low_stock_products')
      .eq('merchant_id', merchantId)
      .single()
  );

  if (error || !data) {
    return { totalRevenue: 0, activeOrders: 0, totalProducts: 0, lowStock: 0 };
  }

  return {
    totalRevenue: data.total_revenue,
    activeOrders: data.active_orders,
    totalProducts: data.total_products,
    lowStock: data.low_stock_products,
  };
}

export async function fetchMerchantSalesHistory(merchantId: string) {
  if (!hasSupabase() || !merchantId) {
    return { curve: [0, 0, 0, 0, 0, 0, 0], raw: [], labels: [] };
  }

  const today = new Date();
  const dailyMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    dailyMap[date.toISOString().split('T')[0]] = 0;
  }

  const fromDate = Object.keys(dailyMap)[0];
  const { data, error } = await supaQuery<{ day: string; total: number }[]>((c) =>
    c
      .from('merchant_sales_history_7d')
      .select('day, total')
      .eq('merchant_id', merchantId)
      .gte('day', fromDate)
      .order('day', { ascending: true })
  );

  if (error || !data) {
    return { curve: [0, 0, 0, 0, 0, 0, 0], raw: [], labels: Object.keys(dailyMap) };
  }

  data.forEach((row) => {
    const dayKey = new Date(row.day).toISOString().split('T')[0];
    if (dailyMap[dayKey] !== undefined) {
      dailyMap[dayKey] = Number(row.total || 0);
    }
  });

  const raw = Object.values(dailyMap);
  const maxVal = Math.max(...raw, 1);
  return {
    curve: raw.map((value) => value / maxVal),
    raw,
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
    deliveryFee = 0,
  }: {
    product: Product;
    buyerId: string;
    qty: number;
    shippingAddress: string;
    deliveryFee?: number;
  }) => {
    const res = await executeMarketplacePurchase({
      product,
      buyerId,
      qty,
      address: shippingAddress,
      deliveryFee,
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
    const { data } = await supaQuery<Dispute[]>((c) =>
      c.from('disputes').select('*').eq('merchant_id', merchantId).eq('status', 'OPEN')
    );
    return data || [];
  },

  updateProduct: async (productId: string, merchantId: string, updates: Partial<Product>) => {
    return updateProduct(productId, merchantId, updates);
  },

  deleteProduct: async (productId: string, merchantId: string) => {
    return deleteProduct(productId, merchantId);
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
    if (res.error || !res.data?.ok)
      throw res.error || new Error(res.data?.error || 'Failed to dispatch order');
    return {
      success: true,
      dispatchedCount: res.data.dispatched_count,
    };
  },

  confirmPickup: async (orderId: string, userId: string) => {
    const res = await supaQuery<{
      ok: boolean;
      status: string;
      delivery_pin?: string;
      error?: string;
    }>((c) =>
      c.rpc('confirm_order_pickup', {
        p_order_id: orderId,
        p_user_id: userId,
      })
    );
    if (res.error || !res.data?.ok)
      throw res.error || new Error(res.data?.error || 'Pickup confirmation failed');
    return {
      success: true,
      status: res.data.status,
      delivery_pin: res.data.delivery_pin,
    };
  },

  cancelOrder: async (orderId: string, userId: string, reason: string) => {
    const { data, error } = await supaQuery<{ ok: boolean; error?: string }>((c) =>
      c.rpc('cancel_and_refund_marketplace_order', {
        p_order_id: orderId,
        p_user_id:  userId,
        p_reason:   reason || 'cancelled_by_merchant',
      })
    );
    if (error) return { success: false, error };
    return { success: data?.ok === true, error: data?.error || null };
  },

  confirmAgentHandover: async (orderId: string, agentId: string, pickupPin: string) => {
    const { data, error } = await confirmAgentHandoverMarketplace(orderId, agentId, pickupPin);
    if (error || !data?.ok) throw error || new Error(data?.error || 'Handover failed');
    return { success: true, status: data.status };
  },

  rejectDelivery: async (
    orderId: string,
    buyerId: string,
    reasonCode: string,
    comment: string = ''
  ): Promise<{ success: boolean; status: string | null; error: string | null }> => {
    const { data, error } = await rejectMarketplaceDelivery(orderId, buyerId, reasonCode, comment);
    if (error) return { success: false, status: null, error };
    return { success: data?.ok === true, status: data?.status || null, error: data?.error || null };
  },

  requestWithdrawal: async (
    userId: string,
    amount: number,
    bankName: string,
    accountNum: string
  ) => {
    const res = await requestWithdrawal(userId, amount, bankName, accountNum);
    return { data: res.data, error: res.error };
  },

  resolveDispute: async (
    orderId: string,
    resolutionType: 'BUYER_FAULT' | 'MERCHANT_AT_FAULT' | 'ORDER_CANCELLED_REFUND'
  ) => {
    const { data, error } = await resolveMarketplaceDispute(orderId, resolutionType);
    if (error || !data?.ok) throw error || new Error(data?.error || 'Resolution failed');
    return { success: true, resolution: data.resolution, refunded: data.buyer_refunded };
  },

  acceptDeliveryJob: async (orderId: string, agentId: string) => {
    const { data, error } = await acceptMarketplaceDeliveryJob(orderId, agentId);
    if (error || !data?.ok)
      throw error || new Error(data?.error || 'Failed to accept delivery job');
    return { success: true };
  },

  subscribeToProducts: (callback: (payload: unknown) => void) => {
    return subscribeToTable('products-realtime', 'products', null, callback);
  },

  revealOrderPin: async (orderId: string, walletPinHash?: string) => {
    const res = await supaQuery<{ ok: boolean; delivery_pin: string; error?: string }[]>((c) =>
      c.rpc('reveal_marketplace_order_pin', {
        p_order_id: orderId,
        p_wallet_pin_hash: walletPinHash,
      })
    );
    // RPC returns TABLE → Supabase gives us an array; pick first row
    const row = Array.isArray(res.data) ? res.data[0] : res.data;
    return { ...res, data: row ?? null };
  },

  selfDeliverOrder: async (orderId: string, merchantId: string) => {
    const res = await supaQuery<void>((c) =>
      c.rpc('self_deliver_marketplace_order', {
        p_order_id: orderId,
        p_merchant_id: merchantId,
      })
    );
    if (res.error) throw res.error;
    return { success: true };
  },

  checkoutCart: async (
    buyerId: string,
    items: { product_id: string; qty: number; expected_price: number }[],
    shippingAddress: string,
    deliveryFee: number = 0,
    idempotencyKey?: string
  ) => {
    return MarketplaceApi.checkoutCart(
      buyerId,
      items,
      shippingAddress,
      deliveryFee,
      idempotencyKey
    );
  },

  calculateDeliveryFees: async (buyerId: string, merchantIds: string[]) => {
    return MarketplaceApi.calculateDeliveryFees(buyerId, merchantIds);
  },
};

export async function revealMarketplaceOrderPin(orderId: string, walletPinHash?: string) {
  return marketplaceService.revealOrderPin(orderId, walletPinHash);
}

/**
 * fetchRestaurantStock — fetches inventory stock for a merchant.
 */
export async function fetchRestaurantStock(merchantId: string) {
  return supaQuery<any[]>((c) =>
    c
      .from('restaurant_stock')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('item_name', { ascending: true })
  );
}

/**
 * updateRestaurantStock — updates or creates a stock item.
 */
export async function updateRestaurantStock(stock: any) {
  return supaQuery<any>((c) => c.from('restaurant_stock').upsert(stock).select().single());
}

export async function fetchLowStockAlerts(merchantId: string) {
  return MarketplaceApi.fetchLowStockAlerts(merchantId);
}

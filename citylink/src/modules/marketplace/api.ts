import { supaQuery, subscribeToTable } from '../../services/supabase';
import { uid } from '../../utils';
import { Product, MarketplaceOrder, Dispute, MerchantMetrics } from '../../types';

// ── Configuration ─────────────────────────────────────────────────────────────
const PRODUCT_COLS =
  '*, merchant:profiles(id, full_name), merchant_data:merchants(id, business_name)';

/**
 * Type for product joined with merchant info from Supabase
 */
export interface ProductWithMerchant extends Product {
  merchant?: any;
  merchant_data?: any;
}

// Helper to map relational result to existing flat structure for backward compatibility
const mapProductMerchant = (p: ProductWithMerchant): Product => {
  if (!p) return p;
  const rawMerchant = p.merchant;
  const merchant = Array.isArray(rawMerchant) ? rawMerchant[0] : rawMerchant;
  const mData = Array.isArray(p.merchant_data) ? p.merchant_data[0] : p.merchant_data;

  return {
    ...p,
    business_name: mData?.business_name || merchant?.full_name || 'Store Front',
    merchant_name: mData?.business_name || merchant?.full_name || 'Store Front',
  };
};

/**
 * Marketplace API Module
 * Encapsulates all marketplace-related database operations.
 */
export const MarketplaceApi = {
  async fetchProducts(limit: number = 50) {
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
  },

  async searchProducts(query: string, limit: number = 40) {
    if (!query?.trim()) return this.fetchProducts(limit);
    const res = await supaQuery<ProductWithMerchant[]>((c) =>
      c.rpc('search_products_secure', {
        p_query: query.trim(),
        p_limit: limit,
        p_offset: 0,
      })
    );
    return { ...res, data: res.data?.map(mapProductMerchant) || [] };
  },

  async fetchProductsByCategory(category: string, limit: number = 40) {
    const isAll = !category || category.toLowerCase() === 'all';
    if (isAll) return this.fetchProducts(limit);

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
  },

  async fetchProductById(productId: string) {
    return supaQuery<ProductWithMerchant>((c) =>
      c.from('products').select(PRODUCT_COLS).eq('id', productId).maybeSingle()
    );
  },

  async fetchMerchantInventory(merchantId: string) {
    const res = await supaQuery<ProductWithMerchant[]>((c) =>
      c
        .from('products')
        .select(PRODUCT_COLS)
        .eq('merchant_id', merchantId)
        .neq('status', 'removed')
        .order('created_at', { ascending: false })
    );
    return { ...res, data: res.data?.map(mapProductMerchant) || [] };
  },

  async insertProduct(product: Partial<Product>) {
    if (!product.merchant_id) throw new Error('merchant_id is required');
    const productId = product.id || uid();

    const payload: any = {
      id: productId,
      merchant_id: product.merchant_id,
      name: product.name || product.title,
      title: product.title || product.name,
      price: product.price,
      category: product.category || 'Other',
      stock: product.stock || 0,
      description: product.description || '',
      status: product.status || 'active',
      condition: product.condition || 'new',
      image_url: product.image_url || product.image,
      images_json: product.images_json || [],
      created_at: new Date().toISOString(),
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });

    return supaQuery<Product>((c) => c.from('products').insert(payload).select().single());
  },

  async updateProduct(productId: string, merchantId: string, updates: Partial<Product>) {
    return supaQuery<Product>((c) =>
      c
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', productId)
        .eq('merchant_id', merchantId)
        .select()
        .single()
    );
  },

  async deleteProduct(productId: string, merchantId: string) {
    return supaQuery<void>((c) =>
      c
        .from('products')
        .update({ status: 'removed', updated_at: new Date().toISOString() })
        .eq('id', productId)
        .eq('merchant_id', merchantId)
    );
  },

  async checkoutCart(
    buyerId: string,
    items: { product_id: string; qty: number; expected_price: number }[],
    shippingAddress: string,
    deliveryFee: number = 0,
    idempotencyKey?: string
  ) {
    const iKey = idempotencyKey || `cart-${uid()}`;
    const res = await supaQuery<{
      success: boolean;
      total_deducted: number;
      error?: string;
    }>((c) =>
      c.rpc('process_cart_checkout', {
        p_buyer_id: buyerId,
        p_items: items,
        p_shipping_address: shippingAddress,
        p_total_delivery_fee: deliveryFee,
      })
    );
    if (res.error) throw res.error;
    if (!res.data?.success) throw new Error(res.data?.error || 'Checkout failed');
    return res.data;
  },

  async calculateDeliveryFees(buyerId: string, merchantIds: string[]) {
    const res = await supaQuery<{ merchant_id: string; fee: number }[]>((c) =>
      c.rpc('get_cart_delivery_fees', {
        p_merchant_ids: merchantIds,
        p_citizen_id: buyerId,
      })
    );
    if (res.error) throw res.error;
    return res.data || [];
  },

  async fetchLowStockAlerts(merchantId: string) {
    return supaQuery<any[]>((c) =>
      c.from('low_stock_alerts').select('*').eq('merchant_id', merchantId)
    );
  },

  subscribeToProducts(callback: (payload: unknown) => void) {
    return subscribeToTable('products-realtime', 'products', null, callback);
  },
};

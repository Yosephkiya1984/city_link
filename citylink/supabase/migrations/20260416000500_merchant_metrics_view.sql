-- Create merchant metrics view to offload client-side analytics
-- This replaces the client-side reduce/filter operations in useShopData.ts

CREATE OR REPLACE VIEW public.merchant_metrics AS
SELECT
  p.merchant_id,
  -- Total revenue from completed marketplace orders
  COALESCE(SUM(CASE WHEN mo.status = 'COMPLETED' THEN mo.total ELSE 0 END), 0) AS total_revenue,
  -- Active orders count (orders not completed, cancelled, or disputed)
  COUNT(CASE WHEN mo.status NOT IN ('COMPLETED', 'CANCELLED', 'DISPUTED', 'REJECTED_BY_BUYER') THEN 1 END) AS active_orders,
  -- Total products count (excluding removed)
  COUNT(DISTINCT CASE WHEN p.status != 'removed' THEN p.id END) AS total_products,
  -- Low stock products count (stock <= 5)
  COUNT(DISTINCT CASE WHEN p.status != 'removed' AND p.stock <= 5 THEN p.id END) AS low_stock_products
FROM
  public.products p
LEFT JOIN
  public.marketplace_orders mo ON p.merchant_id = mo.merchant_id
WHERE
  p.merchant_id IS NOT NULL
GROUP BY
  p.merchant_id;

-- Grant access to authenticated users
GRANT SELECT ON public.merchant_metrics TO authenticated;
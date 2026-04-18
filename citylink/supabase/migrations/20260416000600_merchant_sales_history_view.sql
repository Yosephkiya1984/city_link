-- Create a view that pre-aggregates 7-day merchant sales history for dashboard analytics.
-- This keeps merchant dashboards fast and avoids client-side order scans.

CREATE OR REPLACE VIEW public.merchant_sales_history_7d AS
SELECT
  merchant_id,
  DATE_TRUNC('day', created_at)::date AS day,
  COALESCE(SUM(total), 0) AS total
FROM public.marketplace_orders
WHERE status IN (
  'PAID',
  'DISPATCHING',
  'AGENT_ASSIGNED',
  'SHIPPED',
  'IN_TRANSIT',
  'AWAITING_PIN',
  'COMPLETED'
)
GROUP BY merchant_id, day;

GRANT SELECT ON public.merchant_sales_history_7d TO authenticated;

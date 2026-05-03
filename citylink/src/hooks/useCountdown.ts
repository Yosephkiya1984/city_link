import { useState, useEffect } from 'react';
import { t } from '../utils/i18n';

/**
 * useCountdown — Extracted from MyOrdersScreen for global reusability.
 * Calculates time remaining based on expires_at or a creation date fallback.
 */
export function useCountdown(order: any) {
  const getTarget = () => {
    if (order.expires_at) return new Date(order.expires_at);
    // Fallback: estimate 3h from creation (User requested 3h auto-cancel)
    return new Date(new Date(order.created_at).getTime() + 3 * 3600 * 1000);
  };

  const [msLeft, setMsLeft] = useState(() => Math.max(0, getTarget().getTime() - Date.now()));

  useEffect(() => {
    // Only PAID orders are in escrow countdown
    if (order.status !== 'PAID' && order.status !== 'ORDER_PLACED') return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, getTarget().getTime() - Date.now());
      setMsLeft(remaining);
    }, 30000); // 30s tick is sufficient for hours/minutes display

    return () => clearInterval(interval);
  }, [order.id, order.status, order.expires_at, order.created_at]);

  if (msLeft <= 0) return t('expired');

  const hrs = Math.floor(msLeft / 3600000);
  const mins = Math.floor((msLeft % 3600000) / 60000);

  if (hrs > 0) return t('auto_cancels_in_h', { hrs });
  return t('auto_cancels_in_m', { mins });
}

import { Config, CHAPA_CHANNELS } from '../config';
import { supaQuery } from './supabase';
import { getSession } from './auth.service';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

export interface ChapaInitResponse {
  status: 'success' | 'error';
  message?: string;
  tx_ref?: string;
  data?: {
    checkout_url: string;
    [key: string]: unknown;
  };
}

export interface ChapaVerifyResponse {
  status: 'success' | 'error';
  message?: string;
  data?: {
    status: 'success' | 'failed' | 'pending';
    amount: number;
    currency: string;
    tx_ref: string;
    [key: string]: unknown;
  };
}

/**
 * initialize — Starts a real Chapa payment flow.
 */
export async function initialize({
  amount,
  description,
  channel = 'telebirr',
  phone,
  name,
}: {
  amount: number;
  description: string;
  channel?: string;
  phone: string;
  name: string;
}): Promise<ChapaInitResponse> {
  if (!amount || amount <= 0) return { status: 'error', message: 'Invalid amount.' };

  const supaUrl = Config.supaUrl;
  const session = await getSession();

  if (!supaUrl || supaUrl.includes('REPLACE')) {
    return { status: 'error', message: 'Payment gateway not configured.' };
  }

  if (!session?.access_token) {
    return { status: 'error', message: 'Please sign in to make payments.' };
  }

  const txRef = `CL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  const callbackUrl = Linking.createURL('payment-callback', { scheme: 'citylink' });

  try {
    const res = await fetch(`${supaUrl}/functions/v1/chapa-payment/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        amount,
        currency: 'ETB',
        phone_number: phone,
        first_name: name.split(' ')[0] || 'User',
        last_name: name.split(' ')[1] || 'CityLink',
        tx_ref: txRef,
        callback_url: callbackUrl,
        return_url: callbackUrl,
        customization: {
          title: 'CityLink Wallet Top-up',
          description,
        },
      }),
    });

    const data: ChapaInitResponse = await res.json();

    if (data.status === 'success' && data.data?.checkout_url) {
      // Open real Chapa checkout
      await WebBrowser.openBrowserAsync(data.data.checkout_url);
      return { status: 'success', tx_ref: txRef, data: data.data };
    }

    throw new Error(data.message || 'Chapa initialization failed');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Payment] Init Error:', msg);
    return { status: 'error', message: msg };
  }
}

/**
 * verify — Verifies a payment via the backend proxy.
 */
export async function verify(txRef: string): Promise<ChapaVerifyResponse> {
  const supaUrl = Config.supaUrl;
  const session = await getSession();

  try {
    if (!session?.access_token) throw new Error('Unauthorized');
    const res = await fetch(`${supaUrl}/functions/v1/chapa-payment/verify/${txRef}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', message: msg };
  }
}

// ── Calculate fee ─────────────────────────────────────────────────────────────
export function calcFee(amount: number, channel: string = 'telebirr'): number {
  const ch = CHAPA_CHANNELS[channel as keyof typeof CHAPA_CHANNELS];
  if (!ch) return 0;
  return Math.ceil(amount * ch.fee_pct * 100) / 100;
}

/**
 * payUtilityBill — pays a utility bill atomically.
 */
export async function payUtilityBill(
  billId: string,
  citizenId: string
): Promise<{
  data: { ok: boolean; error?: string; new_balance: number } | null;
  error: string | null;
}> {
  return supaQuery<{ ok: boolean; error?: string; new_balance: number }>((c) =>
    c.rpc('process_utility_payment_atomic', {
      p_bill_id: billId,
      p_citizen_id: citizenId,
    })
  );
}

/**
 * payTrafficFine — pays a traffic fine atomically.
 */
export async function payTrafficFine(
  userId: string,
  fineId: string
): Promise<{
  data: { ok: boolean; error?: string; new_balance: number } | null;
  error: string | null;
}> {
  return supaQuery<{ ok: boolean; error?: string; new_balance: number }>((c) =>
    c.rpc('process_traffic_fine_atomic', {
      p_user_id: userId,
      p_fine_id: fineId,
    })
  );
}

// ── Format ETB ────────────────────────────────────────────────────────────────
export function fmtETB(amount: number | string, decimals = 2): string {
  if (amount === undefined || amount === null) return '0.00';
  return Number(amount)
    .toFixed(decimals)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const PaymentService = { initialize, verify, calcFee, fmtETB, payUtilityBill, payTrafficFine };
export default PaymentService;

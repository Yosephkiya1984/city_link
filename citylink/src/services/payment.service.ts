import { Config, CHAPA_CHANNELS } from '../config';
import { supaQuery } from './supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

/**
 * initialize — Starts a real Chapa payment flow.
 */
export async function initialize({ amount, description, channel = 'telebirr', phone, name }) {
  if (!amount || amount <= 0) return { status: 'error', message: 'Invalid amount.' };
  
  const supaUrl = Config.supaUrl;
  const anonKey = Config.supaKey;
  if (!supaUrl || !anonKey || supaUrl.includes('REPLACE')) {
    return { status: 'error', message: 'Payment gateway not configured.' };
  }

  const txRef = `CL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  const callbackUrl = Linking.createURL('payment-callback', { scheme: 'citylink' });

  try {
    const res = await fetch(`${supaUrl}/functions/v1/chapa-payment/initialize`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
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
        }
      }),
    });

    const data = await res.json();
    
    if (data.status === 'success' && data.data?.checkout_url) {
      // Open real Chapa checkout
      await WebBrowser.openBrowserAsync(data.data.checkout_url);
      return { status: 'success', tx_ref: txRef, data: data.data };
    }
    
    throw new Error(data.message || 'Chapa initialization failed');
  } catch (e) {
    console.error('[Payment] Init Error:', e.message);
    return { status: 'error', message: e.message };
  }
}

/**
 * verify — Verifies a payment via the backend proxy.
 */
export async function verify(txRef) {
  const supaUrl = Config.supaUrl;
  const anonKey = Config.supaKey;
  
  try {
    const res = await fetch(`${supaUrl}/functions/v1/chapa-payment/verify/${txRef}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${anonKey}` },
    });

    return await res.json();
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// ── Calculate fee ─────────────────────────────────────────────────────────────
export function calcFee(amount, channel = 'telebirr') {
  const ch = CHAPA_CHANNELS[channel];
  if (!ch) return 0;
  return Math.ceil(amount * ch.fee_pct * 100) / 100;
}

/**
 * payUtilityBill — pays a utility bill atomically.
 */
export async function payUtilityBill(billId, citizenId) {
  return supaQuery((c) =>
    c.rpc('process_utility_payment_atomic', {
      p_bill_id: billId,
      p_citizen_id: citizenId,
    })
  );
}

/**
 * payTrafficFine — pays a traffic fine atomically.
 */
export async function payTrafficFine(userId, fineId) {
  return supaQuery((c) =>
    c.rpc('process_traffic_fine_atomic', {
      p_user_id: userId,
      p_fine_id: fineId,
    })
  );
}

// ── Format ETB ────────────────────────────────────────────────────────────────
export function fmtETB(amount, decimals = 2) {
  if (amount === undefined || amount === null) return '0.00';
  return Number(amount)
    .toFixed(decimals)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default { initialize, verify, calcFee, fmtETB, payUtilityBill, payTrafficFine };

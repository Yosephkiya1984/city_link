import { Config, CHAPA_CHANNELS } from '../config';
import { supaQuery } from './supabase';

const _delay = (ms) => new Promise((r) => setTimeout(r, ms));
const _pendingTx = {};

// ── Initialize a payment ──────────────────────────────────────────────────────
export async function initialize({ amount, description, channel = 'telebirr', phone, name }) {
  await _delay(400 + Math.random() * 400);
  if (!amount || amount <= 0) return { status: 'error', message: 'Invalid amount.' };
  if (!CHAPA_CHANNELS[channel]) return { status: 'error', message: `Unsupported channel: ${channel}` };

  if (!Config.devMode && Config.chapaKey && !Config.chapaKey.startsWith('REPLACE')) {
    // Real Chapa API call (must go through a backend proxy to avoid CORS)
    // POST to your backend: /api/chapa/initialize
    try {
      const res = await fetch('YOUR_BACKEND_URL/api/chapa/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description, channel, phone, name }),
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  }

  // ── Simulation ──
  const txRef = 'CL-' + Math.random().toString(36).slice(2).toUpperCase();
  const ch = CHAPA_CHANNELS[channel];
  const fee = Math.ceil(amount * ch.fee_pct * 100) / 100;
  _pendingTx[txRef] = { amount, fee, channel, description, phone, name, status: 'pending' };
  return {
    status: 'success',
    message: 'Payment initiated.',
    data: { tx_ref: txRef, amount, fee, channel, checkout_url: null },
  };
}

// ── Verify a payment ──────────────────────────────────────────────────────────
export async function verify(txRef) {
  await _delay(500 + Math.random() * 500);
  const tx = _pendingTx[txRef];
  if (!tx) return { status: 'error', message: 'Transaction not found.' };
  tx.status = 'success';
  return {
    status: 'success',
    message: 'Payment verified.',
    data: { ...tx, tx_ref: txRef, verified_at: new Date().toISOString() },
  };
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
  return supaQuery((c) => c.rpc('process_utility_payment_atomic', {
    p_bill_id: billId,
    p_citizen_id: citizenId
  }));
}

/**
 * payTrafficFine — pays a traffic fine atomically.
 */
export async function payTrafficFine(userId, fineId) {
  return supaQuery((c) => c.rpc('process_traffic_fine_atomic', {
    p_user_id: userId,
    p_fine_id: fineId
  }));
}

// ── Format ETB ────────────────────────────────────────────────────────────────
export function fmtETB(amount, decimals = 2) {
  if (amount === undefined || amount === null) return '0.00';
  return Number(amount).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default { initialize, verify, calcFee, fmtETB, payUtilityBill, payTrafficFine };

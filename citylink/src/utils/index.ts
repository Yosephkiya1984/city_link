import * as Crypto from 'expo-crypto';
import { t } from './i18n';
export { t };
// ── ID generation (crypto-safe UUID v4) ──────────────────────────────────────
export function uid() {
  try {
    return Crypto.randomUUID();
  } catch (_) {
    // Fallback for environments where expo-crypto isn't available
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

// —— Format ETB ———————————————————————————————————————————————————————————————
export function fmtETB(amount: number | string | undefined | null, decimals: number = 2): string {
  if (amount === undefined || amount === null) return '0.00';
  const n = Number(amount);
  if (isNaN(n)) return '0.00';
  return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// —— Format date ———————————————————————————————————————————————————————————————
export function fmtDate(dateStr: string | number | Date | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ET', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) {
    return String(dateStr);
  }
}

export function fmtTime(dateStr: string | number | Date | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '';
  }
}

export function fmtDateTime(dateStr: string | number | Date | null | undefined): string {
  return `${fmtDate(dateStr)} ${fmtTime(dateStr)}`.trim();
}

export function timeAgo(dateStr: string | number | Date | null | undefined): string {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return t('just now');
  if (seconds < 3600) return `${Math.floor(seconds / 60)}${t('m ago')}`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}${t('h ago')}`;
  return `${Math.floor(seconds / 86400)}${t('d ago')}`;
}

// —— Phone validation ——————————————————————————————————————————————————————————
export function isValidEthPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\s/g, '');
  // Accept: EthioTelecom (+2519, 09, 2519, +2518, 08, 2518) AND Safaricom Ethiopia (+2517, 07, 2517)
  return /^(\+2519|09|2519|\+2517|07|2517|\+2518|08|2518)\d{8}$/.test(cleaned);
}

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('09')) return '+2519' + cleaned.slice(2);
  if (cleaned.startsWith('2519')) return '+' + cleaned;
  if (cleaned.startsWith('08')) return '+2518' + cleaned.slice(2);
  if (cleaned.startsWith('2518')) return '+' + cleaned;
  if (cleaned.startsWith('07')) return '+2517' + cleaned.slice(2);
  if (cleaned.startsWith('2517')) return '+' + cleaned;
  if (cleaned.startsWith('+2519') || cleaned.startsWith('+2518') || cleaned.startsWith('+2517')) return cleaned;
  return cleaned;
}

/**
 * getPhoneProvider — Returns the best top-up channel for a number.
 * Ethio Telecom -> telebirr
 * Safaricom -> mpesa
 */
export function getPhoneProvider(phone: string): 'telebirr' | 'mpesa' | 'unknown' {
  const norm = normalizePhone(phone);
  if (norm.startsWith('+2519') || norm.startsWith('+2518')) return 'telebirr';
  if (norm.startsWith('+2517')) return 'mpesa';
  return 'unknown';
}

// —— Greeting (Semantic Keys) ——————————————————————————————————————————————————
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'good_morning';
  if (h < 18) return 'good_afternoon';
  return 'good_evening';
}

// —— Color for status ——————————————————————————————————————————————————————————
export function statusColor(status: string | undefined | null, colors: Record<string, string>): string {
  const map: Record<string, string> = {
    APPROVED: colors.green,
    ACTIVE: colors.green,
    CONFIRMED: colors.green,
    OPEN: colors.green,
    PENDING: colors.amber,
    REVIEWING: colors.amber,
    REJECTED: colors.red,
    CLOSED: colors.red,
    SOLD: colors.sub,
    SHORTLISTED: colors.purple,
    OFFERED: colors.green,
  };
  return map[status?.toUpperCase() || ''] || colors.sub;
}

// —— Truncate text —————————————————————————————————————————————————————————————
export function truncate(text: string | null | undefined, maxLen: number = 60): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

// —— QR token generator ————————————————————————————————————————————————————————
export function genQrToken(prefix: string = 'CL'): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// —— LRT fare calculator ———————————————————————————————————————————————————————
export function calcLrtFare(fromKm: number, toKm: number): number {
  const dist = Math.abs(toKm - fromKm);
  const fare = 2.0 + dist * 0.45;
  return Math.ceil(fare * 10) / 10;
}

// —— Shimmer placeholder items —————————————————————————————————————————————————
export function placeholderArr(n: number = 5): any[] {
  return Array.from({ length: n }, (_, i) => ({ _placeholder: true, id: 'ph-' + i }));
}

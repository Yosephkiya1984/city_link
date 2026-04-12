// CityLink Configuration
// Environment variables are loaded from .env file

export const Config = {
  supaUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim(),
  supaKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
  chapaKey: process.env.EXPO_PUBLIC_CHAPA_KEY || '',
  adminCode: process.env.EXPO_PUBLIC_ADMIN_CODE || '',
  // AI proxy — Supabase Edge Function URL (see src/services/ai.js for setup guide)
  // Set to actual URL for live Claude integration.
  aiProxyUrl: process.env.EXPO_PUBLIC_AI_PROXY_URL || 'OFFLINE_MODE',
  devMode: process.env.EXPO_PUBLIC_DEV_MODE === 'true' || false,
  otpBypass: process.env.EXPO_PUBLIC_OTP_BYPASS === 'true', // Explicit opt-in only
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || null, // Optional: Error tracking
};

/** One-time ETB credited on first successful citizen session (Goal §2). */
export const WELCOME_BONUS_ETB = 5000;

/** P2P transfers at or above this amount require wallet PIN (Goal §2). */
export const P2P_PIN_THRESHOLD_ETB = 5000;

// Payment channels
export const CHAPA_CHANNELS = {
  telebirr: { name: 'Telebirr', icon: '📱', fee_pct: 0.005 },
  mpesa: { name: 'M-Pesa (Safaricom)', icon: '📱', fee_pct: 0.005 },
  cbebirr: { name: 'CBE Birr', icon: '🏦', fee_pct: 0.006 },
  awash: { name: 'Awash Bank', icon: '🏦', fee_pct: 0.007 },
  dashen: { name: 'Dashen Bank', icon: '🏦', fee_pct: 0.007 },
  abyssinia: { name: 'Bank of Abyssinia', icon: '🏦', fee_pct: 0.007 },
  ebirr: { name: 'eBirr', icon: '💚', fee_pct: 0.005 },
};

// Ethiopian sub-cities
export const SUBCITIES = [
  'Addis Ketema',
  'Akaky Kaliti',
  'Arada',
  'Bole',
  'Gullele',
  'Kirkos',
  'Kolfe Keranio',
  'Lideta',
  'Nifas Silk-Lafto',
  'Yeka',
];

// Merchant types
export const MERCHANT_TYPES = [
  { value: 'restaurant', label: '🍽️ Restaurant / Café' },
  { value: 'parking', label: '🅿️ Parking Operator' },
  { value: 'shop', label: '🛍️ Shop / Retail' },
  { value: 'employer', label: '💼 Employer / Company' },
  { value: 'delala', label: '🏠 Real-Estate Agent (Delala)' },
  { value: 'transport', label: '🚌 Transport Operator' },
  { value: 'salon', label: '💈 Salon / Barbershop' },
  { value: 'clinic', label: '🏥 Medical Clinic' },
  { value: 'ekub', label: '👥 Ekub / Iddir Association' },
  { value: 'seller', label: '📦 Marketplace Seller' },
];

// Delivery agent vehicle types
export const VEHICLE_TYPES = [
  { value: 'motorcycle', label: '🏍️ Motorcycle / Bajaj' },
  { value: 'car', label: '🚗 Car / Taxi' },
  { value: 'bicycle', label: '🚲 Bicycle' },
  { value: 'tuktuk', label: '🛺 Tuk-Tuk' },
  { value: 'foot', label: '🚶 On Foot (Local Area)' },
];

// LRT Stations (Addis Ababa Light Rail)
export const LRT_STATIONS = {
  NS: [
    { id: 'ns-0', name: 'Menelik II Square', km: 0, isInterchange: true },
    { id: 'ns-1', name: 'Lideta', km: 1.8, isInterchange: false },
    { id: 'ns-2', name: 'Ayat', km: 3.5, isInterchange: false },
    { id: 'ns-3', name: 'Tor Hailoch', km: 5.0, isInterchange: false },
    { id: 'ns-4', name: 'Megenagna', km: 7.2, isInterchange: true },
    { id: 'ns-5', name: 'Jemo', km: 9.1, isInterchange: false },
    { id: 'ns-6', name: 'Lebu', km: 11.4, isInterchange: false },
  ],
  EW: [
    { id: 'ew-0', name: 'Ayat', km: 0, isInterchange: false },
    { id: 'ew-1', name: 'Menelik II Square', km: 4.1, isInterchange: true },
    { id: 'ew-2', name: 'Mercato', km: 5.8, isInterchange: false },
    { id: 'ew-3', name: 'Mexico', km: 7.2, isInterchange: false },
    { id: 'ew-4', name: 'Akaki', km: 9.0, isInterchange: false },
  ],
};

// LRT fare table (ETB per km)
export const LRT_FARE_PER_KM = 0.45;
export const LRT_BASE_FARE = 2.0;

// Fayda demo database
export const FAYDA_DB = {
  '100000000001': {
    name: 'Abebe Bikila',
    dob: '1982-05-12',
    gender: 'M',
    region: 'Addis Ababa',
    status: 'ACTIVE',
  },
  '100000000002': {
    name: 'Tigist Bekele',
    dob: '1995-03-20',
    gender: 'F',
    region: 'Addis Ababa',
    status: 'ACTIVE',
  },
  '100000000003': {
    name: 'Dawit Haile',
    dob: '1988-11-07',
    gender: 'M',
    region: 'Oromia',
    status: 'ACTIVE',
  },
  '100000000004': {
    name: 'Selamawit G.',
    dob: '1991-07-15',
    gender: 'F',
    region: 'Addis Ababa',
    status: 'ACTIVE',
  },
  '100000000005': {
    name: 'Yonas Tesfaye',
    dob: '1975-09-30',
    gender: 'M',
    region: 'Amhara',
    status: 'SUSPENDED',
  },
};

// Exchange rates (demo — replace with live API)
export const EXCHANGE_RATES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸', buy: 56.2, sell: 57.1 },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', buy: 61.4, sell: 62.3 },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧', buy: 70.8, sell: 71.9 },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦', buy: 14.9, sell: 15.2 },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪', buy: 15.2, sell: 15.5 },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳', buy: 7.7, sell: 7.95 },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵', buy: 0.36, sell: 0.37 },
  { code: 'KES', name: 'Kenyan Shilling', flag: '🇰🇪', buy: 0.41, sell: 0.43 },
];

// CityLink Configuration
// Environment variables are loaded from .env file

// ─── Environment Detection ──────────────────────────────────────────────────
type Environment = 'development' | 'staging' | 'production';

const detectEnvironment = (): Environment => {
  if (__DEV__) return 'development';
  
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  if (url.includes('staging') || url.includes('dev')) return 'staging';
  
  return 'production';
};

const ENVIRONMENT = detectEnvironment();

// ─── Configuration Validation ───────────────────────────────────────────────
interface ConfigValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

const validateSupabaseConfig = (): ConfigValidationError[] => {
  const errors: ConfigValidationError[] = [];
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  // URL validation
  if (!url) {
    errors.push({
      field: 'EXPO_PUBLIC_SUPABASE_URL',
      message: 'Supabase URL is required',
      severity: 'error'
    });
  } else if (url.startsWith('REPLACE') || url === 'https://your-project.supabase.co') {
    errors.push({
      field: 'EXPO_PUBLIC_SUPABASE_URL',
      message: 'Supabase URL appears to be a placeholder. Please set your actual project URL.',
      severity: 'error'
    });
  } else if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    errors.push({
      field: 'EXPO_PUBLIC_SUPABASE_URL',
      message: 'Supabase URL format appears invalid. Expected format: https://your-project.supabase.co',
      severity: 'warning'
    });
  }

  // Key validation
  if (!key) {
    errors.push({
      field: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      message: 'Supabase anonymous key is required',
      severity: 'error'
    });
  } else if (key.startsWith('REPLACE') || key === 'your-supabase-anon-key') {
    errors.push({
      field: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      message: 'Supabase anonymous key appears to be a placeholder. Please set your actual anonymous key.',
      severity: 'error'
    });
  } else if (key.length < 100) {
    errors.push({
      field: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      message: 'Supabase anonymous key appears too short. Please verify it is correct.',
      severity: 'warning'
    });
  }

  return errors;
};

// ─── Supabase Configuration ─────────────────────────────────────────────────
interface SupabaseConfig {
  url: string;
  anonKey: string;
  environment: Environment;
  isValid: boolean;
  validationErrors: ConfigValidationError[];
  options: {
    auth: {
      autoRefreshToken: boolean;
      persistSession: boolean;
      detectSessionInUrl: boolean;
      flowType: 'pkce' | 'implicit';
    };
    global: {
      headers: Record<string, string>;
    };
    realtime: {
      params: {
        eventsPerSecond: number;
      };
    };
  };
}

const createSupabaseConfig = (): SupabaseConfig => {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const validationErrors = validateSupabaseConfig();
  const hasErrors = validationErrors.some(error => error.severity === 'error');

  return {
    url,
    anonKey,
    environment: ENVIRONMENT,
    isValid: !hasErrors,
    validationErrors,
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'x-application-name': 'citylink-mobile',
          'x-environment': ENVIRONMENT,
          'x-client-version': '1.0.0'
        }
      },
      realtime: {
        params: {
          eventsPerSecond: ENVIRONMENT === 'development' ? 50 : 10
        }
      }
    }
  };
};

// ─── Configuration Logging ──────────────────────────────────────────────────
const logConfigurationStatus = (supabaseConfig: SupabaseConfig): void => {
  if (__DEV__) {
    console.log(`[CityLink Config] Environment: ${supabaseConfig.environment}`);
    console.log(`[CityLink Config] Supabase URL: ${supabaseConfig.url ? 'Set' : 'Missing'}`);
    console.log(`[CityLink Config] Supabase Key: ${supabaseConfig.anonKey ? 'Set' : 'Missing'}`);
    console.log(`[CityLink Config] Configuration Valid: ${supabaseConfig.isValid}`);
    
    if (supabaseConfig.validationErrors.length > 0) {
      console.group('[CityLink Config] Validation Issues:');
      supabaseConfig.validationErrors.forEach(error => {
        const logFn = error.severity === 'error' ? console.error : console.warn;
        logFn(`${error.severity.toUpperCase()}: ${error.field} - ${error.message}`);
      });
      console.groupEnd();
    }
  }
};

// ─── Main Configuration ─────────────────────────────────────────────────────
const supabaseConfig = createSupabaseConfig();
logConfigurationStatus(supabaseConfig);

export const Config = {
  // Supabase configuration (enhanced)
  supabase: supabaseConfig,
  
  // Legacy properties for backward compatibility
  supaUrl: supabaseConfig.url,
  supaKey: supabaseConfig.anonKey,
  
  // Environment
  environment: ENVIRONMENT,
  devMode: process.env.EXPO_PUBLIC_DEV_MODE === 'true' || __DEV__,
  
  // Other services
  aiProxyUrl: process.env.EXPO_PUBLIC_AI_PROXY_URL || 'OFFLINE_MODE',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || null,
  govAuthBaseUrl: process.env.EXPO_PUBLIC_GOV_AUTH_BASE_URL || 'https://api.citylink.gov.et',

  // 🏛️ Fayda National ID Gateway (OIDC)
  faydaBaseUrl: process.env.EXPO_PUBLIC_FAYDA_BASE_URL || 'https://id.et',
  faydaClientId: process.env.EXPO_PUBLIC_FAYDA_CLIENT_ID || 'citylink_client_id',
  faydaScope: 'openid profile kyc_basic',
};

// ─── Configuration Utilities ────────────────────────────────────────────────
export const ConfigUtils = {
  /**
   * Check if Supabase configuration is valid and ready to use
   */
  isSupabaseConfigured(): boolean {
    return Config.supabase.isValid;
  },

  /**
   * Get configuration validation errors
   */
  getSupabaseValidationErrors(): ConfigValidationError[] {
    return Config.supabase.validationErrors;
  },

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig() {
    return {
      environment: Config.environment,
      isDevelopment: Config.environment === 'development',
      isStaging: Config.environment === 'staging',
      isProduction: Config.environment === 'production',
      devMode: Config.devMode
    };
  },

  /**
   * Validate configuration and throw error if invalid
   */
  validateOrThrow(): void {
    if (!Config.supabase.isValid) {
      const errorMessages = Config.supabase.validationErrors
        .filter(error => error.severity === 'error')
        .map(error => `${error.field}: ${error.message}`)
        .join('\n');
      
      throw new Error(`[CityLink] Invalid Supabase configuration:\n${errorMessages}`);
    }
  }
};

// ─── Dev bypass accounts ────────────────────────────────────────────────────
// Maps a normalized phone → expected profile role/merchant_type so the OTP
// screen is skipped entirely for known test numbers.
// ANY code entered is accepted; the real profile is fetched from the DB.
export const DEV_BYPASS_ACCOUNTS: Record<string, { role: string; merchant_type?: string }> = __DEV__
  ? {
      '+251904030403': { role: 'citizen' },
      '+251911178024': { role: 'merchant', merchant_type: 'shop' },
      '+251922222222': { role: 'merchant', merchant_type: 'parking' },
      '+251913162911': { role: 'merchant', merchant_type: 'ekub' },
      '+251973477392': { role: 'merchant', merchant_type: 'delala' },
      '+251900001111': { role: 'merchant', merchant_type: 'restaurant' },
    }
  : {};
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



// Fayda demo database — ONLY available in development builds
export const FAYDA_DB: Record<
  string,
  { name: string; dob: string; gender: string; region: string; status: string }
> = __DEV__
  ? {
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
    }
  : {};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAGS
// Use these to gate incomplete/stub features in production builds.
// Set to true only when the backing service is fully implemented.
// ─────────────────────────────────────────────────────────────────────────────
export const FEATURE_FLAGS = {
  /**
   * liveExchangeRates: Set to true only when a live NBE/forex API is integrated.
   * While false, the exchange rate UI widget MUST be hidden entirely.
   * Showing stale hardcoded rates to users making financial decisions is misleading.
   */
  liveExchangeRates: false,

  /**
   * cloudBackup: Set to true only when backupService is rewritten with AES-256-GCM
   * and cloud save is implemented via Supabase Storage. Currently disabled.
   */
  cloudBackup: false,

  /**
   * faydaMockKyc: Set to true only in development/staging builds.
   * Never enable in production — requires fayda_mock_enabled = true in app_config.
   */
  faydaMockKyc: false, // Hardened: Explicitly disabled to prevent dev bypasses

  /**
   * faydaLiveHandshake: Set to true only when production OIDC credentials are provided.
   * When false, the FaydaBridge will automatically fallback to simulator/mock mode.
   */
  faydaLiveHandshake: false,
};

// Exchange rates (DEMO ONLY — hardcoded values, NOT for production use)
// These rates are stale. Only render this data when FEATURE_FLAGS.liveExchangeRates = true.
// TODO: Integrate with National Bank of Ethiopia (NBE) forex API or a live provider.
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

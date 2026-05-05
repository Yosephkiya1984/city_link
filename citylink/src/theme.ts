// CityLink Design System v6.1 — Premium Obsidian Admin Edition
// High-end Obsidian/Mint design language for super-app command centers.

export const Colors = {
  // ── Addis Noir Light Elements (HTML Demo Parity)
  ink: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceHigh: '#ECEEF2',
  lift: '#ECEEF2',
  top: '#E0E3EA',
  rim: '#E0E3EA',
  overlay: 'rgba(255, 255, 255, 0.88)',
  hint: 'rgba(20, 30, 50, 0.35)',

  // ── Addis Noir Palette
  primary: '#22C97A', // HTML Demo Green
  primaryL: 'rgba(34, 201, 122, 0.12)',
  primaryD: '#1BA363',
  primaryGlow: 'rgba(34, 201, 122, 0.08)',
  primaryB: 'rgba(34, 201, 122, 0.25)',
  primaryGrad: ['#22C97A', '#1BA363'],

  // ── Accents
  gold: '#D4A520',
  amber: '#F0A830', // HTML Demo Amber
  amberDim: 'rgba(240, 168, 48, 0.12)',
  amberL: 'rgba(240, 168, 48, 0.12)',
  amberB: 'rgba(240, 168, 48, 0.25)',
  blue: '#3D8EF0', // HTML Demo Blue
  blueDim: 'rgba(61, 142, 240, 0.12)',
  blueL: 'rgba(61, 142, 240, 0.12)',
  red: '#EF4444', // HTML Demo Red
  redDim: 'rgba(239, 68, 68, 0.12)',
  redL: 'rgba(239, 68, 68, 0.12)',
  purple: '#9D60F8', // HTML Demo Purple
  purpleL: 'rgba(157, 96, 248, 0.12)',
  teal: '#22D4D4', // HTML Demo Teal
  tealL: 'rgba(34, 212, 212, 0.12)',

  secondary: '#F0A830',
  tertiary: '#3D8EF0', // HTML Demo Blue
  success: '#22C97A',
  warning: '#F0A830',
  error: '#EF4444',
  onSurface: '#0F1520',
  onVariant: '#5C6B82',

  // Status Palette (Aliases for convenience)
  green: '#22C97A',
  greenL: 'rgba(34, 201, 122, 0.12)',
  greenB: 'rgba(34, 201, 122, 0.25)',
  greenDim: 'rgba(34, 201, 122, 0.12)',
  yellow: '#F0A830',
  yellowDim: 'rgba(240, 168, 48, 0.12)',
  border: '#E0E3EA',
  bg: '#F5F7FA',
  primaryLow: 'rgba(34, 201, 122, 0.12)',

  glass: 'rgba(0, 0, 0, 0.02)',
  glass2: 'rgba(0, 0, 0, 0.05)',
  edge: 'rgba(0, 0, 0, 0.08)',
  edge2: 'rgba(0, 0, 0, 0.13)',

  text: '#0F1520',
  textSoft: '#5C6B82',
  textSub: '#5C6B82',
  sub: '#5C6B82',
  white: '#FFFFFF',
  black: '#000000',
};

// ── Obsidian Dark Mode (Premium HTML Demo Parity) ───────────────────────────────────────────
export const DarkColors = {
  ink: '#000000', // True Noir
  surface: '#121212', // Stitch Surface
  surfaceHigh: '#1E1E1E',
  lift: '#1E1E1E',
  top: '#242424',
  rim: '#242424',
  overlay: 'rgba(0, 0, 0, 0.88)',

  primary: '#22C97A',
  primaryL: 'rgba(34, 201, 122, 0.12)',
  primaryD: '#1BA363',
  primaryGlow: 'rgba(34, 201, 122, 0.15)',
  primaryB: 'rgba(34, 201, 122, 0.25)',
  primaryGrad: ['#22C97A', '#1BA363'],

  secondary: '#F0A830',
  tertiary: '#3D8EF0',
  success: '#22C97A',
  warning: '#F0A830',
  error: '#EF4444',
  gold: '#D4AF37',
  onSurface: '#E8EDF5',
  onVariant: '#8A95AA',

  // ── Status Palette
  green: '#22C97A',
  greenL: 'rgba(34, 201, 122, 0.12)',
  greenB: 'rgba(34, 201, 122, 0.25)',
  greenDim: 'rgba(34, 201, 122, 0.12)',
  red: '#EF4444',
  crimson: '#EF4444',
  redL: 'rgba(239, 68, 68, 0.12)',
  redDim: 'rgba(239, 68, 68, 0.12)',
  amber: '#F0A830',
  amberL: 'rgba(240, 168, 48, 0.12)',
  amberDim: 'rgba(240, 168, 48, 0.12)',
  amberB: 'rgba(240, 168, 48, 0.25)',
  yellow: '#F0A830',
  yellowDim: 'rgba(240, 168, 48, 0.12)',
  blue: '#3D8EF0',
  blueL: 'rgba(61, 142, 240, 0.12)',
  blueDim: 'rgba(61, 142, 240, 0.12)',
  purple: '#9D60F8',
  purpleL: 'rgba(157, 96, 248, 0.12)',
  teal: '#22D4D4',
  tealL: 'rgba(34, 212, 212, 0.12)',

  border: '#242B3D',
  bg: '#0B0D11',
  primaryLow: 'rgba(34, 201, 122, 0.12)',
  textSub: '#8A95AA',

  glass: 'rgba(255, 255, 255, 0.04)',
  glass2: 'rgba(255, 255, 255, 0.08)',
  edge: 'rgba(255, 255, 255, 0.07)',
  edge2: 'rgba(255, 255, 255, 0.13)',

  text: '#E8EDF5',
  textSoft: '#8A95AA',
  sub: '#8A95AA',
  hint: 'rgba(200, 210, 230, 0.38)',

  white: '#FFFFFF',
  black: '#000000',

  // ── Addis Noir Gradients
  noirGrad: ['#A855F7', '#3B82F6'] as const, // Purple to Blue
  liquidGrad: ['#22C97A', '#059669'] as const, // Green for Finance
};

// ── Shared Design Tokens ─────────────────────────────────────────────────────
export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  bold: 'Inter_700Bold',
  black: 'Inter_900Black',

  // Gold Standard Fonts (Mapping to best available)
  headline: 'SpaceGrotesk_700Bold', // Nearest to Cabinet Grotesk
  body: 'Inter_400Regular', // Nearest to Instrument Sans
  label: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_500Medium',
};

export const FontSize = {
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 22,
  '3xl': 26,
  '4xl': 34,
};

export const Radius = {
  card: 24, // Addis Noir Standard
  '3xl': 28,
  '2xl': 20,
  xl: 16,
  lg: 12,
  md: 8,
  sm: 6,
  xs: 4,
  full: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  primary: {
    shadowColor: '#22C97A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  glow: {
    shadowColor: '#22C97A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
};

// Alias: some screens import Colors as LightColors
export const LightColors = Colors;

export default { Colors, DarkColors, LightColors, Fonts, FontSize, Radius, Spacing, Shadow };

// CityLink Design System v6.1 — Premium Obsidian Admin Edition
// High-end Obsidian/Mint design language for super-app command centers.

export const Colors = {
  // ── Addis Noir Light Elements
  ink: '#FDFDFC',
  surface: '#FFFFFF',
  surfaceHigh: '#F5F5F7',
  lift: '#F7F8F9',
  top: '#EAEDF0',
  rim: '#EDF0F2',
  overlay: '#E2E8F0',
  hint: '#C7C7CC',

  // ── Addis Noir Palette (Ethiopian Modernism)
  primary: '#00A86B', // Ethiopian Modern Green
  primaryL: '#E8F7F0',
  primaryD: '#008454',
  primaryGlow: 'rgba(0,168,107,0.08)',
  primaryB: 'rgba(0,168,107,0.15)',
  primaryGrad: ['#00C980', '#00A86B', '#008454'],

  // ── Ethiopian Gold (Secondary Accent)
  gold: '#F5B800',
  goldL: '#FFEFB2',
  goldD: '#C49300',

  secondary: '#F5B800',
  tertiary: '#ffb4aa',
  success: '#00A86B',
  warning: '#F5B800',
  error: '#E8312A',
  onSurface: '#1c1c1e',
  onVariant: '#3C3C43',

  // ── Status Palette
  green: '#00A86B',
  greenL: 'rgba(0,168,107,0.15)',
  greenB: 'rgba(0,168,107,0.3)',
  red: '#E8312A',
  redL: 'rgba(232,49,42,0.15)',
  redB: 'rgba(232,49,42,0.3)',
  amber: '#F5B800',
  amberL: 'rgba(245,184,0,0.15)',
  amberB: 'rgba(245,184,0,0.3)',
  blue: '#007AFF',
  blueL: '#007AFF20',

  orange: '#FF9500',
  purple: '#AF52DE',
  purpleL: '#AF52DE20',
  teal: '#5AC8FA',

  // ── Glass & Borders
  glass: 'rgba(0,0,0,0.012)',
  glass2: 'rgba(0,0,0,0.038)',
  edge: 'rgba(0,0,0,0.035)',
  edge2: 'rgba(0,0,0,0.075)',
  edgeBright: 'rgba(0,0,0,0.14)',

  // ── Typography
  text: '#000000',
  textSoft: '#3C3C43',
  sub: '#8E8E93',

  white: '#FFFFFF',
  black: '#000000',
};

// ── Obsidian Dark Mode (Premium Admin) ───────────────────────────────────────────
export const DarkColors = {
  ink: '#080B10', // Addis Noir background
  surface: '#11141B', // Noir surface
  surfaceHigh: '#1F242D', // Higher elevation noir
  lift: '#161922', // Low-elevation noir
  top: '#1C1F27', // High-elevation noir
  rim: '#242730', // Noir border accent
  overlay: 'rgba(8, 11, 16, 0.85)', // Noir glass

  primary: '#00A86B', // Ethiopian Modern Green
  primaryL: 'rgba(0,168,107,0.15)',
  primaryD: '#008454',
  primaryGlow: 'rgba(0,168,107,0.2)',
  primaryB: 'rgba(0,168,107,0.35)',
  primaryGrad: ['#00A86B', '#007D4F'],

  secondary: '#F5B800', // Ethiopian Gold
  tertiary: '#ffb4aa',
  success: '#00A86B',
  warning: '#F5B800',
  error: '#E8312A',
  onSurface: '#E1E2EA',
  onVariant: '#BCCABE',

  // ── Status Palette
  green: '#00A86B',
  greenL: 'rgba(0,168,107,0.2)',
  greenB: 'rgba(0,168,107,0.4)',
  red: '#E8312A',
  redL: 'rgba(232,49,42,0.2)',
  redB: 'rgba(232,49,42,0.4)',
  amber: '#F5B800',
  amberL: 'rgba(245,184,0,0.2)',
  amberB: 'rgba(245,184,0,0.4)',
  blue: '#007AFF',
  blueL: '#007AFF20',
  orange: '#FF9500',
  purple: '#AF52DE',
  purpleL: '#AF52DE20',
  teal: '#5AC8FA',

  glass: 'rgba(255,255,255,0.02)',
  glass2: 'rgba(255,255,255,0.06)',
  edge: 'rgba(255,255,255,0.05)',
  edge2: 'rgba(255,255,255,0.1)',
  edgeBright: 'rgba(255,255,255,0.2)',

  text: '#FFFFFF',
  textSoft: '#E1E2EA',
  sub: '#9CA3AF',
  hint: '#6B7280',

  white: '#FFFFFF',
  black: '#000000',
};

// ── Shared Design Tokens ─────────────────────────────────────────────────────
export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  bold: 'Inter_700Bold',
  black: 'Inter_900Black',

  // Premium Admin Fonts
  headline: 'SpaceGrotesk_700Bold',
  body: 'Manrope_500Medium',
  label: 'Manrope_700Bold',
  mono: 'Manrope_500Medium', // Fallback to Manrope for mono text
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
    shadowColor: '#59de9b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  glow: {
    shadowColor: '#59de9b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
};

// Alias: some screens import Colors as LightColors
export const LightColors = Colors;

export default { Colors, DarkColors, LightColors, Fonts, FontSize, Radius, Spacing, Shadow };

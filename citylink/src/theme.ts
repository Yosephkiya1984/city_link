// CityLink Design System v6.1 — Premium Obsidian Admin Edition
// High-end Obsidian/Mint design language for super-app command centers.

export const Colors = {
  // ── High-End Light Elements (Ivory & Glass)
  ink: '#FDFDFC', // Rich Ivory background
  surface: '#FFFFFF', // Pure white surfaces
  lift: '#F7F8F9', // Subtle off-white elevations
  top: '#EAEDF0', // High-elevation / Top bar (light equivalent)
  rim: '#EDF0F2', // Soft grey rims
  overlay: '#E2E8F0', // Overlays
  hint: '#C7C7CC', // Hint text

  // ── Primary Mint/Emerald Palette (Intelligent Design)
  primary: '#59de9b', // Mint Emerald
  primaryL: '#E8F7F0',
  primaryD: '#00A86B',
  primaryGlow: 'rgba(89,222,155,0.08)',
  primaryB: 'rgba(89,222,155,0.15)',
  primaryGrad: ['#78fbb6', '#59de9b', '#00A86B'],

  // ── Gold (Secondary Accent for Luxury)
  gold: '#D4AF37',
  goldL: '#F9E79F',
  goldD: '#B8860B',

  // ── Secondaries (matched to DarkColors)
  secondary: '#ffd887',
  tertiary: '#ffb4aa',
  success: '#59de9b',
  warning: '#fabd0d',
  error: '#ffb4ab',
  onSurface: '#1c1c1e',
  onVariant: '#3C3C43',

  // ── Status Palette
  green: '#34C759',
  greenL: '#34C75920',
  greenB: '#34C75940',
  red: '#FF3B30',
  redL: '#FF3B3020',
  redB: '#FF3B3040',
  amber: '#FF9500',
  amberL: '#FF950020',
  amberB: '#FF950040',
  blue: '#007AFF',
  blueL: '#007AFF20',

  orange: '#FF9500',
  purple: '#AF52DE',
  purpleL: '#AF52DE20',
  teal: '#5AC8FA',

  // ── Glass & Borders (Light Mode Optimization)
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
  ink: '#101319', // Obsidian background
  surface: '#1d2025', // Modern charcoal card
  lift: '#191c21', // Low-elevation containers
  top: '#272a30', // High-elevation / Top bar
  rim: '#32353b', // Surface variant / highest
  overlay: 'rgba(16, 19, 25, 0.7)', // Backdrop blur glass

  primary: '#59de9b', // Mint Emerald
  primaryL: 'rgba(89,222,155,0.12)',
  primaryD: '#00A86B',
  primaryGlow: 'rgba(89,222,155,0.12)',
  primaryB: 'rgba(89,222,155,0.25)',
  primaryGrad: ['#59de9b', '#00A86B'],

  // ── Secondaries matched to ref designs
  secondary: '#ffd887', // Gold Yellow
  tertiary: '#ffb4aa', // Pink Error/Tertiary
  success: '#59de9b',
  warning: '#fabd0d',
  error: '#ffb4ab',
  onSurface: '#e1e2ea',
  onVariant: '#bccabe',

  // ── Status Palette
  green: '#34C759',
  greenL: '#34C75920',
  greenB: '#34C75940',
  red: '#FF3B30',
  redL: '#FF3B3020',
  redB: '#FF3B3040',
  amber: '#FF9500',
  amberL: '#FF950020',
  amberB: '#FF950040',
  blue: '#007AFF',
  blueL: '#007AFF20',
  orange: '#FF9500',
  purple: '#AF52DE',
  purpleL: '#AF52DE20',
  teal: '#5AC8FA',

  glass: 'rgba(255,255,255,0.015)',
  glass2: 'rgba(255,255,255,0.045)',
  edge: 'rgba(255,255,255,0.042)',
  edge2: 'rgba(255,255,255,0.08)',
  edgeBright: 'rgba(255,255,255,0.15)',

  text: '#FFFFFF',
  textSoft: '#D1D5DB',
  sub: '#6B7280',
  hint: '#4B5563',

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

import { createTamagui, createTokens, createFont } from 'tamagui';

// Addis Noir Tokens - The core visual DNA of CityLink
const tokens = createTokens({
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    true: 16, // Default spacing
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    true: 16,
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16, // UI elements (buttons, inputs)
    5: 24, // Cards
    6: 32, // Large surfaces (bottom sheets)
    true: 16,
    round: 999,
  },
  color: {
    primary: '#0F52BA', // Sapphire Blue
    ink: '#050505', // True Pitch Black
    surface: '#111111', // Slightly elevated black
    lift: '#1A1A1A', // Floating element black
    edge: 'rgba(255, 255, 255, 0.05)', // Subtle borders
    edge2: 'rgba(255, 255, 255, 0.1)', // Slightly visible borders
    text: '#FFFFFF',
    sub: 'rgba(255, 255, 255, 0.6)',
    hint: 'rgba(255, 255, 255, 0.3)',
    gold: '#D4AF37', // Premium accents
    red: '#FF3B30', // Destructive/Alerts
    green: '#34C759', // Success
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
});

// Fonts
const headingFont = createFont({
  family: 'System',
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 20,
    5: 24,
    6: 32,
    7: 40,
    8: 48,
    true: 24,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 24,
    4: 28,
    5: 32,
    6: 40,
    7: 48,
    8: 56,
  },
  weight: {
    1: '400',
    4: '700',
    7: '900', // For our signature heavy titles
    true: '700',
  },
  letterSpacing: {
    4: 0,
    7: -1, // Tighter tracking for large bold text
    true: 0,
  },
});

const bodyFont = createFont({
  family: 'System',
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    true: 14,
  },
  lineHeight: {
    1: 18,
    2: 20,
    3: 24,
    4: 26,
    true: 20,
  },
  weight: {
    1: '400',
    4: '600',
    true: '400',
  },
  letterSpacing: {
    1: 0,
    true: 0,
  },
});

export const config = createTamagui({
  tokens,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  themes: {
    light: {
      background: tokens.color.ink, // Enforcing Dark Mode always for Addis Noir
      color: tokens.color.text,
    },
    dark: {
      background: tokens.color.ink,
      color: tokens.color.text,
    },
  },
  shorthands: {
    px: 'paddingHorizontal',
    py: 'paddingVertical',
    mx: 'marginHorizontal',
    my: 'marginVertical',
    p: 'padding',
    m: 'margin',
    bg: 'backgroundColor',
    br: 'borderRadius',
    bw: 'borderWidth',
    bc: 'borderColor',
  } as const,
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

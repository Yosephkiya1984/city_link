import { Dimensions } from 'react-native';

export const T = {
  bg: '#0c0e12',
  surface: '#161a20',
  surfaceHigh: '#1e2228',
  card: '#12161c',
  primary: '#40d991',
  primaryDim: '#40d99120',
  secondary: '#f59e0b',
  secondaryDim: '#f59e0b18',
  accent: '#7c3aed',
  accentDim: '#7c3aed18',
  red: '#ef4444',
  redDim: '#ef444418',
  text: '#e2e8f0',
  textSub: '#64748b',
  textMuted: '#334155',
  white: '#FFFFFF',
  border: 'rgba(255,255,255,0.06)',
  borderBright: 'rgba(255,255,255,0.12)',
  glass: 'rgba(12,14,18,0.9)',
};

export const CATEGORIES = [
  { id: 'All', name: 'All', icon: 'grid', color: '#40d991' },
  { id: 'Electronics', name: 'Electronics', icon: 'phone-portrait', color: '#06b6d4' },
  { id: 'Fashion', name: 'Fashion', icon: 'shirt', color: '#ec4899' },
  { id: 'Food', name: 'Food', icon: 'restaurant', color: '#f59e0b' },
  { id: 'Home', name: 'Home', icon: 'home', color: '#10b981' },
  { id: 'Beauty', name: 'Beauty', icon: 'color-palette', color: '#8b5cf6' },
  { id: 'Tech', name: 'Tech', icon: 'hardware-chip', color: '#3b82f6' },
];

export const getDimensions = () => Dimensions.get('window');
export const SW = Dimensions.get('window').width;
export const SH = Dimensions.get('window').height;

import { useSystemStore } from '../store/SystemStore';

// Locale imports
import en from '../locales/en.json';
import am from '../locales/am.json';
import om from '../locales/om.json';

const dictionaries: Record<string, any> = { en, am, om };

/**
 * t — Scalable translation utility.
 * Supports variable interpolation (e.g., %{count}) and fallback chains.
 */
export function t(key: string, options?: Record<string, any>, langOverride?: string): string {
  if (!key) return '';

  const activeLang = langOverride || useSystemStore.getState().lang || 'en';
  const dict = dictionaries[activeLang] || dictionaries['en'];

  let result = dict[key.toLowerCase()] || key;

  // Fallback: If result is still the key and contains underscores, humanize it for English
  if (result === key && activeLang === 'en') {
    result = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Variable Interpolation
  if (options && typeof result === 'string') {
    Object.keys(options).forEach((optKey) => {
      const regex = new RegExp(`%\\{${optKey}\\}`, 'g');
      result = result.replace(regex, String(options[optKey]));
    });
  }

  return result;
}

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return t('good_morning');
  if (hour < 17) return t('good_afternoon');
  return t('good_evening');
};

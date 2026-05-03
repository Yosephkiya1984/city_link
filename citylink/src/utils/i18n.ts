import { useCallback } from 'react';
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

  const state = useSystemStore.getState();
  const activeLang = langOverride || (state ? state.lang : 'en') || 'en';
  const dict = dictionaries[activeLang] || dictionaries['en'] || {};

  // Handle keys like 'ROLE_DELIVERY_AGENT' or 'role_delivery_agent'
  const normalizedKey = key.toLowerCase();
  let result = dict[normalizedKey] || dict[key] || key;

  // Fallback: If result is still the key and contains underscores, humanize it for English
  if (result === key && activeLang === 'en') {
    result = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Variable Interpolation
  if (options && typeof result === 'string') {
    Object.keys(options).forEach((optKey) => {
      // Support both %{key} and {{key}} syntaxes
      const regex = new RegExp(`(%\\{${optKey}\\}|\\{\\{${optKey}\\}\\})`, 'g');
      result = result.replace(regex, String(options[optKey]));
    });
  }

  return result;
}

/**
 * useT — Hook version of t() that automatically re-renders when language changes.
 */
export function useT() {
  const lang = useSystemStore((s) => s.lang);

  const translate = useCallback(
    (key: string, options?: Record<string, any>) => {
      return t(key, options, lang);
    },
    [lang]
  );

  return translate;
}

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

/**
 * i18n Configuration
 * 
 * Defines supported locales, default locale, and locale detection settings
 * for the Next.js App Router with next-intl.
 */

export const locales = ['en', 'vi'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
};

// Cookie name for storing user's locale preference
export const localeCookieName = 'NEXT_LOCALE';

// Locale detection configuration
export const localeDetection = true;


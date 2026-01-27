import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, locales, localeCookieName, type Locale } from './config';

/**
 * Get the locale from the request.
 * Priority: Cookie > Accept-Language header > Default locale
 */
async function getLocale(): Promise<Locale> {
  // Check for locale cookie first
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(localeCookieName);
  
  if (localeCookie && locales.includes(localeCookie.value as Locale)) {
    return localeCookie.value as Locale;
  }

  // Fall back to Accept-Language header
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  
  if (acceptLanguage) {
    const preferredLocales = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().split('-')[0])
      .filter((lang): lang is Locale => locales.includes(lang as Locale));
    
    if (preferredLocales.length > 0) {
      return preferredLocales[0];
    }
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await getLocale();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});


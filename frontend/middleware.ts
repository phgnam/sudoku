import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale, localeCookieName, type Locale } from './i18n/config';

/**
 * Next.js Middleware for locale detection (without URL prefixes).
 *
 * This middleware:
 * 1. Detects user's preferred locale from cookies or Accept-Language header
 * 2. Sets the locale cookie for persistence
 * 3. Does NOT redirect or add locale prefixes to URLs
 */
export function middleware(request: NextRequest) {
  // Check if locale is already set in cookie
  const localeCookie = request.cookies.get(localeCookieName);

  if (localeCookie && locales.includes(localeCookie.value as Locale)) {
    // Locale already set, continue
    return NextResponse.next();
  }

  // Try to detect locale from Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  let detectedLocale: Locale = defaultLocale;

  if (acceptLanguage) {
    const preferredLocales = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().split('-')[0])
      .filter((lang): lang is Locale => locales.includes(lang as Locale));

    if (preferredLocales.length > 0) {
      detectedLocale = preferredLocales[0];
    }
  }

  // Set the locale cookie
  const response = NextResponse.next();
  response.cookies.set(localeCookieName, detectedLocale, {
    path: '/',
    maxAge: 31536000, // 1 year
  });

  return response;
}

export const config = {
  // Match all pathnames except for:
  // - API routes
  // - Static files (_next, images, etc.)
  // - Public files (favicon.ico, etc.)
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};


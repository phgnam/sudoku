import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

/**
 * Navigation utilities for i18n.
 * Provides locale-aware Link, useRouter, usePathname, and redirect.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation({
    locales,
    defaultLocale,
  });


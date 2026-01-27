"use client";

import { useState, useEffect, useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";

/**
 * Language Switcher Component
 * 
 * Allows users to switch between Vietnamese and English languages.
 * Uses cookies to persist the locale preference.
 */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-language-switcher]")) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isOpen]);

  const handleLocaleChange = (newLocale: Locale) => {
    // Set cookie for locale preference
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    
    startTransition(() => {
      // Refresh the page to apply the new locale
      router.refresh();
    });
    
    setIsOpen(false);
  };

  if (!mounted) {
    return null;
  }

  const currentLocale = locales.find((l) => l === locale) || "en";

  return (
    <div
      data-language-switcher
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          borderRadius: "8px",
          backgroundColor: "#f3f4f6",
          border: "1px solid #e5e7eb",
          cursor: isPending ? "wait" : "pointer",
          fontSize: "14px",
          fontWeight: 500,
          color: "#374151",
          transition: "all 0.2s ease",
          opacity: isPending ? 0.7 : 1,
        }}
        className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600"
      >
        <span style={{ fontSize: "16px" }}>
          {currentLocale === "vi" ? "🇻🇳" : "🇬🇧"}
        </span>
        <span>{localeNames[currentLocale as Locale]}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "4px",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            zIndex: 50,
            minWidth: "140px",
          }}
          className="dark:bg-slate-800 dark:border-slate-600"
        >
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "10px 14px",
                border: "none",
                backgroundColor: loc === currentLocale ? "#f3f4f6" : "transparent",
                cursor: "pointer",
                fontSize: "14px",
                color: "#374151",
                textAlign: "left",
                transition: "background-color 0.2s ease",
              }}
              className={`dark:text-slate-200 ${loc === currentLocale ? "dark:bg-slate-700" : "dark:hover:bg-slate-700"} hover:bg-gray-100`}
            >
              <span style={{ fontSize: "16px" }}>
                {loc === "vi" ? "🇻🇳" : "🇬🇧"}
              </span>
              <span>{localeNames[loc]}</span>
              {loc === currentLocale && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="#10b981"
                  style={{ marginLeft: "auto" }}
                >
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


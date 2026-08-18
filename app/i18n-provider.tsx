"use client";

/**
 * Client-side i18n provider for non-locale routes.
 * Reads the locale from the URL path and loads the appropriate messages.
 * This wraps all non-[locale] pages so useTranslations() works everywhere.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { locales, defaultLocale } from "@/i18n/config";

type Locale = (typeof locales)[number];

function getLocaleFromPath(pathname: string): Locale {
  const seg = pathname.split("/")[1];
  return locales.includes(seg as Locale) ? (seg as Locale) : defaultLocale;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);

  const [messages, setMessages] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // Dynamically import the messages for the detected locale
    import(`../messages/${locale}.json`)
      .then((mod) => setMessages(mod.default as Record<string, unknown>))
      .catch(() => {
        // Fallback to English
        import("../messages/en.json")
          .then((mod) => setMessages(mod.default as Record<string, unknown>))
          .catch(() => setMessages({}));
      });
  }, [locale]);

  // Render children immediately with an empty messages object to avoid
  // blocking the page. Messages load async and re-render when ready.
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages ?? {}}
      onError={() => {/* suppress missing message errors during load */}}
    >
      {children}
    </NextIntlClientProvider>
  );
}

"use client";

/**
 * Client-side i18n provider for non-locale routes (dashboard, admin, etc.)
 * Uses static imports so Turbopack/Webpack can statically analyze all chunks.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { locales, defaultLocale } from "@/i18n/config";

// Static imports — bundler can analyze these at build time
import enMessages from "../messages/en.json";
import arMessages from "../messages/ar.json";
import omMessages from "../messages/om.json";
import amMessages from "../messages/am.json";

type Locale = (typeof locales)[number];

const messageMap: Record<Locale, Record<string, unknown>> = {
  en: enMessages as Record<string, unknown>,
  ar: arMessages as Record<string, unknown>,
  om: omMessages as Record<string, unknown>,
  am: amMessages as Record<string, unknown>,
};

function getLocaleFromPath(pathname: string): Locale {
  const seg = pathname.split("/")[1];
  return locales.includes(seg as Locale) ? (seg as Locale) : defaultLocale;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale   = getLocaleFromPath(pathname);
  const messages = messageMap[locale] ?? messageMap[defaultLocale];

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={() => {/* suppress missing message errors */}}
    >
      {children}
    </NextIntlClientProvider>
  );
}

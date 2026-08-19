"use client";

/**
 * Sets the document's dir and lang attributes on the <html> element
 * based on the current URL locale. Runs client-side after hydration.
 * This is necessary because the root layout <html> is static and doesn't
 * know the locale — the locale layout only has a wrapper <div>.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { locales, localeDirections } from "@/i18n/config";

type Locale = (typeof locales)[number];

function getLocaleFromPath(pathname: string): Locale {
  const seg = pathname.split("/")[1];
  return locales.includes(seg as Locale) ? (seg as Locale) : "en";
}

export function DirectionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const locale = getLocaleFromPath(pathname);
    const dir    = localeDirections[locale] ?? "ltr";
    document.documentElement.dir  = dir;
    document.documentElement.lang = locale;
  }, [pathname]);

  return <>{children}</>;
}

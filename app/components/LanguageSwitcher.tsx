"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FiGlobe } from "react-icons/fi";
import { locales, localeNames, localeFlags, localeDirections } from "@/i18n/config";

type Locale = (typeof locales)[number];

export function LanguageSwitcher() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Get current locale from pathname
  const getCurrentLocale = (): Locale => {
    const segments = pathname.split('/');
    const locale = segments[1];
    return locales.includes(locale as Locale) ? locale as Locale : 'en';
  };

  const [current, setCurrent] = useState<Locale>(getCurrentLocale());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // The URL is the source of truth so browser navigation and shared links
    // always show the same language as the page content.
    setCurrent(getCurrentLocale());
    setMounted(true);
  }, [pathname]);

  const setLanguage = async (code: Locale) => {
    setCurrent(code);
    localStorage.setItem("lang", code);

    // Build the new path preserving the current route:
    // - If the path already has a locale prefix (/en/...), swap it
    // - If it doesn't (/dashboard, /courses, etc.), prepend the new locale
    const segments = pathname.split("/").filter(Boolean);
    const hasLocale = locales.includes(segments[0] as Locale);

    let newPath: string;
    if (hasLocale) {
      // Replace existing locale prefix
      segments[0] = code;
      newPath = "/" + segments.join("/");
    } else {
      // Non-locale route — prepend locale and keep the full path
      newPath = `/${code}${pathname}`;
    }

    // Preserve search params if any
    const search = window.location.search;
    router.push(newPath + search);

    if (session?.user) {
      await fetch(`/api/users/${(session.user as { id: string }).id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ preferredLanguage: code }),
      }).catch(() => {});
    }
  };

  const currentLang = {
    code: current,
    name: localeNames[current],
    flag: localeFlags[current],
    dir: localeDirections[current],
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          suppressHydrationWarning
          className="flex items-center gap-1.5 p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] border border-transparent hover:border-[var(--border)] transition-all"
          aria-label="Change language"
        >
          <FiGlobe size={15} />
          {mounted && (
            <span className="text-xs font-medium hidden sm:inline">
              {currentLang.flag}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] p-1.5 min-w-[160px] z-50 animate-fadeInUp"
          sideOffset={8}
          align="end"
        >
          {locales.map((locale) => (
            <DropdownMenu.Item
              key={locale}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer outline-none transition-colors text-sm ${
                current === locale
                  ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
              }`}
              onClick={() => setLanguage(locale)}
            >
              <span className="text-lg">{localeFlags[locale]}</span>
              <span className={localeDirections[locale] === "rtl" ? "font-arabic" : ""}>
                {localeNames[locale]}
              </span>
              {current === locale && (
                <span className="ml-auto text-xs text-[var(--accent)]">✓</span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

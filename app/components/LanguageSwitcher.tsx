"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FiGlobe } from "react-icons/fi";

const LANGUAGES = [
  { code: "en", label: "English",     dir: "ltr", flag: "🇬🇧" },
  { code: "ar", label: "العربية",     dir: "rtl", flag: "🇸🇦" },
  { code: "om", label: "Afaan Oromo", dir: "ltr", flag: "🇪🇹" },
] as const;

type LangCode = "en" | "ar" | "om";

export function LanguageSwitcher() {
  const { data: session } = useSession();

  // Always start with "en" on both server and client to avoid hydration mismatch.
  // After mount we overwrite with whatever is stored in localStorage.
  const [current, setCurrent] = useState<LangCode>("en");
  const [mounted, setMounted]  = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lang") as LangCode | null;
    if (stored && ["en", "ar", "om"].includes(stored)) {
      setCurrent(stored);
    }
    setMounted(true);
  }, []);

  const setLanguage = async (code: LangCode) => {
    setCurrent(code);
    localStorage.setItem("lang", code);

    const html = document.documentElement;
    const lang = LANGUAGES.find((l) => l.code === code);
    html.setAttribute("lang", code);
    html.setAttribute("dir", lang?.dir ?? "ltr");

    if (session?.user) {
      await fetch(`/api/users/${(session.user as { id: string }).id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ preferredLanguage: code }),
      }).catch(() => {});
    }
  };

  const currentLang = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {/* suppressHydrationWarning prevents React from throwing on the
            Radix-generated id attribute which may differ between SSR and CSR
            due to component-counter ordering. */}
        <button
          suppressHydrationWarning
          className="flex items-center gap-1.5 p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] border border-transparent hover:border-[var(--border)] transition-all"
          aria-label="Change language"
        >
          <FiGlobe size={15} />
          {/* Only show the flag after mount to avoid SSR/CSR flag mismatch */}
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
          {LANGUAGES.map((lang) => (
            <DropdownMenu.Item
              key={lang.code}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer outline-none transition-colors text-sm ${
                current === lang.code
                  ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
              }`}
              onClick={() => setLanguage(lang.code)}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className={lang.dir === "rtl" ? "font-arabic" : ""}>{lang.label}</span>
              {current === lang.code && (
                <span className="ml-auto text-xs text-[var(--accent)]">✓</span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

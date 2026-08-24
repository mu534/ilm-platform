"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { GiMoon, GiStarFormation } from "react-icons/gi";
import { FiMail, FiGithub, FiHeart } from "react-icons/fi";
import { useLocale, useTranslations } from "next-intl";

export function Footer() {
  const pathname = usePathname();
  let locale = "en";
  try {
    locale = useLocale();
  } catch {
    locale = "en";
  }

  let nav = (key: string) => key;
  let t = (key: string) => key;
  try {
    const intlNav = useTranslations("nav");
    const intlFooter = useTranslations("footer");
    nav = (key: string) => { try { return intlNav(key); } catch { return key; } };
    t = (key: string) => { try { return intlFooter(key); } catch { return key; } };
  } catch {
    const navMap: Record<string, string> = {
      home: "Home", courses: "Courses", scholars: "Scholars", forum: "Forum", login: "Log in", register: "Register", myLearning: "My Learning",
    };
    const footerMap: Record<string, string> = {
      lectures: "Lectures", activity: "Activity", myProfile: "My Profile", tagline: "Authentic Islamic knowledge from verified scholars.", explore: "Explore", account: "Account", madeWith: "Made with", forUmmah: "for the Ummah",
    };
    nav = (k: string) => navMap[k] ?? k;
    t = (k: string) => footerMap[k] ?? k;
  }

  const localHref = (href: string) => href === "/" ? `/${locale}` : `/${locale}${href}`;
  const exploreLinks = [
    { href: "/",        label: nav("home") },
    { href: "/courses", label: nav("courses") },
    { href: "/lectures", label: t("lectures") },
    { href: "/scholars", label: nav("scholars") },
    { href: "/forum",   label: nav("forum") },
    { href: "/activity", label: t("activity") },
    { href: "/contact", label: "Contact Us" },
  ];
  const accountLinks = [
    { href: "/login", label: nav("login") },
    { href: "/register", label: nav("register") },
    { href: "/profile", label: t("myProfile") },
    { href: "/dashboard", label: nav("myLearning") },
  ];

  const appPath = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  if (
    appPath.startsWith("/dashboard") ||
    appPath.startsWith("/profile") ||
    appPath.startsWith("/settings") ||
    appPath.startsWith("/admin")
  ) {
    return null;
  }
  return (
    <footer className="relative mt-16 border-t border-[var(--border)] overflow-hidden">
      {/* Light mode — warm gradient background */}
      <div className="absolute inset-0 bg-[var(--bg-secondary)]" />
      <div className="absolute inset-0 pattern-overlay opacity-30" />

      {/* Light mode sunburst at top */}
      <div className="absolute inset-x-0 top-0 h-48 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 100% at 50% 0%, var(--accent-dim), transparent)"
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          {/* ── Brand ── */}
          <div className="col-span-1 md:col-span-2">
            <Link href={localHref("/")} className="inline-flex items-center gap-2.5 group mb-4">
              <Image src="/logo.png" alt="Ilm Platform" width={36} height={36} className="object-contain group-hover:scale-105 transition-transform duration-300" />
              <span className="font-display text-xl font-semibold">
                <span className="gradient-text">Ilm</span>
                <span className="text-[var(--text-secondary)] ml-1">Platform</span>
              </span>
            </Link>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs mb-5">
              {t("tagline")}
            </p>

            {/* Arabic */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border)]">
              <GiStarFormation className="text-gold-500 text-xs flex-shrink-0" />
              <p className="arabic-bismillah text-base" style={{ margin: 0, fontSize: "1.1rem" }}>
                بِسْمِ اللّٰهِ الرَّحْمَنِ الرَّحِيْمِ
              </p>
              <GiStarFormation className="text-gold-500 text-xs flex-shrink-0" />
            </div>
          </div>

          {/* ── Explore ── */}
          <div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] mb-4 tracking-widest uppercase">
              {t("explore")}
            </h4>
            <ul className="space-y-2.5">
              {exploreLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={localHref(href)}
                    className="group flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-200"
                  >
                    <span className="w-0 h-px bg-gold-500 group-hover:w-3 transition-all duration-300 rounded-full" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Account ── */}
          <div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] mb-4 tracking-widest uppercase">
              {t("account")}
            </h4>
            <ul className="space-y-2.5">
              {accountLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={localHref(href)}
                    className="group flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-200"
                  >
                    <span className="w-0 h-px bg-gold-500 group-hover:w-3 transition-all duration-300 rounded-full" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-[var(--border)] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
            © {new Date().getFullYear()} Ilm Platform. {t("madeWith")}
            <FiHeart className="text-gold-500 animate-pulse" size={11} />
            {t("forUmmah")}
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-all duration-200 hover:scale-110"
              aria-label="Contact us"
            >
              <FiMail size={15} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

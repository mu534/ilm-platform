"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import type { SessionUser } from "../types/auth.types";
import {
  FiMenu, FiX, FiChevronDown, FiUser,
  FiLogOut, FiSettings, FiBookOpen, FiActivity, FiLayout,
} from "react-icons/fi";
import { GiMoon, GiSun } from "react-icons/gi";
import { useTheme } from "./ThemeProvider";
import { NotificationBell } from "./NotificationBell";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLocale, useTranslations } from "next-intl";

import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  let locale = "en";
  try {
    locale = useLocale();
  } catch {
    locale = "en";
  }

  let t = (key: string) => key;
  try {
    const intlT = useTranslations("nav");
    t = (key: string) => {
      try {
        return intlT(key);
      } catch {
        const fallbackMap: Record<string, string> = {
          home: "Home", courses: "Courses", scholars: "Scholars", forum: "Forum", admin: "Admin",
          profile: "Profile", settings: "Settings", myLearning: "My Learning", manageCourses: "Manage Courses",
          dashboard: "Dashboard", signOut: "Sign Out", login: "Log in", getStarted: "Get Started", register: "Register",
        };
        return fallbackMap[key] ?? key;
      }
    };
  } catch {
    const fallbackMap: Record<string, string> = {
      home: "Home", courses: "Courses", scholars: "Scholars", forum: "Forum", admin: "Admin",
      profile: "Profile", settings: "Settings", myLearning: "My Learning", manageCourses: "Manage Courses",
      dashboard: "Dashboard", signOut: "Sign Out", login: "Log in", getStarted: "Get Started", register: "Register",
    };
    t = (key: string) => fallbackMap[key] ?? key;
  }
  const { data: session, status }     = useSession();
  const [mobileOpen, setMobileOpen]  = useState(false);
  const [mounted,    setMounted]     = useState(false);
  const { theme, toggleTheme, isLight } = useTheme();
  const user = session?.user as SessionUser | undefined;

  // Delay rendering auth buttons until client is mounted to prevent
  // Login/Get Started flash after login redirects
  useEffect(() => { setMounted(true); }, []);
  const localHref = (href: string) => href === "/" ? `/${locale}` : `/${locale}${href}`;
  const navLinks = [
    { href: "/",        label: t("home") },
    { href: "/courses", label: t("courses") },
    { href: "/scholars", label: t("scholars") },
    { href: "/forum",   label: t("forum") },
    { href: "/contact", label: "Contact" },
  ];

  // Hide public navigation inside the LMS shells. Routes are locale-prefixed
  // (for example, /en/dashboard), so compare after the locale segment.
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
    <header className="sticky top-0 z-50 border-b border-[var(--border)]"
      style={{ background: isLight
        ? "rgba(253,250,243,0.92)"
        : "rgba(8,7,6,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Top accent strip */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-60" />

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link href={localHref("/")} className="flex items-center gap-2.5 group flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Ilm Platform"
              width={40}
              height={40}
              className="object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <span className="font-display text-xl font-semibold tracking-tight">
              <span className="gradient-text">Ilm</span>
              <span className="text-[var(--text-secondary)] ml-1">Platform</span>
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={localHref(l.href)}
                className="relative px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-dim)] transition-all duration-200"
              >
                {l.label}
              </Link>
            ))}
            {user?.role === "ADMIN" && (
              <Link href={localHref("/admin")} className="px-3 py-1.5 text-sm font-medium text-[var(--accent)] rounded-lg hover:bg-[var(--accent-dim)] transition-all">
                {t("admin")}
              </Link>
            )}
          </div>

          {/* ── Right side ── */}
          <div className="hidden md:flex items-center gap-2">

            {/* Language switcher */}
            <LanguageSwitcher />

            {/* Theme toggle — polished pill */}
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
              title={`Switch to ${isLight ? "dark" : "light"} mode`}
            >
              <span className="theme-toggle__knob">
                {isLight
                  ? <GiMoon  className="text-[var(--text-muted)]"  size={12} />
                  : <GiSun   className="text-[var(--accent-light)]" size={12} />
                }
              </span>
            </button>

            {/* Notifications */}
            {mounted && session && <NotificationBell />}

            {/* Auth */}
            {(!mounted || status === "loading") ? (
              /* Skeleton — shown until client mounts and session resolves */
              <div className="w-24 h-8 rounded-xl bg-[var(--accent-dim)] animate-pulse ml-1" />
            ) : session ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[var(--accent-dim)] border border-transparent hover:border-[var(--border)] transition-all duration-200 ml-1">
                    <Avatar.Root className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-[var(--border-strong)]">
                      <Avatar.Image src={user?.image ?? ""} className="w-full h-full object-cover" />
                      <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-[var(--accent)] text-white text-xs font-bold">
                        {user?.name?.[0]?.toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <span className="text-sm text-[var(--text-primary)] font-medium max-w-[80px] truncate">
                      {user?.name?.split(" ")[0]}
                    </span>
                    <FiChevronDown className="text-[var(--text-muted)]" size={13} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="glass-card gold-border rounded-2xl p-1.5 min-w-[200px] shadow-[var(--shadow-lg)] animate-fadeInUp z-50"
                    sideOffset={8}
                    align="end"
                  >
                    {/* User info header */}
                    <div className="px-3 py-2.5 border-b border-[var(--border)] mb-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.name}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
                    </div>

                    <DropdownMenu.Item asChild>
                      <Link href={localHref("/profile")} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors">
                        <FiUser size={14} className="text-[var(--accent)]" /> {t("profile")}
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href={localHref("/settings")} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors">
                        <FiSettings size={14} className="text-[var(--accent)]" /> {t("settings")}
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href={localHref("/dashboard")} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors">
                        <FiActivity size={14} className="text-[var(--accent)]" /> {t("myLearning")}
                      </Link>
                    </DropdownMenu.Item>
                    {user?.role === "INSTRUCTOR" && (
                      <DropdownMenu.Item asChild>
                        <Link href={localHref("/dashboard/instructor")} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors">
                          <FiLayout size={14} className="text-[var(--accent)]" /> Instructor Portal
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    {user?.role === "ADMIN" && (
                      <DropdownMenu.Item asChild>
                        <Link href={localHref("/admin/courses")} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors">
                          <FiBookOpen size={14} className="text-[var(--accent)]" /> {t("manageCourses")}
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    {user?.role === "ADMIN" && (
                      <DropdownMenu.Item asChild>
                        <Link href={localHref("/admin")} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors">
                          <FiSettings size={14} /> {t("admin")} {t("dashboard")}
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
                    <DropdownMenu.Item
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl cursor-pointer transition-colors"
                      onClick={() => signOut({ callbackUrl: "/en" })}
                    >
                      <FiLogOut size={14} /> {t("signOut")}
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                <Link href={localHref("/login")} className="px-4 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--accent-dim)] transition-all">
                  {t("login")}
                </Link>
                <Link href={localHref("/register")} className="btn-primary px-4 py-2 text-sm rounded-xl">
                  {t("getStarted")}
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile toggle ── */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile theme pill */}
            <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
              <span className="theme-toggle__knob">
                {isLight ? <GiMoon size={10} className="text-[var(--text-muted)]" /> : <GiSun size={10} className="text-[var(--accent-light)]" />}
              </span>
            </button>
            <button
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-[var(--border)] space-y-0.5 animate-fadeInUp">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={localHref(l.href)}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-all"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-[var(--border)] space-y-0.5 mt-2">
              {(!mounted || status === "loading") ? (
                <div className="h-8 w-full rounded-xl bg-[var(--accent-dim)] animate-pulse" />
              ) : session ? (
                <>
                  <Link href={localHref("/profile")}    onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-dim)] transition-all">{t("profile")}</Link>
                  <Link href={localHref("/settings")}   onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-dim)] transition-all">{t("settings")}</Link>
                  <Link href={localHref("/dashboard")}  onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-dim)] transition-all">{t("myLearning")}</Link>
                  {user?.role === "INSTRUCTOR" && (
                    <Link href={localHref("/dashboard/instructor")} onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-dim)] transition-all">Instructor Portal</Link>
                  )}
                  {user?.role === "ADMIN" && (
                    <Link href={localHref("/admin/courses")} onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-dim)] transition-all">{t("manageCourses")}</Link>
                  )}
                  {user?.role === "ADMIN" && (
                    <Link href={localHref("/admin")}    onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-xl text-sm text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-all">{t("admin")}</Link>
                  )}
                  <button onClick={() => signOut({ callbackUrl: "/en" })} className="block w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all">
                    {t("signOut")}
                  </button>
                </>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Link href={localHref("/login")}    onClick={() => setMobileOpen(false)} className="flex-1 text-center px-4 py-2 text-sm border border-[var(--border)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--accent-dim)] transition-all">{t("login")}</Link>
                  <Link href={localHref("/register")} onClick={() => setMobileOpen(false)} className="flex-1 text-center btn-primary py-2 text-sm rounded-xl">{t("register")}</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}


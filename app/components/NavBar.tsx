"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import type { SessionUser } from "../types/auth.types";
import {
  FiMenu, FiX, FiChevronDown, FiUser,
  FiLogOut, FiSettings, FiBookOpen,
} from "react-icons/fi";
import { GiMoon, GiSun } from "react-icons/gi";
import { useTheme } from "./ThemeProvider";
import { NotificationBell } from "./NotificationBell";

const navLinks = [
  { href: "/",         label: "Home"     },
  { href: "/courses",  label: "Courses"  },
  { href: "/lectures", label: "Lectures" },
  { href: "/scholars", label: "Scholars" },
];

export function Navbar() {
  const { data: session }              = useSession();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const { theme, toggleTheme }         = useTheme();
  const user                           = session?.user as SessionUser;
  const isLight                        = theme === "light";

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-[var(--border)]">
      {/* Light mode — subtle top gradient strip */}
      {isLight && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-400 via-gold-300 to-gold-500 opacity-70" />
      )}

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 group">
            {isLight ? (
              <div className="relative">
                <GiSun className="text-gold-500 text-2xl group-hover:rotate-180 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gold-400/20 rounded-full blur-sm scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ) : (
              <GiMoon className="text-gold-400 text-2xl group-hover:rotate-12 transition-transform duration-300" />
            )}
            <span className="font-display text-xl font-semibold">
              <span className="gradient-text">Ilm</span>
              <span className="text-[var(--text-secondary)] ml-1">Platform</span>
            </span>
          </Link>

          {/* ── Desktop nav links ── */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="relative text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200 group"
              >
                {l.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-gradient-to-r from-gold-400 to-gold-600 rounded-full group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-sm font-medium text-gold-500 hover:text-gold-400 transition-colors"
              >
                Admin
              </Link>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
              className={`
                relative p-2 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95
                ${isLight
                  ? "bg-amber-50 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 shadow-sm"
                  : "bg-ink-800/60 border border-white/10 hover:bg-ink-700/60"
                }
              `}
            >
              {isLight ? (
                <GiMoon className="text-ink-700 text-base" />
              ) : (
                <GiSun className="text-gold-400 text-base" />
              )}
            </button>
          </div>

          {/* ── Auth ── */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <NotificationBell />
                <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[var(--accent-dim)] border border-transparent hover:border-[var(--border)] transition-all duration-200">
                    <Avatar.Root className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-gold-400/30">
                      <Avatar.Image src={user?.image ?? ""} className="w-full h-full object-cover" />
                      <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-gold-600 text-white text-xs font-bold">
                        {user?.name?.[0]?.toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <span className="text-sm text-[var(--text-primary)] font-medium">
                      {user?.name?.split(" ")[0]}
                    </span>
                    <FiChevronDown className="text-[var(--text-muted)] text-xs" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="glass-card gold-border rounded-2xl p-1.5 min-w-[190px] shadow-2xl animate-fadeInUp z-50"
                    sideOffset={8}
                    align="end"
                  >
                    <DropdownMenu.Item asChild>
                      <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors">
                        <FiUser size={14} /> Profile
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors">
                        <FiBookOpen size={14} /> My Learning
                      </Link>
                    </DropdownMenu.Item>
                    {["ADMIN", "SCHOLAR"].includes(user?.role) && (
                      <DropdownMenu.Item asChild>
                        <Link href="/admin/lectures/new" className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors">
                          <FiBookOpen size={14} /> New Lecture
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    {user?.role === "ADMIN" && (
                      <DropdownMenu.Item asChild>
                        <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gold-500 hover:text-gold-400 hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors">
                          <FiSettings size={14} /> Admin Dashboard
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
                    <DropdownMenu.Item
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl cursor-pointer transition-colors"
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      <FiLogOut size={14} /> Sign Out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className={`
                    px-4 py-2 text-sm rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95
                    ${isLight
                      ? "bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-md shadow-gold-500/30 hover:shadow-gold-500/50"
                      : "bg-gold-600 hover:bg-gold-500 text-white"
                    }
                  `}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile toggle ── */}
          <button
            className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border)] space-y-1 animate-fadeInUp">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-all"
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-dim)] transition-all"
            >
              {isLight ? <GiMoon size={15} /> : <GiSun size={15} />}
              {isLight ? "Dark mode" : "Light mode"}
            </button>
            {session ? (
              <>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-dim)] transition-all">Profile</Link>
                {user?.role === "ADMIN" && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-xl text-sm text-gold-500 hover:bg-[var(--accent-dim)] transition-all">Admin</Link>
                )}
                <button onClick={() => signOut()} className="block w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all">
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 text-center px-4 py-2 text-sm border border-[var(--border)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--accent-dim)] transition-all">Sign In</Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="flex-1 text-center px-4 py-2 text-sm bg-gold-600 text-white rounded-xl hover:bg-gold-500 transition-all font-medium">Register</Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
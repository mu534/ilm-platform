"use client";
// src/components/Navbar.tsx
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import type { SessionUser } from "../types/auth.types";
import {
  FiMenu,
  FiX,
  FiChevronDown,
  FiUser,
  FiLogOut,
  FiSettings,
  FiBookOpen,
} from "react-icons/fi";
import { GiMoon } from "react-icons/gi";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/lectures", label: "Lectures" },
  { href: "/scholars", label: "Scholars" },
];

export function Navbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = session?.user as SessionUser;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 glass-card">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <GiMoon className="text-gold-400 text-2xl group-hover:rotate-12 transition-transform" />
            <span className="font-display text-xl font-semibold text-white">
              <span className="gradient-text">Ilm</span>{" "}
              <span className="text-ink-200">Platform</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-ink-300 hover:text-white transition-colors font-medium tracking-wide"
              >
                {l.label}
              </Link>
            ))}
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-sm text-gold-400 hover:text-gold-300 transition-colors font-medium"
              >
                Admin
              </Link>
            )}
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    <Avatar.Root className="w-7 h-7 rounded-full overflow-hidden">
                      <Avatar.Image
                        src={user?.image ?? ""}
                        alt={user?.name}
                        className="w-full h-full object-cover"
                      />
                      <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-gold-600 text-white text-xs font-bold">
                        {user?.name?.[0]?.toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <span className="text-sm text-white">
                      {user?.name?.split(" ")[0]}
                    </span>
                    <FiChevronDown className="text-ink-400 text-xs" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="glass-card gold-border rounded-xl p-1.5 min-w-[180px] shadow-2xl animate-fadeInUp"
                    sideOffset={8}
                    align="end"
                  >
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-ink-200 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                      >
                        <FiUser size={14} /> Profile
                      </Link>
                    </DropdownMenu.Item>
                    {["ADMIN", "SCHOLAR"].includes(user?.role) && (
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/admin/lectures/new"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-ink-200 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                        >
                          <FiBookOpen size={14} /> New Lecture
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    {user?.role === "ADMIN" && (
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gold-400 hover:text-gold-300 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                        >
                          <FiSettings size={14} /> Admin Dashboard
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Separator className="my-1 border-t border-white/5" />
                    <DropdownMenu.Item
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      <FiLogOut size={14} /> Sign Out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-1.5 text-sm text-ink-200 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 text-sm bg-gold-600 hover:bg-gold-500 text-white rounded-lg transition-colors font-medium"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-ink-300 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-white/5">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm text-ink-300 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
            {session ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-sm text-ink-300 hover:text-white"
                >
                  Profile
                </Link>
                {user?.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 text-sm text-gold-400"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="block py-2 text-sm text-red-400"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-3 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-1.5 text-sm border border-white/10 text-white rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-1.5 text-sm bg-gold-600 text-white rounded-lg"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

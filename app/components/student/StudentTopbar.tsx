"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import {
  FiMenu,
  FiUser,
  FiSettings,
  FiBookOpen,
  FiLogOut,
  FiChevronDown,
  FiActivity,
  FiSidebar,
  FiSearch,
} from "react-icons/fi";
import { GiMoon, GiSun } from "react-icons/gi";
import { useTheme } from "@/app/components/ThemeProvider";
import { NotificationBell } from "@/app/components/NotificationBell";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";
import { RoleBadge } from "@/app/components/ui/Badge";
import type { SessionUser } from "@/app/types/auth.types";

interface StudentTopbarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
}

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Welcome to your learning overview" },
  "/dashboard/my-courses": { title: "My Learning", subtitle: "Courses you are currently taking" },
  "/dashboard/certificates": { title: "Certificates", subtitle: "Your earned achievements & credentials" },
  "/dashboard/bookmarks": { title: "Saved Items", subtitle: "Lectures & courses you bookmarked" },
  "/dashboard/quiz-history": { title: "Learning Progress", subtitle: "Quiz results & completion milestones" },
  "/profile": { title: "Student Profile", subtitle: "Manage your personal information & bio" },
  "/settings": { title: "Settings", subtitle: "Customize your preferences & notifications" },
};

export function StudentTopbar({
  collapsed,
  onToggleCollapse,
  onOpenMobile,
}: StudentTopbarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { toggleTheme, isLight } = useTheme();
  const user = session?.user as SessionUser | undefined;

  const pageInfo = pageTitles[pathname] ?? {
    title: pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ?? "Student Portal",
    subtitle: "Ilm Platform Learning Environment",
  };

  return (
    <header className="h-16 sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* ── Left Side: Controls & Breadcrumb ── */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          aria-label="Open mobile navigation menu"
        >
          <FiMenu size={20} />
        </button>

        {/* Desktop Sidebar Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle sidebar width"
        >
          <FiSidebar size={18} />
        </button>

        {/* Vertical Divider */}
        <div className="hidden sm:block h-5 w-px bg-[var(--border)]" />

        {/* Page Title & Breadcrumbs */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium">
            <span>LMS</span>
            <span>/</span>
            <span className="capitalize text-[var(--accent)]">{pageInfo.title}</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-tight capitalize truncate max-w-[200px] sm:max-w-xs md:max-w-none">
            {pageInfo.title}
          </h1>
        </div>
      </div>

      {/* ── Right Side: Tools & Profile Menu ── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Course Search Shortcut */}
        <Link
          href="/courses"
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
        >
          <FiSearch size={14} className="text-[var(--accent)]" />
          <span>Search Courses…</span>
        </Link>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Theme Toggle Pill */}
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
          title={`Switch to ${isLight ? "dark" : "light"} mode`}
        >
          <span className="theme-toggle__knob">
            {isLight ? (
              <GiMoon className="text-[var(--text-muted)]" size={12} />
            ) : (
              <GiSun className="text-[var(--accent-light)]" size={12} />
            )}
          </span>
        </button>

        {/* Notifications Bell */}
        {session && <NotificationBell />}

        {/* Profile Dropdown */}
        {session && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[var(--accent-dim)] border border-transparent hover:border-[var(--border)] transition-all duration-200 ml-1 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                <Avatar.Root className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-[var(--border-strong)] flex-shrink-0">
                  <Avatar.Image src={user?.image ?? ""} className="w-full h-full object-cover" />
                  <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-[var(--accent)] text-white text-xs font-bold">
                    {user?.name?.[0]?.toUpperCase() ?? "U"}
                  </Avatar.Fallback>
                </Avatar.Root>
                <span className="hidden sm:inline-block text-xs text-[var(--text-primary)] font-semibold max-w-[100px] truncate">
                  {user?.name?.split(" ")[0]}
                </span>
                <FiChevronDown className="text-[var(--text-muted)]" size={14} />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="glass-card gold-border rounded-2xl p-1.5 min-w-[220px] shadow-[var(--shadow-lg)] animate-fadeInUp z-50"
                sideOffset={8}
                align="end"
              >
                {/* User info header */}
                <div className="px-3 py-2.5 border-b border-[var(--border)] mb-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.name}</p>
                    {user?.role && <RoleBadge role={user.role} />}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
                </div>

                <DropdownMenu.Item asChild>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors"
                  >
                    <FiActivity size={14} className="text-[var(--accent)]" /> Dashboard
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Item asChild>
                  <Link
                    href="/dashboard/my-courses"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors"
                  >
                    <FiBookOpen size={14} className="text-[var(--accent)]" /> My Learning
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Item asChild>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors"
                  >
                    <FiUser size={14} className="text-[var(--accent)]" /> Profile
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Item asChild>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-xl cursor-pointer transition-colors"
                  >
                    <FiSettings size={14} className="text-[var(--accent)]" /> Settings
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />

                <DropdownMenu.Item
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl cursor-pointer transition-colors"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <FiLogOut size={14} /> Sign Out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
    </header>
  );
}

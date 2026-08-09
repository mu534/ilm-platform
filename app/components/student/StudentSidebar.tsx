"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  FiGrid,
  FiBookOpen,
  FiCompass,
  FiActivity,
  FiAward,
  FiBookmark,
  FiUser,
  FiSettings,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiShield,
} from "react-icons/fi";
import { GiMoon } from "react-icons/gi";
import type { SessionUser } from "@/app/types/auth.types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: boolean;
}

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <FiGrid size={18} /> },
  { href: "/dashboard/my-courses", label: "My Learning", icon: <FiBookOpen size={18} /> },
  { href: "/courses", label: "Explore Courses", icon: <FiCompass size={18} /> },
  { href: "/dashboard/quiz-history", label: "Progress", icon: <FiActivity size={18} /> },
  { href: "/dashboard/certificates", label: "Certificates", icon: <FiAward size={18} /> },
  { href: "/dashboard/bookmarks", label: "Bookmarks", icon: <FiBookmark size={18} /> },
];

const accountNav: NavItem[] = [
  { href: "/profile", label: "Profile", icon: <FiUser size={18} /> },
  { href: "/settings", label: "Settings", icon: <FiSettings size={18} /> },
];

interface StudentSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  user?: SessionUser | null;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export function StudentSidebar({
  collapsed,
  onToggleCollapse,
  user,
  isMobile = false,
  onCloseMobile,
}: StudentSidebarProps) {
  const pathname = usePathname();

  const isLinkActive = (item: NavItem) => {
    if (item.href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const handleLinkClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const isStaff = ["ADMIN", "SCHOLAR"].includes(user?.role ?? "");

  return (
    <aside
      className={`h-full flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border)] transition-all duration-300 relative select-none ${
        collapsed && !isMobile ? "w-20" : "w-64"
      }`}
    >
      {/* ── Brand Logo ── */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border)] flex-shrink-0">
        <Link
          href="/"
          onClick={handleLinkClick}
          className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-xl p-1"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform flex-shrink-0">
            <GiMoon size={20} />
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold leading-none tracking-tight">
                <span className="gradient-text">Ilm</span>
                <span className="text-[var(--text-secondary)] ml-1">Platform</span>
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium tracking-wider uppercase mt-1">
                LMS Learning
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Collapse Toggle */}
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* ── Nav Links Container ── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
        {/* Primary Learning Section */}
        <div>
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[10px] uppercase tracking-widest font-semibold text-[var(--text-muted)] mb-2">
              Learning
            </p>
          )}
          <nav className="space-y-1">
            {primaryNav.map((item) => {
              const active = isLinkActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  title={collapsed && !isMobile ? item.label : undefined}
                  className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                    active
                      ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-strong)] font-semibold shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  } ${collapsed && !isMobile ? "justify-center px-0" : ""}`}
                >
                  <span
                    className={`flex-shrink-0 transition-colors ${
                      active ? "text-[var(--accent)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {(!collapsed || isMobile) && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {active && (!collapsed || isMobile) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Account Section */}
        <div>
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[10px] uppercase tracking-widest font-semibold text-[var(--text-muted)] mb-2">
              Account
            </p>
          )}
          <nav className="space-y-1">
            {accountNav.map((item) => {
              const active = isLinkActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  title={collapsed && !isMobile ? item.label : undefined}
                  className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                    active
                      ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-strong)] font-semibold shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  } ${collapsed && !isMobile ? "justify-center px-0" : ""}`}
                >
                  <span
                    className={`flex-shrink-0 transition-colors ${
                      active ? "text-[var(--accent)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {(!collapsed || isMobile) && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {active && (!collapsed || isMobile) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  )}
                </Link>
              );
            })}

            {/* Staff Link if Admin or Scholar */}
            {isStaff && (
              <Link
                href={user?.role === "ADMIN" ? "/admin" : "/dashboard/scholar"}
                onClick={handleLinkClick}
                title={collapsed && !isMobile ? (user?.role === "ADMIN" ? "Admin Panel" : "Scholar Dashboard") : undefined}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-all duration-200 ${
                  collapsed && !isMobile ? "justify-center px-0" : ""
                }`}
              >
                <span className="flex-shrink-0">
                  <FiShield size={18} />
                </span>
                {(!collapsed || isMobile) && (
                  <span className="truncate flex-1">
                    {user?.role === "ADMIN" ? "Admin Panel" : "Scholar Portal"}
                  </span>
                )}
              </Link>
            )}

            {/* Logout Button */}
            <button
              onClick={() => {
                handleLinkClick();
                signOut({ callbackUrl: "/" });
              }}
              title={collapsed && !isMobile ? "Sign Out" : undefined}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 ${
                collapsed && !isMobile ? "justify-center px-0" : ""
              }`}
            >
              <span className="flex-shrink-0">
                <FiLogOut size={18} />
              </span>
              {(!collapsed || isMobile) && (
                <span className="truncate flex-1 text-left">Sign Out</span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* ── Footer / User Mini Profile ── */}
      {user && (
        <div className="p-3 border-t border-[var(--border)] flex-shrink-0 bg-[var(--bg-card)]/50">
          <div className={`flex items-center gap-3 ${collapsed && !isMobile ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] font-bold text-xs flex-shrink-0 overflow-hidden">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name ?? "User"} className="w-full h-full object-cover" />
              ) : (
                user.name?.[0]?.toUpperCase() ?? "U"
              )}
            </div>
            {(!collapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {user.name}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  FiGrid,
  FiBookOpen,
  FiUsers,
  FiStar,
  FiLayout,
  FiBarChart2,
  FiFlag,
  FiFileText,
  FiList,
  FiShield,
  FiTag,
  FiSettings,
  FiLogOut,
  FiChevronRight,
  FiAward,
  FiPlus,
} from "react-icons/fi";
import { LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";
import { GiMoon } from "react-icons/gi";
import type { SessionUser } from "@/app/types/auth.types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: boolean;
}

const managementNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: <FiGrid size={18} /> },
  { href: "/admin/users", label: "Users", icon: <FiUsers size={18} /> },
  { href: "/admin/instructors", label: "Instructors", icon: <FiStar size={18} /> },
  { href: "/admin/scholar-applications", label: "Scholar Applications", icon: <FiFileText size={18} /> },
  { href: "/admin/courses", label: "Courses", icon: <FiLayout size={18} /> },
];

const learningNav: NavItem[] = [
  { href: "/admin/categories", label: "Categories", icon: <FiTag size={18} /> },
  { href: "/admin/enrollments", label: "Enrollments", icon: <FiList size={18} /> },
];

const moderationNav: NavItem[] = [
  { href: "/admin/reports", label: "Reports", icon: <FiFlag size={18} /> },
];

const certificateNav: NavItem[] = [
  { href: "/admin/certificates", label: "Certificates", icon: <FiAward size={18} /> },
  { href: "/admin/certificate-settings", label: "Cert Settings", icon: <FiSettings size={18} /> },
];

const systemNav: NavItem[] = [
  { href: "/admin/analytics", label: "Analytics", icon: <FiBarChart2 size={18} /> },
  { href: "/admin/audit-log", label: "Audit Log", icon: <FiShield size={18} /> },
  { href: "/admin/cms", label: "CMS", icon: <FiFileText size={18} /> },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  user?: SessionUser | null;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({
  collapsed,
  onToggleCollapse,
  user,
  isMobile = false,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  const isAdmin      = user?.role === "ADMIN";
  const isInstructor = user?.role === "INSTRUCTOR";

  const isLinkActive = (item: NavItem) => {
    if (item.href === "/admin") return pathname === "/admin";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const handleLinkClick = () => {
    if (isMobile && onCloseMobile) onCloseMobile();
  };

  // Instructor sees only their relevant nav items
  const instructorNav: NavItem[] = [
    { href: "/admin/courses",      label: "My Courses",    icon: <FiLayout size={18} /> },
    { href: "/admin/courses/new",  label: "New Course",    icon: <FiPlus   size={18} /> },
    { href: "/admin/my-analytics", label: "My Analytics",  icon: <FiBarChart2 size={18} /> },
  ];

  return (
    <aside
      className={`h-full flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border)] transition-all duration-300 relative select-none ${
        collapsed && !isMobile ? "w-20" : "w-64"
      }`}
    >
      {/* ── Brand Logo ── */}
      <div 
        className="h-16 flex items-center justify-between px-4 border-b border-[var(--border)] flex-shrink-0"
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
        <Link
          href="/admin"
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
                <span className="text-[var(--text-secondary)] ml-1">Admin</span>
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium tracking-wider uppercase mt-1">
                Management Portal
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Collapse Toggle */}
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`
              flex-shrink-0 p-1.5 rounded-lg
              text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)]
              motion-safe:transition-opacity motion-safe:duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
              focus-visible:opacity-100
              ${collapsed || isHeaderHovered
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
              }
            `}
          >
            {collapsed ? <LuPanelLeftOpen size={18} /> : <LuPanelLeftClose size={18} />}
          </button>
        )}
      </div>

      {/* ── Nav Links Container ── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">

        {/* ── INSTRUCTOR view — simplified ── */}
        {isInstructor && !isAdmin && (
          <div>
            {(!collapsed || isMobile) && (
              <p className="px-3 text-[11px] uppercase tracking-widest font-bold text-[var(--text-secondary)] mb-2">
                Instructor
              </p>
            )}
            <nav className="space-y-1">
              {instructorNav.map((item) => {
                const active = isLinkActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    title={collapsed && !isMobile ? item.label : undefined}
                    className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                      active
                        ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-strong)] font-semibold"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                    } ${collapsed && !isMobile ? "justify-center px-0" : ""}`}
                  >
                    <span className={`flex-shrink-0 ${active ? "text-[var(--accent)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"}`}>
                      {item.icon}
                    </span>
                    {(!collapsed || isMobile) && <span className="truncate flex-1">{item.label}</span>}
                    {active && (!collapsed || isMobile) && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* ── ADMIN view — full panel ── */}
        {isAdmin && (
          <>
        {/* Management Section */}
        <div>
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[10px] uppercase tracking-widest font-semibold text-[var(--text-muted)] mb-2">
              Management
            </p>
          )}
          <nav className="space-y-1">
            {managementNav.map((item) => {
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

        {/* Learning Section */}
        <div>
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[10px] uppercase tracking-widest font-semibold text-[var(--text-muted)] mb-2">
              Learning
            </p>
          )}
          <nav className="space-y-1">
            {learningNav.map((item) => {
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

        {/* Moderation Section */}
        <div>
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[10px] uppercase tracking-widest font-semibold text-[var(--text-muted)] mb-2">
              Moderation
            </p>
          )}
          <nav className="space-y-1">
            {moderationNav.map((item) => {
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
                  <span className={`flex-shrink-0 transition-colors ${active ? "text-[var(--accent)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"}`}>
                    {item.icon}
                  </span>
                  {(!collapsed || isMobile) && <span className="truncate flex-1">{item.label}</span>}
                  {active && (!collapsed || isMobile) && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Certificates Section */}
        <div>
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[10px] uppercase tracking-widest font-semibold text-[var(--text-muted)] mb-2">
              Certificates
            </p>
          )}
          <nav className="space-y-1">
            {certificateNav.map((item) => {
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
                  <span className={`flex-shrink-0 transition-colors ${active ? "text-[var(--accent)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"}`}>
                    {item.icon}
                  </span>
                  {(!collapsed || isMobile) && <span className="truncate flex-1">{item.label}</span>}
                  {active && (!collapsed || isMobile) && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System Section */}
        <div>
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[10px] uppercase tracking-widest font-semibold text-[var(--text-muted)] mb-2">
              System
            </p>
          )}
          <nav className="space-y-1">
            {systemNav.map((item) => {
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

            {/* Back to Site Link */}
            <Link
              href="/"
              onClick={handleLinkClick}
              title={collapsed && !isMobile ? "Back to Site" : undefined}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-all duration-200 ${
                collapsed && !isMobile ? "justify-center px-0" : ""
              }`}
            >
              <span className="flex-shrink-0">
                <FiChevronRight size={18} />
              </span>
              {(!collapsed || isMobile) && (
                <span className="truncate flex-1">Back to Site</span>
              )}
            </Link>

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
              <span className="flex-shrink-0"><FiLogOut size={18} /></span>
              {(!collapsed || isMobile) && <span className="truncate flex-1 text-left">Sign Out</span>}
            </button>
          </nav>
        </div>
          </>
        )}

        {/* ── Shared: Back to Site + Sign Out (instructor only) ── */}
        {isInstructor && !isAdmin && (
          <div>
            <nav className="space-y-1">
              <Link
                href="/dashboard/instructor"
                onClick={handleLinkClick}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-all ${collapsed && !isMobile ? "justify-center px-0" : ""}`}
              >
                <span className="flex-shrink-0"><FiChevronRight size={18} /></span>
                {(!collapsed || isMobile) && <span className="truncate flex-1">Instructor Dashboard</span>}
              </Link>
              <Link
                href="/"
                onClick={handleLinkClick}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all ${collapsed && !isMobile ? "justify-center px-0" : ""}`}
              >
                <span className="flex-shrink-0"><FiChevronRight size={18} /></span>
                {(!collapsed || isMobile) && <span className="truncate flex-1">Back to Site</span>}
              </Link>
              <button
                onClick={() => { handleLinkClick(); signOut({ callbackUrl: "/" }); }}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all ${collapsed && !isMobile ? "justify-center px-0" : ""}`}
              >
                <span className="flex-shrink-0"><FiLogOut size={18} /></span>
                {(!collapsed || isMobile) && <span className="truncate flex-1 text-left">Sign Out</span>}
              </button>
            </nav>
          </div>
        )}
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
                user.name?.[0]?.toUpperCase() ?? "A"
              )}
            </div>
            {(!collapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {user.name}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">
                  {isAdmin ? "Administrator" : "Instructor"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

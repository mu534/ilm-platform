
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../lib/auth";
import Link from "next/link";
import { FiGrid, FiBookOpen, FiUsers, FiStar, FiLayout, FiBarChart2, FiFlag, FiFileText, FiList, FiShield, FiTag } from "react-icons/fi";
import { GiMoon } from "react-icons/gi";
import type { SessionUser } from "@/app/types/auth.types";

const adminNav = [
  { href: "/admin",              icon: <FiGrid />,      label: "Overview",    adminOnly: true  },
  { href: "/admin/analytics",    icon: <FiBarChart2 />, label: "Analytics",   adminOnly: true  },
  { href: "/admin/courses",      icon: <FiLayout />,    label: "Courses",     adminOnly: false },
  { href: "/admin/categories",   icon: <FiTag />,       label: "Categories",  adminOnly: true  },
  { href: "/admin/enrollments",  icon: <FiList />,      label: "Enrollments", adminOnly: true  },
  { href: "/admin/users",        icon: <FiUsers />,     label: "Users",       adminOnly: true  },
  { href: "/admin/instructors", icon: <FiStar />, label: "Instructors", adminOnly: true },
  { href: "/admin/scholar-applications", icon: <FiFileText />, label: "Scholar Applications", adminOnly: true },
  { href: "/admin/reports",      icon: <FiFlag />,      label: "Reports",     adminOnly: true  },
  { href: "/admin/cms",          icon: <FiFileText />,  label: "CMS",         adminOnly: true  },
  { href: "/admin/audit-log",    icon: <FiShield />,    label: "Audit Log",   adminOnly: true  },
  { href: "/admin/my-analytics", icon: <FiBarChart2 />, label: "My Analytics", adminOnly: false, instructorOnly: true },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | null;

  if (!session) {
    redirect("/login?callbackUrl=/admin");
  }

  // Only ADMIN can access /admin
  if (user?.role !== "ADMIN") {
    // Redirect INSTRUCTOR to their dashboard
    if (user?.role === "INSTRUCTOR") {
      redirect("/dashboard/instructor");
    }
    // Redirect others to login
    redirect("/login?callbackUrl=/admin");
  }

  const isAdmin = true;

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex flex-col flex-shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border)]">

        {/* Logo */}
        <div className="p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--accent-dim)] border border-[var(--border-strong)]">
              <GiMoon className="text-[var(--accent)]" size={14} />
            </div>
            <span className="font-display text-sm font-semibold text-[var(--text-primary)]">
              Admin Panel
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="p-3 flex-1 flex flex-col gap-0.5">
          {adminNav
            .filter((item) => {
              // Hide instructor-only items since this is admin-only layout
              if ((item as { instructorOnly?: boolean }).instructorOnly) return false;
              return true;
            })
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all duration-200"
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] space-y-2">
          <Link
            href="/"
            className="block text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            ← Back to site
          </Link>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto bg-[var(--bg-primary)]">
        {children}
      </main>

    </div>
  );
}

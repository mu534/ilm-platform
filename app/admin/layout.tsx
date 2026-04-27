// src/app/admin/layout.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../lib/auth";
import Link from "next/link";
import { FiGrid, FiBookOpen, FiUsers, FiStar } from "react-icons/fi";
import { GiMoon } from "react-icons/gi";

const adminNav = [
  { href: "/admin", icon: <FiGrid />, label: "Overview" },
  { href: "/admin/lectures", icon: <FiBookOpen />, label: "Lectures" },
  { href: "/admin/users", icon: <FiUsers />, label: "Users" },
  { href: "/admin/scholars", icon: <FiStar />, label: "Scholars" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!session || !["ADMIN", "SCHOLAR"].includes(user?.role)) {
    redirect("/login?callbackUrl=/admin");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 border-r border-theme bg-secondary flex flex-col">
        <div className="p-6 border-b border-theme">
          <div className="flex items-center gap-2">
            <GiMoon className="text-accent" />
            <span className="font-display text-sm font-semibold text-primary">
              {user?.role === "ADMIN" ? "Admin Panel" : "Scholar Panel"}
            </span>
          </div>
        </div>
        <nav className="p-3 flex-1">
          {adminNav
            .filter(
              (item) =>
                user?.role === "ADMIN" ||
                item.href === "/admin/lectures" ||
                item.href === "/admin",
            )
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-primary hover:bg-card-hover transition-colors mb-1"
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
        </nav>
        <div className="p-4 border-t border-theme">
          <Link
            href="/"
            className="text-xs text-muted hover:text-secondary transition-colors"
          >
            ← Back to site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "../lib/auth";
import { prisma } from "../lib/prism";
import { formatDate } from "../utils/api";
import {
  FiBookOpen,
  FiUsers,
  FiMessageCircle,
  FiStar,
  FiPlus,
  FiEye,
  FiTrendingUp,
} from "react-icons/fi";
import type { SessionUser } from "@/app/types/auth.types";
import { RoleBadge } from "../components/ui/Badge";
import type { Role } from "../../generated/prisma/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

type RecentLecture = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  views: number;
  createdAt: Date;
  author: { name: string };
};

type RecentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
};

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function getDashboardStats() {
  const [
    lectureCount,
    userCount,
    commentCount,
    scholarCount,
    recentLectures,
    recentUsers,
  ] = await Promise.all([
    prisma.lecture.count(),
    prisma.user.count(),
    prisma.comment.count(),
    prisma.scholar.count(),
    prisma.lecture.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        published: true,
        views: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    lectureCount,
    userCount,
    commentCount,
    scholarCount,
    recentLectures,
    recentUsers,
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  href,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
  trend?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
    >
      {/* subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)]">
          {icon}
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <FiTrendingUp size={11} />
            {trend}
          </span>
        )}
      </div>

      <div>
        <div className="font-display text-3xl font-bold text-[var(--text-primary)] tabular-nums leading-none mb-1">
          {value.toLocaleString()}
        </div>
        <div className="text-xs text-[var(--text-muted)]">{label}</div>
      </div>
    </Link>
  );
}

// centralized `RoleBadge` component imported from UI

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | null;

  if (user?.role !== "ADMIN") redirect("/admin/lectures");

  const stats = await getDashboardStats();

  const statCards = [
    {
      icon: <FiBookOpen size={16} />,
      label: "Total Lectures",
      value: stats.lectureCount,
      href: "/admin/lectures",
    },
    {
      icon: <FiUsers size={16} />,
      label: "Registered Users",
      value: stats.userCount,
      href: "/admin/users",
    },
    {
      icon: <FiMessageCircle size={16} />,
      label: "Total Comments",
      value: stats.commentCount,
      href: "#",
    },
    {
      icon: <FiStar size={16} />,
      label: "Scholars",
      value: stats.scholarCount,
      href: "/admin/scholars",
    },
  ];

  return (
    <div className="min-h-screen p-6 sm:p-8 bg-[var(--bg-primary)]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">
            Admin Panel
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Dashboard
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Platform overview and recent activity
          </p>
        </div>
        <Link
          href="/admin/lectures/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-gold-600/20 hover:shadow-gold-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <FiPlus size={15} />
          New Lecture
        </Link>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── Tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Lectures */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)] text-sm">
              Recent Lectures
            </h2>
            <Link
              href="/admin/lectures"
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
            >
              View all →
            </Link>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {stats.recentLectures.map((lecture: RecentLecture) => (
              <div
                key={lecture.id}
                className="px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {lecture.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {lecture.author.name} · {formatDate(lecture.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
                      lecture.published
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]"
                    }`}
                  >
                    {lecture.published ? "Published" : "Draft"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <FiEye size={11} />
                    {lecture.views.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)] text-sm">
              Recent Users
            </h2>
            <Link
              href="/admin/users"
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
            >
              View all →
            </Link>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {stats.recentUsers.map((u: RecentUser) => (
              <div
                key={u.id}
                className="px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] text-sm font-bold flex-shrink-0">
                  {u.name?.[0]?.toUpperCase() ?? "?"}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {u.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {u.email}
                  </p>
                </div>

                <RoleBadge role={u.role} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
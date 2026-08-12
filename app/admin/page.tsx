import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "../lib/auth";
import { prisma } from "../lib/prism";
import { formatDate } from "../utils/api";
import {
  FiBookOpen,
  FiUsers,
  FiStar,
  FiPlus,
  FiTrendingUp,
  FiClock,
  FiFileText,
  FiFlag,
  FiEye,
  FiActivity,
  FiArrowRight,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import type { SessionUser } from "@/app/types/auth.types";
import { RoleBadge } from "../components/ui/Badge";
import type { Role } from "../../generated/prisma/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

type RecentScholarApplication = {
  id: string;
  status: string;
  submittedAt: Date;
  user: {
    name: string;
    email: string;
  };
};

type PendingCourse = {
  id: string;
  title: string;
  slug: string;
  author: {
    name: string;
  };
  createdAt: Date;
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
  const now = new Date();
  const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    // Totals
    userCount,
    scholarCount,
    courseCount,
    lectureCount,
    enrollmentCount,
    certificateCount,

    // Growth
    newUsersThisMonth,
    newUsersThisWeek,
    newCoursesThisMonth,
    newEnrollmentsThisMonth,

    // Moderation
    pendingScholarApplications,
    pendingCourseReviews,
    pendingReports,

    // Recent data
    recentScholarApplications,
    pendingCourses,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.scholar.count(),
    prisma.course.count(),
    prisma.lecture.count(),
    prisma.enrollment.count(),
    prisma.certificate.count(),

    prisma.user.count({ where: { createdAt: { gte: day30Ago } } }),
    prisma.user.count({ where: { createdAt: { gte: day7Ago } } }),
    prisma.course.count({ where: { createdAt: { gte: day30Ago } } }),
    prisma.enrollment.count({ where: { enrolledAt: { gte: day30Ago } } }),

    prisma.scholarApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.course.count({ where: { approvalStatus: "PENDING" } }),
    prisma.report.count({ where: { status: "PENDING" } }),

    prisma.scholarApplication.findMany({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      take: 5,
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.course.findMany({
      where: { approvalStatus: "PENDING" },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        author: { select: { name: true } },
        createdAt: true,
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
    userCount,
    scholarCount,
    courseCount,
    lectureCount,
    enrollmentCount,
    certificateCount,
    newUsersThisMonth,
    newUsersThisWeek,
    newCoursesThisMonth,
    newEnrollmentsThisMonth,
    pendingScholarApplications,
    pendingCourseReviews,
    pendingReports,
    recentScholarApplications,
    pendingCourses,
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
  trendValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
  trend?: string;
  trendValue?: number;
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
        {trend && trendValue && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <FiTrendingUp size={11} />
            {trendValue > 0 ? `+${trendValue}` : trendValue}
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

function AttentionCard({
  icon,
  label,
  count,
  href,
  color = "gold",
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  href: string;
  color?: "gold" | "red" | "blue";
}) {
  const colorClasses = {
    gold: "text-[var(--accent)] bg-[var(--accent-dim)] border-[var(--border-strong)]",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };

  return (
    <Link
      href={href}
      className={`flex items-center gap-4 p-4 rounded-xl border ${colorClasses[color]} hover:scale-[1.02] transition-all duration-200`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{count} pending</p>
      </div>
      <div className="flex-shrink-0">
        <span className="text-2xl font-bold tabular-nums">{count}</span>
      </div>
    </Link>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | null;

  if (user?.role !== "ADMIN") redirect("/admin/courses");

  const stats = await getDashboardStats();

  const statCards = [
    {
      icon: <FiUsers size={16} />,
      label: "Total Users",
      value: stats.userCount,
      href: "/admin/users",
      trend: "New this month",
      trendValue: stats.newUsersThisMonth,
    },
    {
      icon: <FiStar size={16} />,
      label: "Scholars",
      value: stats.scholarCount,
      href: "/admin/instructors",
    },
    {
      icon: <FiBookOpen size={16} />,
      label: "Courses",
      value: stats.courseCount,
      href: "/admin/courses",
      trend: "New this month",
      trendValue: stats.newCoursesThisMonth,
    },
    {
      icon: <FiEye size={16} />,
      label: "Enrollments",
      value: stats.enrollmentCount,
      href: "/admin/enrollments",
      trend: "New this month",
      trendValue: stats.newEnrollmentsThisMonth,
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-card)] to-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-dim)] rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-strong)] bg-[var(--accent-dim)] text-xs text-[var(--accent)] font-semibold mb-2">
            <FiActivity size={12} />
            <span>Admin Portal</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)]">
            Welcome back, {user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl leading-relaxed">
            Platform overview and administration. Monitor activity, manage content, and ensure quality.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/courses/new"
            className="btn-primary px-5 py-2.5 text-xs sm:text-sm rounded-xl font-semibold inline-flex items-center gap-2 shadow-sm"
          >
            <FiPlus size={16} /> New Course
          </Link>
          <Link
            href="/admin/users"
            className="btn-secondary px-5 py-2.5 text-xs sm:text-sm rounded-xl font-medium inline-flex items-center gap-2"
          >
            <FiUsers size={16} /> Manage Users
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── Needs Attention Section ── */}
      {(stats.pendingScholarApplications > 0 || stats.pendingCourseReviews > 0 || stats.pendingReports > 0) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FiAlertCircle className="text-[var(--accent)]" size={20} />
              Needs Your Attention
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.pendingScholarApplications > 0 && (
              <AttentionCard
                icon={<FiFileText size={24} />}
                label="Scholar Applications"
                count={stats.pendingScholarApplications}
                href="/admin/scholar-applications"
                color="gold"
              />
            )}
            {stats.pendingCourseReviews > 0 && (
              <AttentionCard
                icon={<FiBookOpen size={24} />}
                label="Courses Awaiting Review"
                count={stats.pendingCourseReviews}
                href="/admin/courses"
                color="blue"
              />
            )}
            {stats.pendingReports > 0 && (
              <AttentionCard
                icon={<FiFlag size={24} />}
                label="Reported Content"
                count={stats.pendingReports}
                href="/admin/reports"
                color="red"
              />
            )}
          </div>
        </section>
      )}

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scholar Applications Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FiFileText className="text-[var(--accent)]" size={18} />
              Recent Scholar Applications
            </h2>
            <Link
              href="/admin/scholar-applications"
              className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-light)] flex items-center gap-1 transition-colors"
            >
              View All ({stats.pendingScholarApplications}) <FiArrowRight size={12} />
            </Link>
          </div>

          {stats.recentScholarApplications.length > 0 ? (
            <div className="glass-card rounded-2xl p-2 divide-y divide-[var(--border)] border border-[var(--border)]">
              {stats.recentScholarApplications.map((app: RecentScholarApplication) => (
                <Link
                  key={app.id}
                  href={`/admin/scholar-applications`}
                  className="flex items-center gap-4 p-3 hover:bg-[var(--accent-dim)] rounded-xl transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] flex-shrink-0">
                    <FiFileText size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                      {app.user.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                      {app.user.email}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                        app.status === "SUBMITTED"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {app.status.replace("_", " ")}
                    </span>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      {formatDate(app.submittedAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-8 text-center space-y-4 border border-[var(--border)]">
              <FiCheckCircle className="text-emerald-400 text-4xl mx-auto opacity-40" />
              <div>
                <p className="text-[var(--text-primary)] font-semibold text-base">
                  No pending applications
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  All scholar applications have been reviewed.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Courses Awaiting Review */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FiBookOpen className="text-[var(--accent)]" size={18} />
              Courses Awaiting Review
            </h2>
            <Link
              href="/admin/courses"
              className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-light)] flex items-center gap-1 transition-colors"
            >
              View All ({stats.pendingCourseReviews}) <FiArrowRight size={12} />
            </Link>
          </div>

          {stats.pendingCourses.length > 0 ? (
            <div className="glass-card rounded-2xl p-2 divide-y divide-[var(--border)] border border-[var(--border)]">
              {stats.pendingCourses.map((course: PendingCourse) => (
                <Link
                  key={course.id}
                  href={`/admin/courses/${course.id}/review`}
                  className="flex items-center gap-4 p-3 hover:bg-[var(--accent-dim)] rounded-xl transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] flex-shrink-0">
                    <FiBookOpen size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                      {course.title}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                      {course.author.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold bg-blue-500/10 text-blue-400 border-blue-500/20">
                      PENDING
                    </span>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      {formatDate(course.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-8 text-center space-y-4 border border-[var(--border)]">
              <FiCheckCircle className="text-emerald-400 text-4xl mx-auto opacity-40" />
              <div>
                <p className="text-[var(--text-primary)] font-semibold text-base">
                  No pending reviews
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  All courses have been reviewed.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Recent Users Section ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FiUsers className="text-[var(--accent)]" size={18} />
            Recent Users
          </h2>
          <Link
            href="/admin/users"
            className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-light)] flex items-center gap-1 transition-colors"
          >
            View All <FiArrowRight size={12} />
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-2 divide-y divide-[var(--border)] border border-[var(--border)]">
          {stats.recentUsers.map((u: RecentUser) => (
            <Link
              key={u.id}
              href="/admin/users"
              className="flex items-center gap-4 p-3 hover:bg-[var(--accent-dim)] rounded-xl transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] font-bold text-sm flex-shrink-0">
                {u.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                  {u.name}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                  {u.email}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <RoleBadge role={u.role} />
                <span className="text-[10px] text-[var(--text-muted)]">
                  {formatDate(u.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Quick Stats Summary ── */}
      <section className="glass-card rounded-2xl p-6 border border-[var(--border)] space-y-4">
        <h2 className="font-display text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FiClock className="text-[var(--accent)]" size={16} />
          Platform Growth This Month
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <p className="font-display text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {stats.newUsersThisMonth}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">New Users</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <p className="font-display text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {stats.newUsersThisWeek}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">This Week</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <p className="font-display text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {stats.newCoursesThisMonth}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">New Courses</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <p className="font-display text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {stats.newEnrollmentsThisMonth}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">New Enrollments</p>
          </div>
        </div>
      </section>
    </div>
  );
}
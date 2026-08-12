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
  submittedAt: Date | null;
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
    enrollmentCount,

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
    prisma.enrollment.count(),

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
    enrollmentCount,
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
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
  subtext?: string;
}) {
  return (
    <Link
      href={href}
      className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-3 border border-[var(--border)] hover:border-[var(--border-strong)] hover:shadow-md transition-all group"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)]">{label}</span>
        <div className="p-2 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-subtle)] text-[var(--accent)]">
          {icon}
        </div>
      </div>
      <div>
        <p className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tabular-nums">
          {value.toLocaleString()}
        </p>
        {subtext && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{subtext}</p>}
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
      subtext: `+${stats.newUsersThisMonth} this month`,
    },
    {
      icon: <FiStar size={16} />,
      label: "Scholars & Instructors",
      value: stats.scholarCount,
      href: "/admin/instructors",
      subtext: "Verified educators",
    },
    {
      icon: <FiBookOpen size={16} />,
      label: "Courses",
      value: stats.courseCount,
      href: "/admin/courses",
      subtext: `+${stats.newCoursesThisMonth} this month`,
    },
    {
      icon: <FiEye size={16} />,
      label: "Enrollments",
      value: stats.enrollmentCount,
      href: "/admin/enrollments",
      subtext: `+${stats.newEnrollmentsThisMonth} this month`,
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
            Oversee the platform&apos;s growth and quality. Review applications, moderate content, and support our community of learners and scholars.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {stats.pendingScholarApplications > 0 && (
            <Link
              href="/admin/scholar-applications"
              className="btn-primary px-5 py-2.5 text-xs sm:text-sm rounded-xl font-semibold inline-flex items-center gap-2 shadow-sm"
            >
              <FiFileText size={16} /> Review Applications ({stats.pendingScholarApplications})
            </Link>
          )}
          {stats.pendingCourseReviews > 0 && (
            <Link
              href="/admin/courses"
              className="btn-primary px-5 py-2.5 text-xs sm:text-sm rounded-xl font-semibold inline-flex items-center gap-2 shadow-sm"
            >
              <FiBookOpen size={16} /> Review Courses ({stats.pendingCourseReviews})
            </Link>
          )}
          <Link
            href="/admin/courses/new"
            className="btn-secondary px-5 py-2.5 text-xs sm:text-sm rounded-xl font-medium inline-flex items-center gap-2"
          >
            <FiPlus size={16} /> New Course
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            href={card.href}
            subtext={card.subtext}
          />
        ))}
      </div>

      {/* ── Needs Attention Section ── */}
      {(stats.pendingScholarApplications > 0 || stats.pendingCourseReviews > 0 || stats.pendingReports > 0) && (
        <section className="glass-card rounded-2xl p-5 border border-[var(--border)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FiAlertCircle className="text-[var(--accent)]" size={18} />
              Needs Your Attention
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              {stats.pendingScholarApplications + stats.pendingCourseReviews + stats.pendingReports} pending items
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stats.pendingScholarApplications > 0 && (
              <Link
                href="/admin/scholar-applications"
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-strong)] hover:bg-[var(--accent)] hover:text-white transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/20 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] group-hover:text-white flex-shrink-0">
                  <FiFileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-white transition-colors">
                    Scholar Applications
                  </p>
                  <p className="text-xs text-[var(--text-muted)] group-hover:text-white/80 transition-colors">
                    {stats.pendingScholarApplications} pending review
                  </p>
                </div>
                <FiArrowRight size={16} className="text-[var(--accent)] group-hover:text-white flex-shrink-0" />
              </Link>
            )}
            {stats.pendingCourseReviews > 0 && (
              <Link
                href="/admin/courses"
                className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:text-white flex-shrink-0">
                  <FiBookOpen size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-white transition-colors">
                    Courses Awaiting Review
                  </p>
                  <p className="text-xs text-[var(--text-muted)] group-hover:text-white/80 transition-colors">
                    {stats.pendingCourseReviews} pending approval
                  </p>
                </div>
                <FiArrowRight size={16} className="text-blue-400 group-hover:text-white flex-shrink-0" />
              </Link>
            )}
            {stats.pendingReports > 0 && (
              <Link
                href="/admin/reports"
                className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:text-white flex-shrink-0">
                  <FiFlag size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-white transition-colors">
                    Reported Content
                  </p>
                  <p className="text-xs text-[var(--text-muted)] group-hover:text-white/80 transition-colors">
                    {stats.pendingReports} pending review
                  </p>
                </div>
                <FiArrowRight size={16} className="text-red-400 group-hover:text-white flex-shrink-0" />
              </Link>
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
                      {app.submittedAt ? formatDate(app.submittedAt) : "No date"}
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
                      by {course.author.name}
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

      {/* ── Platform Activity Summary ── */}
      <section className="glass-card rounded-2xl p-5 border border-[var(--border)] space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FiActivity className="text-[var(--accent)]" size={16} />
          Platform Activity This Month
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
              <FiUsers size={14} />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-[var(--text-primary)] tabular-nums">
                {stats.newUsersThisMonth}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">New Users</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
              <FiBookOpen size={14} />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-[var(--text-primary)] tabular-nums">
                {stats.newCoursesThisMonth}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">New Courses</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
              <FiEye size={14} />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-[var(--text-primary)] tabular-nums">
                {stats.newEnrollmentsThisMonth}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">New Enrollments</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
              <FiActivity size={14} />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-[var(--text-primary)] tabular-nums">
                {stats.newUsersThisWeek}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">This Week</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
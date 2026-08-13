import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import Link from "next/link";
import {
  FiUsers, FiBookOpen, FiAward, FiStar,
  FiTrendingUp, FiMessageCircle, FiAlertCircle, FiCheckCircle,
} from "react-icons/fi";
import type { SessionUser } from "../../types/auth.types";

export const metadata = { title: "Analytics" };

async function getAnalytics() {
  const now      = new Date();
  const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const day7Ago  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalUsers, totalScholars, totalCourses, totalLectures,
    totalEnrollments, totalComments, totalCertificates, verifiedScholars,
    newUsersMonth, newUsersWeek, newCoursesMonth, newEnrollmentsMonth,
    activeToday, pendingReports, pendingReviews,
    completedEnrollments, popularCourses, popularLectures, topScholars,
    categories,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.scholar.count(),
    prisma.course.count({ where: { published: true } }),
    prisma.lecture.count({ where: { published: true } }),
    prisma.enrollment.count(),
    prisma.comment.count(),
    prisma.certificate.count(),
    prisma.scholar.count({ where: { verified: true } }),
    prisma.user.count({ where: { createdAt: { gte: day30Ago } } }),
    prisma.user.count({ where: { createdAt: { gte: day7Ago } } }),
    prisma.course.count({ where: { createdAt: { gte: day30Ago } } }),
    prisma.enrollment.count({ where: { enrolledAt: { gte: day30Ago } } }),
    prisma.lectureProgress.count({ where: { lastViewedAt: { gte: today } } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.course.count({ where: { approvalStatus: "PENDING" } }),
    prisma.enrollment.count({ where: { status: "COMPLETED" } }),
    prisma.course.findMany({
      where: { published: true },
      take: 5,
      orderBy: { enrollments: { _count: "desc" } },
      select: { id: true, title: true, slug: true, _count: { select: { enrollments: true } } },
    }),
    prisma.lecture.findMany({
      where: { published: true },
      take: 5,
      orderBy: { views: "desc" },
      select: { id: true, title: true, slug: true, views: true },
    }),
    prisma.scholar.findMany({
      take: 5,
      orderBy: { followers: { _count: "desc" } },
      select: {
        id: true, verified: true,
        user:   { select: { name: true } },
        _count: { select: { lectures: true, followers: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { courses: true, lectures: true } } },
    }),
  ]);

  const completionRate = totalEnrollments > 0
    ? Math.round((completedEnrollments / totalEnrollments) * 100)
    : 0;

  return {
    totalUsers, totalScholars, totalCourses, totalLectures,
    totalEnrollments, totalComments, totalCertificates, verifiedScholars,
    newUsersMonth, newUsersWeek, newCoursesMonth, newEnrollmentsMonth,
    activeToday, pendingReports, pendingReviews,
    completionRate, completedEnrollments,
    popularCourses, popularLectures, topScholars, categories,
  };
}

function StatCard({
  icon, label, value, sub, color = "text-[var(--accent)]",
}: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color?: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-2">
      <div className={`text-xl ${color}`}>{icon}</div>
      <div className="font-display text-2xl font-bold text-[var(--text-primary)] tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      {sub && <div className="text-xs text-emerald-400">{sub}</div>}
    </div>
  );
}

function BarChart({
  data, maxValue,
}: {
  data: { label: string; value: number; href?: string }[];
  maxValue: number;
}) {
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-36 text-xs text-[var(--text-secondary)] truncate flex-shrink-0">
            {item.href ? (
              <Link href={item.href} className="hover:text-[var(--accent)] transition-colors">
                {item.label}
              </Link>
            ) : item.label}
          </div>
          <div className="flex-1 h-5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all duration-700"
              style={{ width: maxValue > 0 ? `${(item.value / maxValue) * 100}%` : "0%" }}
            />
          </div>
          <div className="w-10 text-xs text-[var(--text-muted)] text-right tabular-nums flex-shrink-0">
            {item.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const { defaultLocale } = await import("@/i18n/config");
  if (user?.role !== "ADMIN") redirect(`/${defaultLocale}/admin`);

  const stats = await getAnalytics();

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">Insights</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Analytics</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Platform performance overview</p>
      </div>

      {/* Alerts */}
      {(stats.pendingReports > 0 || stats.pendingReviews > 0) && (
        <div className="flex flex-wrap gap-3 mb-8">
          {stats.pendingReports > 0 && (
            <Link
              href="/admin/reports"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
            >
              <FiAlertCircle size={14} />
              {stats.pendingReports} pending report{stats.pendingReports !== 1 ? "s" : ""}
            </Link>
          )}
          {stats.pendingReviews > 0 && (
            <Link
              href="/admin/courses"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm hover:bg-blue-500/20 transition-colors"
            >
              <FiCheckCircle size={14} />
              {stats.pendingReviews} course{stats.pendingReviews !== 1 ? "s" : ""} awaiting review
            </Link>
          )}
        </div>
      )}

      {/* Primary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<FiUsers />}    label="Total Users"   value={stats.totalUsers}        sub={`+${stats.newUsersMonth} this month`} />
        <StatCard icon={<FiStar />}     label="Scholars"      value={stats.totalScholars}     sub={`${stats.verifiedScholars} verified`} color="text-purple-400" />
        <StatCard icon={<FiBookOpen />} label="Courses"       value={stats.totalCourses}      sub={`+${stats.newCoursesMonth} this month`} color="text-blue-400" />
        <StatCard icon={<FiBookOpen />} label="Lectures"      value={stats.totalLectures}     color="text-emerald-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard icon={<FiUsers />}        label="Enrollments"   value={stats.totalEnrollments}  sub={`+${stats.newEnrollmentsMonth} this month`} />
        <StatCard icon={<FiCheckCircle />}  label="Completion Rate" value={`${stats.completionRate}%`} color="text-emerald-400" />
        <StatCard icon={<FiAward />}        label="Certificates"  value={stats.totalCertificates} color="text-gold-400" />
        <StatCard icon={<FiMessageCircle />}label="Comments"      value={stats.totalComments}     />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Popular Courses */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm mb-4">Most Enrolled Courses</h2>
          {stats.popularCourses.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No data yet</p>
          ) : (
            <BarChart
              data={stats.popularCourses.map((c) => ({
                label: c.title,
                value: c._count.enrollments,
                href:  `/courses/${c.slug}`,
              }))}
              maxValue={stats.popularCourses[0]?._count.enrollments ?? 1}
            />
          )}
        </div>

        {/* Popular Lectures */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm mb-4">Most Viewed Lectures</h2>
          {stats.popularLectures.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No data yet</p>
          ) : (
            <BarChart
              data={stats.popularLectures.map((l) => ({
                label: l.title,
                value: l.views,
                href:  `/lectures/${l.slug}`,
              }))}
              maxValue={stats.popularLectures[0]?.views ?? 1}
            />
          )}
        </div>

        {/* Top Scholars */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm mb-4">Most Followed Scholars</h2>
          {stats.topScholars.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No data yet</p>
          ) : (
            <BarChart
              data={stats.topScholars.map((s) => ({
                label: `${s.user.name}${s.verified ? " ✓" : ""}`,
                value: s._count.followers,
                href:  `/scholars/${s.id}`,
              }))}
              maxValue={stats.topScholars[0]?._count.followers ?? 1}
            />
          )}
        </div>

        {/* Categories */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm mb-4">Content by Category</h2>
          {stats.categories.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No categories yet</p>
          ) : (
            <div className="space-y-2">
              {stats.categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                    {cat.icon} {cat.name}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {cat._count.courses} courses · {cat._count.lectures} lectures
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity summary */}
      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-semibold text-[var(--text-primary)] text-sm mb-4">Quick Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: "New Users (7d)",    value: stats.newUsersWeek },
            { label: "New Users (30d)",   value: stats.newUsersMonth },
            { label: "Active Today",      value: stats.activeToday },
            { label: "New Enrollments (30d)", value: stats.newEnrollmentsMonth },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-xl bg-[var(--bg-secondary)]">
              <div className="font-display text-xl font-bold text-[var(--text-primary)] tabular-nums">
                {item.value.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

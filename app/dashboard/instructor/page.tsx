import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prism";
import Link from "next/link";
import { formatDate } from "@/app/utils/api";
import {
  FiBookOpen, FiUsers, FiEye, FiMessageCircle,
  FiStar, FiTrendingUp, FiPlus, FiEdit3,
  FiCheckCircle, FiAlertCircle, FiClock, FiArrowRight,
  FiBarChart2, FiAward,
} from "react-icons/fi";
import type { SessionUser } from "@/app/types/auth.types";

export const metadata = { title: "Instructor Portal | Ilm Platform" };

async function getInstructorStats(userId: string) {
  const [
    totalViews,
    totalComments,
    totalEnrollments,
    recentCourses,
    avgRating,
    totalLecturesCount,
    totalCoursesCount,
    scholarProfile,
    courseStatusCounts,
    recentEnrollments,
  ] = await Promise.all([
    prisma.lecture.aggregate({
      where: { authorId: userId },
      _sum: { views: true },
    }),
    prisma.comment.count({
      where: { lecture: { authorId: userId } },
    }),
    prisma.enrollment.count({
      where: { course: { authorId: userId } },
    }),
    prisma.course.findMany({
      where: { authorId: userId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true, title: true, slug: true, status: true,
        thumbnailUrl: true, createdAt: true, updatedAt: true,
        certificateApprovalStatus: true,
        _count: { select: { modules: true, enrollments: true } },
      },
    }),
    prisma.courseRating.aggregate({
      where: { course: { authorId: userId } },
      _avg: { rating: true },
    }),
    prisma.lecture.count({ where: { authorId: userId } }),
    prisma.course.count({ where: { authorId: userId } }),
    prisma.scholar.findUnique({ where: { userId }, select: {
      id: true, professionalDesignation: true, verified: true, bio: true,
    }}),
    prisma.course.groupBy({ by: ["status"], where: { authorId: userId }, _count: { _all: true } }),
    prisma.enrollment.findMany({
      where: { course: { authorId: userId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, createdAt: true, status: true,
        user: { select: { name: true, image: true } },
        course: { select: { title: true, slug: true } },
      },
    }),
  ]);

  const countByStatus = new Map(courseStatusCounts.map((item) => [item.status, item._count._all]));
  return {
    scholarProfile,
    totalLectures: totalLecturesCount,
    totalCourses: totalCoursesCount,
    totalViews: totalViews._sum.views ?? 0,
    totalComments,
    totalEnrollments,
    recentCourses,
    recentEnrollments,
    avgRating: avgRating._avg.rating ?? 0,
    publishedCourses: countByStatus.get("PUBLISHED") ?? 0,
    draftCourses: countByStatus.get("DRAFT") ?? 0,
    underReviewCourses: countByStatus.get("PENDING_REVIEW") ?? 0,
  };
}

function statusBadge(status: string) {
  switch (status) {
    case "PUBLISHED":     return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "PENDING_REVIEW": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "DRAFT":         return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "REJECTED":      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:              return "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]";
  }
}

function certBadge(status: string | null) {
  switch (status) {
    case "APPROVED":  return <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Cert ✓</span>;
    case "PENDING":   return <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">Cert Pending</span>;
    case "REJECTED":  return <span className="text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">Cert Rejected</span>;
    default:          return null;
  }
}

export default async function InstructorDashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user) redirect("/login?callbackUrl=/dashboard/instructor");

  if (user.role !== "INSTRUCTOR") {
    if (user.role === "ADMIN") redirect("/admin");
    redirect("/dashboard");
  }

  const stats = await getInstructorStats(user.id);
  const designation = stats.scholarProfile?.professionalDesignation ?? null;
  const isVerified  = stats.scholarProfile?.verified ?? false;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* ── Instructor Portal Hero Banner ──────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-900/40">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden="true"
        />
        {/* Radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top, #6366f1 0%, transparent 70%)" }}
          aria-hidden="true"
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              {/* Role tag */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
                <FiBookOpen size={11} />
                Instructor Portal
                {isVerified && (
                  <span className="flex items-center gap-1 ml-1 text-emerald-400">
                    <FiCheckCircle size={10} /> Verified
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                Welcome back, {user.name?.split(" ")[0]}
              </h1>
              <p className="text-sm text-indigo-200/70">
                Manage your courses, track student progress, and grow your teaching.
                {designation && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-medium">
                    {designation}
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/courses/new"
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all hover:scale-105 shadow-lg shadow-indigo-900/50"
              >
                <FiPlus size={14} /> Create Course
              </Link>
              <Link
                href="/admin/lectures/new"
                className="flex items-center gap-2 px-4 py-2.5 border border-indigo-500/40 hover:border-indigo-400 text-indigo-200 hover:text-white rounded-xl text-sm transition-colors"
              >
                <FiPlus size={14} /> Add Lecture
              </Link>
            </div>
          </div>

          {/* Stats strip inside the banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { icon: <FiBookOpen size={16} />, label: "Total Courses",   value: stats.totalCourses,       sub: `${stats.publishedCourses} published` },
              { icon: <FiUsers size={16} />,    label: "Total Students",  value: stats.totalEnrollments,   sub: "enrolled across all courses" },
              { icon: <FiEye size={16} />,      label: "Total Views",     value: stats.totalViews,         sub: "lecture views" },
              { icon: <FiStar size={16} />,     label: "Average Rating",  value: stats.avgRating.toFixed(1), sub: "across all courses", isString: true },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-indigo-300 mb-2">{stat.icon}</div>
                <div className="font-display text-2xl font-bold text-white">
                  {stat.isString ? stat.value : (typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value)}
                </div>
                <div className="text-xs text-indigo-200/60 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: Course Management (2 cols) ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* My Courses */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FiBookOpen className="text-indigo-400" size={18} />
                  My Courses
                </h2>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="bg-[var(--bg-secondary)] border border-[var(--border)] px-2 py-1 rounded-lg">{stats.publishedCourses} live</span>
                  {stats.draftCourses > 0 && (
                    <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded-lg">{stats.draftCourses} draft</span>
                  )}
                  {stats.underReviewCourses > 0 && (
                    <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-1 rounded-lg">{stats.underReviewCourses} in review</span>
                  )}
                </div>
              </div>

              {stats.recentCourses.length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center border border-dashed border-[var(--border-strong)]">
                  <FiBookOpen className="text-[var(--text-muted)] text-4xl mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-1">No courses yet</p>
                  <p className="text-xs text-[var(--text-muted)] mb-4">Create your first course to start teaching students.</p>
                  <Link
                    href="/admin/courses/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    <FiPlus size={13} /> Create your first course
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentCourses.map((course) => (
                    <div
                      key={course.id}
                      className="glass-card rounded-xl border border-[var(--border)] p-4 flex items-center gap-4 hover:border-[var(--border-strong)] transition-all group"
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-10 rounded-lg overflow-hidden bg-[var(--bg-secondary)] flex-shrink-0 border border-[var(--border)]">
                        {course.thumbnailUrl ? (
                          <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] opacity-40 text-lg">📖</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-indigo-400 transition-colors">
                            {course.title}
                          </p>
                          {certBadge(course.certificateApprovalStatus)}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                          <span>{course._count.modules} modules</span>
                          <span>·</span>
                          <span>{course._count.enrollments} students</span>
                          <span>·</span>
                          <span>Updated {formatDate(course.updatedAt)}</span>
                        </div>
                      </div>

                      {/* Status + Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge(course.status)}`}>
                          {course.status.replace("_", " ")}
                        </span>
                        <Link
                          href={`/admin/courses/${course.id}/edit`}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                          title="Edit course"
                          aria-label={`Edit ${course.title}`}
                        >
                          <FiEdit3 size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}

                  {stats.totalCourses > 6 && (
                    <div className="text-center pt-2">
                      <Link
                        href="/admin/courses"
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 transition-colors"
                      >
                        View all {stats.totalCourses} courses <FiArrowRight size={11} />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Recent Enrollments */}
            {stats.recentEnrollments.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-bold text-[var(--text-primary)] flex items-center gap-2 mb-5">
                  <FiUsers className="text-indigo-400" size={18} />
                  Recent Student Enrollments
                </h2>
                <div className="glass-card rounded-xl overflow-hidden border border-[var(--border)]">
                  <div className="divide-y divide-[var(--border)]">
                    {stats.recentEnrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition-colors">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold flex-shrink-0">
                          {enrollment.user.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {enrollment.user.name ?? "Anonymous"}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">
                            enrolled in <span className="text-[var(--text-secondary)]">{enrollment.course.title}</span>
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {formatDate(enrollment.createdAt)}
                          </span>
                          <div className={`text-[9px] font-semibold mt-0.5 text-right ${
                            enrollment.status === "COMPLETED" ? "text-emerald-400" : "text-[var(--text-muted)]"
                          }`}>
                            {enrollment.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* ── Right: Quick Actions + Status Panel ── */}
          <div className="space-y-6">

            {/* Course status breakdown */}
            <section className="glass-card rounded-2xl p-5 border border-[var(--border)] space-y-4">
              <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <FiBarChart2 className="text-indigo-400" size={15} />
                Course Overview
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Published",   value: stats.publishedCourses,  color: "bg-emerald-400" },
                  { label: "Under Review", value: stats.underReviewCourses, color: "bg-blue-400" },
                  { label: "Drafts",      value: stats.draftCourses,       color: "bg-amber-400" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[var(--text-muted)]">{item.label}</span>
                      <span className="font-semibold text-[var(--text-primary)]">{item.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-500`}
                        style={{ width: stats.totalCourses > 0 ? `${(item.value / stats.totalCourses) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick Actions */}
            <section className="glass-card rounded-2xl p-5 border border-[var(--border)] space-y-3">
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">Quick Actions</h3>
              <div className="space-y-1.5">
                {[
                  { href: "/admin/courses/new",  icon: <FiPlus size={13} />,        label: "Create New Course",   highlight: true },
                  { href: "/admin/lectures/new", icon: <FiPlus size={13} />,        label: "Add New Lecture" },
                  { href: "/admin/courses",      icon: <FiBookOpen size={13} />,    label: "Manage All Courses" },
                  { href: "/admin/my-analytics", icon: <FiTrendingUp size={13} />,  label: "View My Analytics" },
                  { href: "/dashboard/instructor/students", icon: <FiUsers size={13} />,       label: "My Students" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all ${
                      link.highlight
                        ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={link.highlight ? "text-indigo-400" : "text-[var(--accent)]"}>{link.icon}</span>
                      {link.label}
                    </span>
                    <FiArrowRight size={11} className="text-[var(--text-muted)]" />
                  </Link>
                ))}
              </div>
            </section>

            {/* Platform Tips */}
            <section className="glass-card rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5 space-y-3">
              <h3 className="font-semibold text-sm text-amber-400 flex items-center gap-2">
                <FiAlertCircle size={13} /> Tips
              </h3>
              <ul className="space-y-2.5 text-xs text-[var(--text-muted)]">
                <li className="flex items-start gap-2">
                  <FiAward size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  Request certificate approval from admin on each published course.
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  Add a module quiz at the end of each section to gate progression.
                </li>
                <li className="flex items-start gap-2">
                  <FiClock size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  Keep lectures under 15 minutes for best student completion rates.
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

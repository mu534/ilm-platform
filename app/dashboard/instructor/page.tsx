import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prism";
import Link from "next/link";
import { formatDate } from "@/app/utils/api";
import {
  FiBookOpen, FiUsers, FiEye, FiMessageCircle,
  FiStar, FiTrendingUp, FiPlus,
} from "react-icons/fi";
import type { SessionUser } from "@/app/types/auth.types";

export const metadata = { title: "Instructor Dashboard" };

async function getInstructorStats(userId: string) {
  const [
    totalViews,
    totalComments,
    totalEnrollments,
    recentLectures,
    recentCourses,
    avgRating,
    totalLecturesCount,
    totalCoursesCount,
    scholarProfile,
    courseStatusCounts,
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
    prisma.lecture.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, title: true, slug: true, type: true,
        published: true, views: true, createdAt: true,
        _count: { select: { comments: true } },
      },
    }),
    prisma.course.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, title: true, slug: true, status: true,
        createdAt: true,
        _count: { select: { modules: true, enrollments: true } },
      },
    }),
    prisma.courseRating.aggregate({
      where: { course: { authorId: userId } },
      _avg: { rating: true },
    }),
    prisma.lecture.count({ where: { authorId: userId } }),
    prisma.course.count({ where: { authorId: userId } }),
    prisma.scholar.findUnique({ where: { userId } }),
    prisma.course.groupBy({ by: ["status"], where: { authorId: userId }, _count: { _all: true } }),
  ]);

  const countByStatus = new Map(courseStatusCounts.map((item) => [item.status, item._count._all]));
  return {
    scholarProfile,
    totalLectures: totalLecturesCount,
    totalCourses: totalCoursesCount,
    totalViews: totalViews._sum.views ?? 0,
    totalComments,
    totalEnrollments,
    recentLectures,
    recentCourses,
    avgRating: avgRating._avg.rating ?? 0,
    publishedCourses: countByStatus.get("PUBLISHED") ?? 0,
    draftCourses: countByStatus.get("DRAFT") ?? 0,
    underReviewCourses: countByStatus.get("PENDING_REVIEW") ?? 0,
  };
}

export default async function InstructorDashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user) redirect("/login?callbackUrl=/dashboard/instructor");
  
  // Only INSTRUCTOR can access this page
  if (user.role !== "INSTRUCTOR") {
    if (user.role === "ADMIN") redirect("/admin");
    redirect("/dashboard");
  }

  const stats = await getInstructorStats(user.id);

  const designation = stats.scholarProfile?.professionalDesignation ?? null;

  const statCards = [
    { icon: <FiTrendingUp />,   label: "Courses",     value: stats.totalCourses,     color: "text-blue-400" },
    { icon: <FiBookOpen />,     label: "Published",   value: stats.publishedCourses, color: "text-emerald-400" },
    { icon: <FiBookOpen />,     label: "Drafts",      value: stats.draftCourses,     color: "text-[var(--accent)]" },
    { icon: <FiEye />,          label: "Under Review", value: stats.underReviewCourses, color: "text-orange-400" },
    { icon: <FiUsers />,        label: "Students",     value: stats.totalEnrollments, color: "text-purple-400" },
    { icon: <FiMessageCircle />,label: "Comments",     value: stats.totalComments,    color: "text-orange-400" },
    { icon: <FiStar />,         label: "Avg Rating",   value: stats.avgRating.toFixed(1), color: "text-[var(--accent)]", isString: true },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-1">
            Instructor Portal
          </p>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Instructor Dashboard
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Your course creation & student progress overview
            {designation && (
              <span className="ml-2 text-xs px-2.5 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-strong)] font-medium">
                {designation}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/courses/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl text-sm font-semibold transition-all hover:scale-105"
          >
            <FiPlus size={14} /> New Course
          </Link>
          <Link
            href="/dashboard/instructor/students"
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] rounded-xl text-sm transition-colors"
          >
            <FiUsers size={14} /> My Students
          </Link>
          <Link
            href="/dashboard/instructor/analytics"
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] rounded-xl text-sm transition-colors"
          >
            <FiTrendingUp size={14} /> Analytics
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {statCards.map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-5 flex flex-col gap-2">
            <div className={`text-xl ${stat.color}`}>{stat.icon}</div>
            <div className="font-display text-2xl font-bold text-[var(--text-primary)]">
              {stat.isString ? stat.value : stat.value.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Recent Lectures */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Recent Lectures</h2>
            <span className="text-xs text-[var(--text-muted)]">Manage via course pages</span>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            {stats.recentLectures.length === 0 ? (
              <div className="py-10 text-center text-[var(--text-muted)] text-sm">No lectures yet</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {stats.recentLectures.map((lecture) => (
                  <div key={lecture.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition-colors">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/lectures/${lecture.slug}`}
                        className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate block"
                      >
                        {lecture.title}
                      </Link>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatDate(lecture.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] flex-shrink-0">
                      <span className="flex items-center gap-1"><FiEye size={10} /> {lecture.views}</span>
                      <span className="flex items-center gap-1"><FiMessageCircle size={10} /> {lecture._count.comments}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs border ${lecture.published ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]"}`}>
                        {lecture.published ? "Live" : "Draft"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Courses */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Recent Courses</h2>
            <span className="text-xs text-[var(--text-muted)]">Manage via course pages</span>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            {stats.recentCourses.length === 0 ? (
              <div className="py-10 text-center text-[var(--text-muted)] text-sm">
                No courses yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {stats.recentCourses.map((course) => (
                  <div key={course.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition-colors">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/courses/${course.slug}`}
                        className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate block"
                      >
                        {course.title}
                      </Link>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {course._count.modules} modules · {course._count.enrollments} students
                      </p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border flex-shrink-0 ${
                      course.status === "PUBLISHED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      course.status === "PENDING_REVIEW" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]"
                    }`}>
                      {course.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

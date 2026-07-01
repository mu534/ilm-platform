import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import Link from "next/link";
import { formatDate } from "../../utils/api";
import {
  FiBookOpen, FiUsers, FiEye, FiMessageCircle,
  FiStar, FiTrendingUp, FiPlus,
} from "react-icons/fi";
import type { SessionUser } from "../../types/auth.types";

export const metadata = { title: "Scholar Dashboard" };

async function getScholarStats(userId: string) {
  const scholar = await prisma.scholar.findUnique({
    where: { userId },
    include: {
      _count: { select: { followers: true, lectures: true, courses: true } },
    },
  });

  if (!scholar) return null;

  const [
    totalViews,
    totalComments,
    totalEnrollments,
    recentLectures,
    recentCourses,
    avgRating,
  ] = await Promise.all([
    // Sum all lecture views for this scholar
    prisma.lecture.aggregate({
      where: { scholarId: scholar.id },
      _sum: { views: true },
    }),
    // Count comments on scholar's lectures
    prisma.comment.count({
      where: { lecture: { scholarId: scholar.id } },
    }),
    // Count enrollments in scholar's courses
    prisma.enrollment.count({
      where: { course: { scholarId: scholar.id } },
    }),
    // Recent lectures
    prisma.lecture.findMany({
      where: { scholarId: scholar.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, title: true, slug: true, type: true,
        published: true, views: true, createdAt: true,
        _count: { select: { comments: true } },
      },
    }),
    // Recent courses
    prisma.course.findMany({
      where: { scholarId: scholar.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, title: true, slug: true, status: true,
        createdAt: true,
        _count: { select: { modules: true, enrollments: true } },
      },
    }),
    // Avg course rating
    prisma.courseRating.aggregate({
      where: { course: { scholarId: scholar.id } },
      _avg: { rating: true },
    }),
  ]);

  return {
    scholar,
    totalViews:       totalViews._sum.views ?? 0,
    totalComments,
    totalEnrollments,
    recentLectures,
    recentCourses,
    avgRating:        avgRating._avg.rating ?? 0,
  };
}

export default async function ScholarDashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!user) redirect("/login?callbackUrl=/dashboard/scholar");
  if (!["SCHOLAR", "ADMIN"].includes(user.role)) redirect("/dashboard");

  const stats = await getScholarStats(user.id);

  if (!stats) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-[var(--text-muted)] mb-4">Your scholar profile has not been set up yet.</p>
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-medium transition-colors hover:bg-[var(--accent-light)]"
        >
          Complete Profile
        </Link>
      </div>
    );
  }

  const statCards = [
    { icon: <FiBookOpen />,     label: "Lectures",    value: stats.scholar._count.lectures,    color: "text-[var(--accent)]" },
    { icon: <FiTrendingUp />,   label: "Courses",     value: stats.scholar._count.courses,     color: "text-blue-400" },
    { icon: <FiEye />,          label: "Total Views",  value: stats.totalViews,                color: "text-emerald-400" },
    { icon: <FiUsers />,        label: "Students",     value: stats.totalEnrollments,          color: "text-purple-400" },
    { icon: <FiUsers />,        label: "Followers",    value: stats.scholar._count.followers,  color: "text-pink-400" },
    { icon: <FiMessageCircle />,label: "Comments",     value: stats.totalComments,             color: "text-orange-400" },
    { icon: <FiStar />,         label: "Avg Rating",   value: stats.avgRating.toFixed(1),      color: "text-[var(--accent)]", isString: true },
    { icon: <FiStar />,         label: "Verified",     value: stats.scholar.verified ? "Yes" : "No", color: stats.scholar.verified ? "text-emerald-400" : "text-[var(--text-muted)]", isString: true },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-1">Scholar Panel</p>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Scholar Dashboard
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Your content performance at a glance
            {stats.scholar.verified && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ✓ Verified
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/courses/new"
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] rounded-xl text-sm transition-colors"
          >
            <FiPlus size={14} /> New Course
          </Link>
          <Link
            href="/admin/lectures/new"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white rounded-xl text-sm font-medium transition-colors"
          >
            <FiPlus size={14} /> New Lecture
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
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
            <Link href="/admin/lectures" className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
              View all →
            </Link>
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
            <Link href="/admin/courses" className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
              View all →
            </Link>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            {stats.recentCourses.length === 0 ? (
              <div className="py-10 text-center text-[var(--text-muted)] text-sm">
                No courses yet.{" "}
                <Link href="/admin/courses/new" className="text-[var(--accent)] hover:text-[var(--accent-light)]">
                  Create one →
                </Link>
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

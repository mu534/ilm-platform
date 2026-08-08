import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import Link from "next/link";
import {
  FiUsers, FiCheckCircle, FiBarChart2, FiBookOpen, FiStar,
} from "react-icons/fi";
import type { SessionUser } from "@/app/types/auth.types";

export const metadata = { title: "My Analytics" };

async function getScholarAnalytics(authorId: string) {
  const courses = await prisma.course.findMany({
    where:  { authorId },
    select: { id: true, title: true, slug: true, status: true, approvalStatus: true, createdAt: true },
  });
  const courseIds = courses.map((c) => c.id);

  if (courseIds.length === 0) {
    return { courses: [], courseIds, totalEnrollments: 0, activeStudents: 0, completedStudents: 0, completionRate: 0, avgQuizScore: null, avgRating: null, totalRatings: 0, courseBreakdown: [] };
  }

  const [totalEnrollments, activeEnrollments, completedEnrollments, ratingAgg, quizAgg, courseBreakdown] =
    await Promise.all([
      prisma.enrollment.count({ where: { courseId: { in: courseIds } } }),
      prisma.enrollment.count({ where: { courseId: { in: courseIds }, status: "ACTIVE" } }),
      prisma.enrollment.count({ where: { courseId: { in: courseIds }, status: "COMPLETED" } }),
      prisma.courseRating.aggregate({
        where: { courseId: { in: courseIds } },
        _avg:  { rating: true },
        _count: { rating: true },
      }),
      prisma.quizAttempt.aggregate({
        where: { quiz: { module: { courseId: { in: courseIds } } } },
        _avg:  { score: true },
      }),
      prisma.course.findMany({
        where:  { authorId },
        select: {
          id: true, title: true, slug: true, status: true, approvalStatus: true,
          _count:  { select: { enrollments: true, ratings: true } },
          ratings: { select: { rating: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

  const breakdown = courseBreakdown.map((c) => {
    const avgRating = c.ratings.length > 0 ? c.ratings.reduce((s, r) => s + r.rating, 0) / c.ratings.length : null;
    return {
      id: c.id, title: c.title, slug: c.slug, status: c.status, approvalStatus: c.approvalStatus,
      enrollments: c._count.enrollments, ratings: c._count.ratings,
      avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    };
  });

  return {
    courses, courseIds, totalEnrollments,
    activeStudents: activeEnrollments,
    completedStudents: completedEnrollments,
    completionRate,
    avgQuizScore: quizAgg._avg.score ? Math.round(quizAgg._avg.score * 10) / 10 : null,
    avgRating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : null,
    totalRatings: ratingAgg._count.rating,
    courseBreakdown: breakdown,
  };
}

export default async function MyAnalyticsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user || !["ADMIN", "SCHOLAR"].includes(user.role)) redirect("/login");

  const data = await getScholarAnalytics(user.id);

  const stats = [
    { icon: <FiBookOpen size={16} />, label: "Total Courses",      value: data.courses.length,         color: "text-[var(--accent)]"  },
    { icon: <FiUsers size={16} />,    label: "Total Enrollments",   value: data.totalEnrollments,        color: "text-blue-400"         },
    { icon: <FiUsers size={16} />,    label: "Active Students",     value: data.activeStudents,          color: "text-emerald-400"      },
    { icon: <FiCheckCircle size={16}/>, label: "Completed",         value: data.completedStudents,       color: "text-purple-400"       },
    { icon: <FiBarChart2 size={16} />,  label: "Completion Rate",   value: `${data.completionRate}%`,    color: "text-amber-400", isString: true  },
    { icon: <FiStar size={16} />,       label: "Avg Rating",        value: data.avgRating ?? "—",       color: "text-gold-400",  isString: true  },
  ];

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="mb-8">
        <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">Scholar Panel</p>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">My Analytics</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Performance metrics for your courses only</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-5">
            <div className={`text-xl mb-2 ${s.color}`}>{s.icon}</div>
            <div className="font-display text-2xl font-bold text-[var(--text-primary)]">
              {s.isString ? s.value : (s.value as number).toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Course breakdown */}
      {data.courseBreakdown.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <FiBookOpen className="text-[var(--text-muted)] text-4xl mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">No courses yet. <Link href="/admin/courses/new" className="text-[var(--accent)]">Create your first course →</Link></p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)] text-sm">Course Breakdown</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {data.courseBreakdown.map((course) => (
              <div key={course.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{course.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{course.status}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] flex-shrink-0">
                  <span className="flex items-center gap-1"><FiUsers size={12} /> {course.enrollments}</span>
                  <span className="flex items-center gap-1"><FiStar size={12} /> {course.avgRating ?? "—"}</span>
                  <Link href={`/admin/courses/${course.id}/edit`}
                    className="text-xs text-[var(--accent)] hover:underline">
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

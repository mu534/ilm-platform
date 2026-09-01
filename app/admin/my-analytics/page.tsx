import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import Link from "next/link";
import {
  FiUsers, FiCheckCircle, FiBarChart2, FiBookOpen, FiStar,
  FiEye, FiMessageCircle,
} from "react-icons/fi";
import { formatDate } from "../../utils/api";
import type { SessionUser } from "@/app/types/auth.types";

export const metadata = { title: "My Analytics" };

// This page used to only cover enrollment/completion performance, while a
// second, disconnected "Instructor Analytics" page at
// /dashboard/instructor/analytics covered content engagement (views,
// comments, top lectures) — two competing instructor-analytics screens that
// grew independently. That page now redirects here; the engagement queries
// below (day30/topLectures/commentsByType/recentComments) are what it used
// to compute on its own, folded into this one canonical page.
async function getScholarAnalytics(authorId: string) {
  const courses = await prisma.course.findMany({
    where:  { authorId },
    select: { id: true, title: true, slug: true, status: true, approvalStatus: true, createdAt: true },
  });
  const courseIds = courses.map((c) => c.id);
  const day30 = new Date(Date.now() - 30 * 86400_000);

  if (courseIds.length === 0) {
    return {
      courses, courseIds, totalEnrollments: 0, activeStudents: 0, completedStudents: 0,
      completionRate: 0, avgQuizScore: null, avgRating: null, totalRatings: 0, courseBreakdown: [],
      totalViews: 0, viewsThisMonth: 0, totalComments: 0, commentsThisMonth: 0,
      topLectures: [], lecturesByType: [], recentComments: [],
    };
  }

  const [
    totalEnrollments, activeEnrollments, completedEnrollments, ratingAgg, quizAgg, courseBreakdown,
    viewsAgg, viewsThisMonthAgg, totalComments, commentsThisMonth,
    topLectures, lecturesByType, recentComments,
  ] = await Promise.all([
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

      // ── Engagement (formerly the separate instructor/analytics page) ──
      prisma.lecture.aggregate({
        where: { authorId, published: true },
        _sum:  { views: true },
      }),
      prisma.lecture.aggregate({
        where: { authorId, published: true, createdAt: { gte: day30 } },
        _sum:  { views: true },
      }),
      prisma.comment.count({ where: { lecture: { authorId } } }),
      prisma.comment.count({ where: { lecture: { authorId }, createdAt: { gte: day30 } } }),
      prisma.lecture.findMany({
        where:   { authorId, published: true },
        orderBy: { views: "desc" },
        take:    5,
        select:  { id: true, title: true, slug: true, type: true, views: true },
      }),
      prisma.lecture.groupBy({
        by:    ["type"],
        where: { authorId, published: true },
        _count: true,
      }),
      prisma.comment.findMany({
        where:   { lecture: { authorId }, approved: true },
        orderBy: { createdAt: "desc" },
        take:    5,
        include: {
          author:  { select: { name: true } },
          lecture: { select: { title: true, slug: true } },
        },
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
    totalViews: viewsAgg._sum.views ?? 0,
    viewsThisMonth: viewsThisMonthAgg._sum.views ?? 0,
    totalComments,
    commentsThisMonth,
    topLectures,
    lecturesByType,
    recentComments,
  };
}

function HBarChart({ data, maxVal }: { data: { label: string; value: number; href?: string }[]; maxVal: number }) {
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-36 text-xs text-[var(--text-secondary)] truncate flex-shrink-0">
            {item.href
              ? <Link href={item.href} className="hover:text-[var(--accent)] transition-colors">{item.label}</Link>
              : item.label}
          </div>
          <div className="flex-1 h-5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all duration-700"
              style={{ width: maxVal > 0 ? `${Math.min(100, (item.value / maxVal) * 100)}%` : "0%" }}
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

export default async function MyAnalyticsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user || !["ADMIN", "INSTRUCTOR"].includes(user.role)) redirect("/dashboard");

  const data = await getScholarAnalytics(user.id);
  const maxViews = data.topLectures[0]?.views ?? 1;

  const stats = [
    { icon: <FiBookOpen size={16} />, label: "Total Courses",      value: data.courses.length,         color: "text-[var(--accent)]"  },
    { icon: <FiUsers size={16} />,    label: "Total Enrollments",   value: data.totalEnrollments,        color: "text-blue-400"         },
    { icon: <FiUsers size={16} />,    label: "Active Students",     value: data.activeStudents,          color: "text-emerald-400"      },
    { icon: <FiCheckCircle size={16}/>, label: "Completed",         value: data.completedStudents,       color: "text-purple-400"       },
    { icon: <FiBarChart2 size={16} />,  label: "Completion Rate",   value: `${data.completionRate}%`,    color: "text-amber-400", isString: true  },
    { icon: <FiStar size={16} />,       label: "Avg Rating",        value: data.avgRating ?? "—",       color: "text-gold-400",  isString: true  },
    { icon: <FiEye size={16} />,        label: "Total Views",       value: data.totalViews,              color: "text-cyan-400"         },
    { icon: <FiMessageCircle size={16}/>, label: "Comments",        value: data.totalComments,           color: "text-orange-400"       },
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

      {/* Engagement: top lectures, content mix, recent comments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="glass-card rounded-2xl p-5">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm mb-5">Top Lectures by Views</h2>
          {data.topLectures.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No published lectures yet.</p>
          ) : (
            <HBarChart
              data={data.topLectures.map((l) => ({ label: l.title, value: l.views, href: `/lectures/${l.slug}` }))}
              maxVal={maxViews}
            />
          )}
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm mb-5">Content by Type</h2>
          {data.lecturesByType.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No content yet.</p>
          ) : (
            <div className="space-y-3">
              {data.lecturesByType.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)] capitalize">{item.type.toLowerCase()}</span>
                  <span className="text-sm font-medium text-[var(--text-primary)] tabular-nums">{item._count}</span>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Views (30d)</span>
                <span className="font-medium text-[var(--text-primary)] tabular-nums">+{data.viewsThisMonth}</span>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5 lg:col-span-2">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm mb-4">Recent Comments</h2>
          {data.recentComments.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No comments yet.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {data.recentComments.map((comment) => (
                <div key={comment.id} className="py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] flex-shrink-0 flex items-center justify-center text-[var(--accent)] text-xs font-bold">
                    {comment.author.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-[var(--text-primary)]">{comment.author.name}</span>
                      <span className="text-xs text-[var(--text-muted)]">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{comment.body}</p>
                    <Link href={`/lectures/${comment.lecture.slug}`} className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors mt-0.5 block truncate">
                      {comment.lecture.title}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prism";
import Link from "next/link";
import { formatDate } from "@/app/utils/api";
import {
  FiArrowLeft, FiEye, FiBookOpen, FiUsers,
  FiMessageCircle, FiStar, FiTrendingUp,
} from "react-icons/fi";
import type { SessionUser } from "@/app/types/auth.types";

export const metadata = { title: "Instructor Analytics" };

async function getAnalytics(userId: string) {
  const authorId = userId;
  const now      = new Date();
  const day30    = new Date(now.getTime() - 30 * 86400_000);
  const day7     = new Date(now.getTime() -  7 * 86400_000);
  const day90    = new Date(now.getTime() - 90 * 86400_000);

  const [
    totalLectures, totalCourses,
    totalViews, totalComments, totalEnrollments,
    avgRating, totalRatings,
    viewsThisMonth, commentsThisMonth,
    topLectures, recentComments,
    lecturesByType, monthlyViews,
    scholarProfile,
  ] = await Promise.all([

    prisma.lecture.count({ where: { authorId, published: true } }),
    prisma.course.count({ where: { authorId, published: true } }),

    prisma.lecture.aggregate({
      where: { authorId, published: true },
      _sum: { views: true },
    }),

    prisma.comment.count({
      where: { lecture: { authorId } },
    }),

    prisma.enrollment.count({
      where: { course: { authorId } },
    }),

    prisma.courseRating.aggregate({
      where: { course: { authorId } },
      _avg: { rating: true },
    }),

    prisma.courseRating.count({
      where: { course: { authorId } },
    }),

    prisma.lecture.aggregate({
      where: { authorId, createdAt: { gte: day30 } },
      _sum: { views: true },
    }),

    prisma.comment.count({
      where: { lecture: { authorId }, createdAt: { gte: day30 } },
    }),

    prisma.lecture.findMany({
      where: { authorId, published: true },
      orderBy: { views: "desc" },
      take: 5,
      select: {
        id: true, title: true, slug: true, type: true,
        views: true, createdAt: true,
        _count: { select: { comments: true, likes: true } },
      },
    }),

    prisma.comment.findMany({
      where: { lecture: { authorId }, approved: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        author:  { select: { name: true, image: true } },
        lecture: { select: { title: true, slug: true } },
      },
    }),

    prisma.lecture.groupBy({
      by: ["type"],
      where: { authorId, published: true },
      _count: true,
    }),

    prisma.lecture.findMany({
      where: { authorId, published: true, createdAt: { gte: day90 } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { title: true, views: true, createdAt: true, type: true },
    }),

    prisma.scholar.findUnique({ where: { userId } }),
  ]);

  return {
    scholarProfile,
    totals: {
      lectures:    totalLectures,
      courses:     totalCourses,
      views:       totalViews._sum.views ?? 0,
      comments:    totalComments,
      enrollments: totalEnrollments,
      avgRating:   avgRating._avg.rating ?? 0,
      totalRatings,
    },
    growth: {
      viewsThisMonth: viewsThisMonth._sum.views ?? 0,
      commentsThisMonth,
    },
    topLectures,
    recentComments,
    lecturesByType,
    monthlyViews,
  };
}

function StatCard({
  icon, label, value, sub, color = "text-[var(--accent)]",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-2">
      <div className={`text-xl ${color}`}>{icon}</div>
      <div className="font-display text-3xl font-bold text-[var(--text-primary)] tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      {sub && <div className="text-xs text-emerald-400">{sub}</div>}
    </div>
  );
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

export default async function InstructorAnalyticsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const { defaultLocale } = await import("@/i18n/config");
  if (!user) redirect(`/${defaultLocale}/login?callbackUrl=/${defaultLocale}/dashboard/instructor/analytics`);
  if (!["INSTRUCTOR", "ADMIN"].includes(user.role)) redirect(`/${defaultLocale}/dashboard`);

  const data = await getAnalytics(user.id);
  const maxViews = data.topLectures[0]?.views ?? 1;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <Link href="/dashboard/instructor" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-3">
            <FiArrowLeft size={13} /> Instructor Dashboard
          </Link>
          <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-1">Insights</p>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">Instructor Analytics</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Performance & engagement across your courses
          </p>
        </div>
        <Link href="/admin/courses" className="btn-primary text-sm">Manage Lessons</Link>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<FiBookOpen />}      label="Published Lectures" value={data.totals.lectures}    />
        <StatCard icon={<FiEye />}           label="Total Views"        value={data.totals.views}       color="text-blue-400" />
        <StatCard icon={<FiUsers />}         label="Students Enrolled"  value={data.totals.enrollments} color="text-purple-400" />
        <StatCard icon={<FiMessageCircle />} label="Comments"           value={data.totals.comments}    color="text-orange-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard icon={<FiBookOpen />}  label="Courses"      value={data.totals.courses}     color="text-emerald-400" />
        <StatCard icon={<FiStar />}      label="Avg Rating"   value={data.totals.avgRating.toFixed(1)} color="text-[var(--accent)]"
          sub={`${data.totals.totalRatings} reviews`} />
        <StatCard icon={<FiTrendingUp />} label="Views (30d)" value={data.growth.viewsThisMonth} color="text-cyan-400"
          sub={`${data.growth.commentsThisMonth} comments`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Top lectures by views */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm mb-5">Top Lectures by Views</h2>
          {data.topLectures.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No published lectures yet.</p>
          ) : (
            <HBarChart
              data={data.topLectures.map((l) => ({
                label: l.title,
                value: l.views,
                href:  `/lectures/${l.slug}`,
              }))}
              maxVal={maxViews}
            />
          )}
        </div>

        {/* Content breakdown */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm mb-5">Content by Type</h2>
          {data.lecturesByType.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No content yet.</p>
          ) : (
            <div className="space-y-3">
              {data.lecturesByType.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {item.type === "VIDEO" ? "🎥" : item.type === "AUDIO" ? "🎧" : item.type === "PDF" ? "📄" : "📝"}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)] capitalize">
                      {item.type.toLowerCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                    {item._count}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Growth summary */}
          <div className="mt-6 pt-4 border-t border-[var(--border)] space-y-2">
            <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium mb-3">Growth</h3>
            {[
              { label: "Comments (30d)", value: data.growth.commentsThisMonth },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">{row.label}</span>
                <span className="font-medium text-[var(--text-primary)] tabular-nums">+{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent comments */}
        <div className="glass-card rounded-2xl p-5 lg:col-span-2">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm mb-4">Recent Comments</h2>
          {data.recentComments.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No comments yet.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {data.recentComments.map((comment) => (
                <div key={comment.id} className="py-3 flex items-start gap-3">
                  {/* Avatar */}
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

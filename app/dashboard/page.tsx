import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { prisma } from "../lib/prism";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "../utils/api";
import {
  FiBookOpen, FiCheckCircle, FiClock,
  FiAward, FiBookmark, FiActivity,
} from "react-icons/fi";
import type { SessionUser } from "../types/auth.types";

export const metadata = { title: "My Dashboard" };

async function getDashboardData(userId: string) {
  const [
    enrollments,
    recentProgress,
    bookmarks,
    certificates,
    quizAttempts,
  ] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        course: {
          select: {
            id: true, title: true, slug: true, thumbnailUrl: true,
            difficulty: true,
            _count: { select: { modules: true } },
          },
        },
      },
    }),
    prisma.lectureProgress.findMany({
      where: { userId },
      orderBy: { lastViewedAt: "desc" },
      take: 5,
      include: {
        lecture: {
          select: {
            id: true, title: true, slug: true, type: true, thumbnailUrl: true,
            module: {
              select: {
                id: true, title: true,
                course: { select: { id: true, title: true, slug: true } },
              },
            },
          },
        },
      },
    }),
    prisma.bookmark.count({ where: { userId } }),
    prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
      take: 5,
      include: {
        course: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 5,
      include: {
        quiz: { select: { id: true, title: true, passingScore: true } },
      },
    }),
  ]);

  const active    = enrollments.filter((e) => e.status === "ACTIVE");
  const completed = enrollments.filter((e) => e.status === "COMPLETED");
  const totalTime = await prisma.lectureProgress.aggregate({
    where: { userId },
    _sum: { watchedSeconds: true },
  });

  return {
    enrollments, active, completed,
    recentProgress, bookmarks,
    certificates, quizAttempts,
    totalWatchedSeconds: totalTime._sum.watchedSeconds ?? 0,
  };
}

function formatWatchTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const data = await getDashboardData(user.id);

  const statsCards = [
    { icon: <FiBookOpen />,     label: "Enrolled",  value: data.enrollments.length,          color: "text-[var(--accent)]" },
    { icon: <FiCheckCircle />,  label: "Completed", value: data.completed.length,             color: "text-emerald-400" },
    { icon: <FiAward />,        label: "Certificates", value: data.certificates.length,       color: "text-purple-400" },
    { icon: <FiClock />,        label: "Watch Time", value: formatWatchTime(data.totalWatchedSeconds), color: "text-blue-400", isString: true },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-1">
          My Learning
        </p>
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
          Welcome back, {user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Track your Islamic learning journey
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {statsCards.map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-5 flex flex-col gap-2">
            <div className={`text-xl ${stat.color}`}>{stat.icon}</div>
            <div className="font-display text-2xl font-bold text-[var(--text-primary)]">
              {stat.isString ? stat.value : stat.value}
            </div>
            <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Continue Learning */}
        <div className="lg:col-span-2 space-y-6">

          {/* Recent Activity */}
          {data.recentProgress.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-4">
                Continue Learning
              </h2>
              <div className="space-y-3">
                {data.recentProgress.map((p) => (
                  <Link
                    key={p.id}
                    href={`/lectures/${p.lecture.slug}`}
                    className="flex items-center gap-4 p-4 glass-card rounded-xl hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] transition-all duration-200 group"
                  >
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--bg-secondary)]">
                      {p.lecture.thumbnailUrl ? (
                        <Image src={p.lecture.thumbnailUrl} alt={p.lecture.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiBookOpen className="text-[var(--text-muted)]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                        {p.lecture.title}
                      </p>
                      {p.lecture.module?.course && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                          {p.lecture.module.course.title}
                        </p>
                      )}
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {formatDate(p.lastViewedAt)}
                      </p>
                    </div>
                    {p.completed && (
                      <FiCheckCircle className="text-emerald-400 flex-shrink-0" size={16} />
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Active Courses */}
          {data.active.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-4">
                My Courses
              </h2>
              <div className="space-y-3">
                {data.active.map((enrollment) => (
                  <Link
                    key={enrollment.id}
                    href={`/courses/${enrollment.course.slug}`}
                    className="flex items-center gap-4 p-4 glass-card rounded-xl hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] transition-all duration-200 group"
                  >
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--bg-secondary)]">
                      {enrollment.course.thumbnailUrl ? (
                        <Image src={enrollment.course.thumbnailUrl} alt={enrollment.course.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiBookOpen className="text-[var(--text-muted)]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                        {enrollment.course.title}
                      </p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                          <span>Progress</span>
                          <span>{Math.round(enrollment.progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-400"
                            style={{ width: `${Math.min(100, enrollment.progress)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Completed courses */}
          {data.completed.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-4">
                Completed Courses
              </h2>
              <div className="space-y-3">
                {data.completed.map((enrollment) => (
                  <Link
                    key={enrollment.id}
                    href={`/courses/${enrollment.course.slug}`}
                    className="flex items-center gap-4 p-4 glass-card rounded-xl hover:border-[var(--border-strong)] transition-all duration-200 group"
                  >
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--bg-secondary)]">
                      {enrollment.course.thumbnailUrl ? (
                        <Image src={enrollment.course.thumbnailUrl} alt={enrollment.course.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiBookOpen className="text-[var(--text-muted)]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                        {enrollment.course.title}
                      </p>
                      <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                        <FiCheckCircle size={11} /> Completed
                        {enrollment.completedAt && ` · ${formatDate(enrollment.completedAt)}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.enrollments.length === 0 && data.recentProgress.length === 0 && (
            <div className="glass-card rounded-2xl p-12 text-center">
              <FiBookOpen className="text-[var(--text-muted)] text-4xl mx-auto mb-4" />
              <p className="text-[var(--text-primary)] font-semibold mb-2">No courses yet</p>
              <p className="text-[var(--text-muted)] text-sm mb-6">Start learning by enrolling in a course</p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-xl text-sm font-semibold transition-all hover:scale-105"
              >
                <FiBookOpen size={14} /> Browse Courses
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Quick links */}
          <section className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-4">Quick Access</h3>
            <div className="space-y-2">
              {[
                { href: "/courses",              icon: <FiBookOpen size={14} />,    label: "Browse Courses"     },
                { href: "/lectures",             icon: <FiActivity size={14} />,   label: "Browse Lectures"    },
                { href: "/dashboard/bookmarks",  icon: <FiBookmark size={14} />,   label: `Bookmarks (${data.bookmarks})` },
                { href: "/dashboard/certificates", icon: <FiAward size={14} />,    label: "My Certificates"    },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all"
                >
                  <span className="text-[var(--accent)]">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </section>

          {/* Recent quiz results */}
          {data.quizAttempts.length > 0 && (
            <section className="glass-card rounded-2xl p-5">
              <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-4">Recent Quiz Results</h3>
              <div className="space-y-3">
                {data.quizAttempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {attempt.quiz.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {formatDate(attempt.completedAt)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ml-2 ${
                      attempt.passed
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {Math.round(attempt.score)}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Certificates */}
          {data.certificates.length > 0 && (
            <section className="glass-card rounded-2xl p-5">
              <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-4">Certificates</h3>
              <div className="space-y-3">
                {data.certificates.map((cert) => (
                  <div key={cert.id} className="flex items-start gap-3">
                    <FiAward className="text-[var(--accent)] flex-shrink-0 mt-0.5" size={14} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">{cert.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatDate(cert.issuedAt)}</p>
                    </div>
                    {cert.certificateUrl && (
                      <a
                        href={cert.certificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] flex-shrink-0"
                      >
                        Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

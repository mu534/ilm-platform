import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { prisma } from "../lib/prism";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "../utils/api";
import {
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiAward,
  FiBookmark,
  FiPlay,
  FiArrowRight,
  FiActivity,
  FiTrendingUp,
  FiCompass,
} from "react-icons/fi";
import { GiStarFormation } from "react-icons/gi";
import type { SessionUser } from "../types/auth.types";
import { getProfileCompletion } from "../lib/profileCompletion";

export const metadata = { title: "Student Dashboard | Ilm Platform" };

async function getDashboardData(userId: string) {
  const [
    enrollments,
    recentProgress,
    bookmarksCount,
    certificates,
    quizAttempts,
    profile,
    scholarApplication,
  ] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 12,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnailUrl: true,
            difficulty: true,
            scholar: {
              select: {
                user: { select: { name: true } },
              },
            },
            modules: {
              orderBy: { order: "asc" },
              select: {
                lectures: {
                  orderBy: { order: "asc" },
                  where: { published: true },
                  select: { id: true, title: true, slug: true },
                },
              },
            },
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
            id: true,
            title: true,
            slug: true,
            type: true,
            thumbnailUrl: true,
            module: {
              select: {
                id: true,
                title: true,
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
      take: 4,
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
    prisma.user.findUnique({ where: { id: userId }, select: { image: true, country: true, bio: true, learnerProfile: { select: { city: true, occupation: true, preferredLanguage: true, interests: { select: { id: true } }, goals: { select: { id: true } } } } } }),
    prisma.scholarApplication.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { status: true, updatedAt: true } }),
  ]);

  const active = enrollments.filter((e) => e.status === "ACTIVE");
  const completed = enrollments.filter((e) => e.status === "COMPLETED");

  // Compute next lecture per active course
  const allLectureIds = active.flatMap((e) =>
    e.course.modules.flatMap((m) => m.lectures.map((l) => l.id))
  );

  const completedLectures =
    allLectureIds.length > 0
      ? await prisma.lectureProgress.findMany({
          where: { userId, lectureId: { in: allLectureIds }, completed: true },
          select: { lectureId: true },
        })
      : [];
  const completedSet = new Set(completedLectures.map((p) => p.lectureId));

  // Map of courseId -> { slug, title } for next lecture
  const nextLectureMap = new Map<string, { slug: string; title: string }>();
  for (const enrollment of active) {
    const lectures = enrollment.course.modules.flatMap((m) => m.lectures);
    const next = lectures.find((l) => !completedSet.has(l.id)) ?? lectures[0];
    if (next) {
      nextLectureMap.set(enrollment.course.id, { slug: next.slug, title: next.title });
    }
  }

  const totalTime = await prisma.lectureProgress.aggregate({
    where: { userId },
    _sum: { watchedSeconds: true },
  });

  return {
    enrollments,
    active,
    completed,
    recentProgress,
    bookmarksCount,
    certificates,
    quizAttempts,
    totalWatchedSeconds: totalTime._sum.watchedSeconds ?? 0,
    nextLectureMap,
    profileCompletion: profile ? getProfileCompletion(profile) : { percentage: 0, missing: ["Profile details"] },
    scholarApplication,
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

  // Identify top course to continue
  const topActive = data.active[0];
  const topNextLecture = topActive ? data.nextLectureMap.get(topActive.course.id) : null;

  const statsCards = [
    {
      icon: <FiBookOpen className="text-[var(--accent)]" size={20} />,
      label: "Enrolled Courses",
      value: data.enrollments.length,
      subtext: `${data.active.length} active`,
    },
    {
      icon: <FiCheckCircle className="text-emerald-400" size={20} />,
      label: "Completed",
      value: data.completed.length,
      subtext: "Finished courses",
    },
    {
      icon: <FiAward className="text-purple-400" size={20} />,
      label: "Certificates",
      value: data.certificates.length,
      subtext: "Earned credentials",
    },
    {
      icon: <FiClock className="text-blue-400" size={20} />,
      label: "Watch Time",
      value: formatWatchTime(data.totalWatchedSeconds),
      subtext: "Total learning time",
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-card)] to-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-dim)] rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-strong)] bg-[var(--accent-dim)] text-xs text-[var(--accent)] font-semibold mb-2">
            <GiStarFormation size={12} />
            <span>Islamic Knowledge Portal</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)]">
            Welcome back, {user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl leading-relaxed">
            Knowledge is a light that guides your path. Continue seeking authentic learning today.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/my-courses"
            className="btn-primary px-5 py-2.5 text-xs sm:text-sm rounded-xl font-semibold inline-flex items-center gap-2 shadow-sm"
          >
            <FiBookOpen size={16} /> My Courses
          </Link>
          <Link
            href="/courses"
            className="btn-secondary px-5 py-2.5 text-xs sm:text-sm rounded-xl font-medium inline-flex items-center gap-2"
          >
            <FiArrowRight size={16} /> Explore More
          </Link>
        </div>
      </div>

      {/* ── Top Priority Card: Continue Learning Hero Card ── */}
      {topActive && (
        <section className="glass-card gold-border rounded-3xl p-6 sm:p-8 relative overflow-hidden bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-secondary)]">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-full md:w-56 aspect-[16/10] rounded-2xl overflow-hidden bg-[var(--bg-secondary)] flex-shrink-0 border border-[var(--border)] shadow-md">
              {topActive.course.thumbnailUrl ? (
                <Image
                  src={topActive.course.thumbnailUrl}
                  alt={topActive.course.title}
                  fill
                  sizes="224px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">
                  📖
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                <span className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
                  In Progress
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-3 w-full">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--accent)] font-semibold tracking-wider uppercase">
                  Primary Course
                </span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {topActive.course.scholar?.user.name ?? "Scholar"}
                </span>
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-snug line-clamp-2">
                {topActive.course.title}
              </h2>

              {topNextLecture && (
                <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                  <FiPlay className="text-[var(--accent)] flex-shrink-0" size={13} />
                  <span>Next: <strong className="text-[var(--text-primary)]">{topNextLecture.title}</strong></span>
                </p>
              )}

              {/* Progress bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs font-semibold text-[var(--text-secondary)]">
                  <span>Course Completion</span>
                  <span className="text-[var(--accent)]">{Math.round(topActive.progress)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border-subtle)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, topActive.progress))}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 w-full md:w-auto">
              <Link
                href={
                  topNextLecture
                    ? `/courses/${topActive.course.slug}/learn/${topNextLecture.slug}`
                    : `/courses/${topActive.course.slug}`
                }
                className="w-full md:w-auto btn-primary px-6 py-3.5 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2.5 shadow-lg shadow-gold-600/20 hover:scale-105 transition-all"
              >
                <FiPlay size={16} /> Continue Learning
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Stats Summary Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-3 border border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">{stat.label}</span>
              <div className="p-2 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-subtle)]">
                {stat.icon}
              </div>
            </div>
            <div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                {stat.value}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{stat.subtext}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Two Column Content Area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Enrolled Courses */}
        <div className="lg:col-span-2 space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FiBookOpen className="text-[var(--accent)]" size={20} />
                My Enrolled Courses
              </h2>
              <Link
                href="/dashboard/my-courses"
                className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-light)] flex items-center gap-1 transition-colors"
              >
                View All ({data.enrollments.length}) <FiArrowRight size={12} />
              </Link>
            </div>

            {data.active.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.active.slice(0, 4).map((enrollment) => {
                  const nextInfo = data.nextLectureMap.get(enrollment.course.id);
                  const href = nextInfo
                    ? `/courses/${enrollment.course.slug}/learn/${nextInfo.slug}`
                    : `/courses/${enrollment.course.slug}`;

                  return (
                    <div
                      key={enrollment.id}
                      className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden hover:border-[var(--border-strong)] hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div className="relative aspect-[16/10] bg-[var(--bg-secondary)] overflow-hidden">
                        {enrollment.course.thumbnailUrl ? (
                          <Image
                            src={enrollment.course.thumbnailUrl}
                            alt={enrollment.course.title}
                            fill
                            sizes="300px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">
                            📖
                          </div>
                        )}
                        <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                          {enrollment.course.difficulty}
                        </span>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <p className="text-[11px] text-[var(--text-muted)] truncate mb-1">
                            {enrollment.course.scholar?.user.name ?? "Scholar"}
                          </p>
                          <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                            {enrollment.course.title}
                          </h3>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                          <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                            <span>Progress</span>
                            <span className="font-semibold text-[var(--accent)]">
                              {Math.round(enrollment.progress)}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[var(--accent)]"
                              style={{ width: `${Math.min(100, Math.max(5, enrollment.progress))}%` }}
                            />
                          </div>

                          <Link
                            href={href}
                            className="w-full mt-2 py-2 px-3 rounded-xl bg-[var(--accent-dim)] hover:bg-[var(--accent)] hover:text-white text-[var(--accent)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                          >
                            <FiPlay size={12} />
                            <span>{nextInfo ? "Continue Learning" : "View Course"}</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-8 text-center space-y-4">
                <FiBookOpen className="text-[var(--text-muted)] text-4xl mx-auto opacity-40" />
                <div>
                  <p className="text-[var(--text-primary)] font-semibold text-base">
                    No active courses
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Explore authentic courses to start your learning journey.
                  </p>
                </div>
                <Link
                  href="/courses"
                  className="btn-primary px-5 py-2.5 text-xs font-semibold rounded-xl inline-flex items-center gap-2"
                >
                  <FiCompass size={14} /> Browse Courses
                </Link>
              </div>
            )}
          </section>

          {/* Recent Lectures Watched */}
          {data.recentProgress.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FiClock className="text-[var(--accent)]" size={18} />
                Recent Learning Activity
              </h2>
              <div className="glass-card rounded-2xl p-2 divide-y divide-[var(--border)] border border-[var(--border)]">
                {data.recentProgress.map((p) => (
                  <Link
                    key={p.id}
                    href={`/courses/${p.lecture.module?.course?.slug ?? ""}/learn/${p.lecture.slug}`}
                    className="flex items-center gap-4 p-3 hover:bg-[var(--accent-dim)] rounded-xl transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] flex-shrink-0">
                      <FiPlay size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                        {p.lecture.title}
                      </p>
                      {p.lecture.module?.course && (
                        <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                          {p.lecture.module.course.title}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] text-[var(--text-muted)] block">
                        {formatDate(p.lastViewedAt)}
                      </span>
                      {p.completed && (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1 mt-0.5">
                          <FiCheckCircle size={10} /> Completed
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column (1 Col): Quizzes, Certificates, Shortcuts */}
        <div className="space-y-6">
          <section className="glass-card rounded-2xl p-5 border border-[var(--border)] space-y-3">
            <div className="flex justify-between text-sm font-semibold"><span>Profile Completion</span><span className="text-[var(--accent)]">{data.profileCompletion.percentage}%</span></div>
            <div className="h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden"><div className="h-full bg-[var(--accent)]" style={{ width: `${data.profileCompletion.percentage}%` }} /></div>
            {data.profileCompletion.missing.length > 0 ? <><p className="text-xs text-[var(--text-muted)]">Missing: {data.profileCompletion.missing.slice(0, 3).join(", ")}</p><Link href="/settings" className="text-xs text-[var(--accent)] font-semibold">Complete profile →</Link></> : <p className="text-xs text-emerald-400">Your profile is complete.</p>}
          </section>
          {data.scholarApplication && <section className="glass-card rounded-2xl p-5 border border-[var(--border)]"><h3 className="font-semibold text-sm">Scholar Application</h3><p className="text-sm text-[var(--accent)] mt-2">{data.scholarApplication.status.replaceAll("_", " ")}</p><Link href="/scholar-application" className="text-xs text-[var(--accent)]">View application →</Link></section>}
          {/* Quick Actions Card */}
          <section className="glass-card rounded-2xl p-5 border border-[var(--border)] space-y-3">
            <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <FiTrendingUp className="text-[var(--accent)]" size={16} />
              Quick Navigation
            </h3>
            <div className="space-y-1.5">
              {[
                { href: "/dashboard/my-courses", icon: <FiBookOpen size={14} />, label: "My Learning" },
                { href: "/courses", icon: <FiCompass size={14} />, label: "Browse Catalog" },
                { href: "/dashboard/quiz-history", icon: <FiActivity size={14} />, label: "Quiz Progress" },
                { href: "/dashboard/certificates", icon: <FiAward size={14} />, label: `Certificates (${data.certificates.length})` },
                { href: "/dashboard/bookmarks", icon: <FiBookmark size={14} />, label: `Bookmarks (${data.bookmarksCount})` },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-all font-medium"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-[var(--accent)]">{link.icon}</span>
                    <span>{link.label}</span>
                  </span>
                  <FiArrowRight size={12} className="text-[var(--text-muted)]" />
                </Link>
              ))}
            </div>
          </section>

          {/* Recent Quiz Results */}
          {data.quizAttempts.length > 0 && (
            <section className="glass-card rounded-2xl p-5 border border-[var(--border)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <FiActivity className="text-[var(--accent)]" size={16} />
                  Recent Quiz Results
                </h3>
                <Link
                  href="/dashboard/quiz-history"
                  className="text-[11px] text-[var(--accent)] hover:underline"
                >
                  History
                </Link>
              </div>

              <div className="space-y-2.5">
                {data.quizAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {attempt.quiz.title}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {formatDate(attempt.completedAt)}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-bold flex-shrink-0 ml-2 ${
                        attempt.passed
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      {Math.round(attempt.score)}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Certificates Card */}
          {data.certificates.length > 0 && (
            <section className="glass-card rounded-2xl p-5 border border-[var(--border)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <FiAward className="text-purple-400" size={16} />
                  My Certificates
                </h3>
                <Link
                  href="/dashboard/certificates"
                  className="text-[11px] text-[var(--accent)] hover:underline"
                >
                  All ({data.certificates.length})
                </Link>
              </div>

              <div className="space-y-2.5">
                {data.certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {cert.course?.title ?? "Course Certificate"}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        Issued {formatDate(cert.issuedAt)}
                      </p>
                    </div>
                    <Link
                      href={`/api/certificates/${cert.id}/pdf`}
                      target="_blank"
                      className="text-xs text-[var(--accent)] hover:underline font-semibold flex-shrink-0"
                    >
                      View →
                    </Link>
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

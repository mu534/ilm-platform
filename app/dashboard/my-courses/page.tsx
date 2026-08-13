import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prism";
import Link from "next/link";
import Image from "next/image";
import {
  FiBookOpen,
  FiCheckCircle,
  FiPlay,
  FiAward,
  FiCompass,
} from "react-icons/fi";
import type { SessionUser } from "@/app/types/auth.types";

export const metadata = { title: "My Learning | Ilm Platform" };

async function getMyCoursesData(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
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
  });

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

  const nextLectureMap = new Map<string, { slug: string; title: string }>();
  for (const enrollment of active) {
    const lectures = enrollment.course.modules.flatMap((m) => m.lectures);
    const next = lectures.find((l) => !completedSet.has(l.id)) ?? lectures[0];
    if (next) {
      nextLectureMap.set(enrollment.course.id, { slug: next.slug, title: next.title });
    }
  }

  // Check certificates
  const certificates = await prisma.certificate.findMany({
    where: { userId },
    select: { courseId: true, id: true },
  });
  const certMap = new Map(certificates.map((c) => [c.courseId, c.id]));

  return {
    enrollments,
    active,
    completed,
    nextLectureMap,
    certMap,
  };
}

export default async function MyCoursesPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const { defaultLocale } = await import("@/i18n/config");
  if (!user) redirect(`/${defaultLocale}/login?callbackUrl=/${defaultLocale}/dashboard/my-courses`);

  const data = await getMyCoursesData(user.id);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            My Learning
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Manage your enrolled courses, track progress, and continue learning.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--accent)]">
            {data.enrollments.length} Enrolled Course{data.enrollments.length !== 1 ? "s" : ""}
          </div>
          <Link
            href="/courses"
            className="btn-primary px-4 py-2 text-xs font-semibold rounded-xl inline-flex items-center gap-2"
          >
            <FiCompass size={14} /> Catalog
          </Link>
        </div>
      </div>

      {/* Course List Section */}
      {data.enrollments.length > 0 ? (
        <div className="space-y-6">
          {/* Active Courses */}
          {data.active.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FiBookOpen className="text-[var(--accent)]" size={18} />
                  In Progress ({data.active.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.active.map((enrollment) => {
                  const nextInfo = data.nextLectureMap.get(enrollment.course.id);
                  const href = nextInfo
                    ? `/courses/${enrollment.course.slug}/learn/${nextInfo.slug}`
                    : `/courses/${enrollment.course.slug}`;
                  const totalLectures = enrollment.course.modules.reduce(
                    (acc, m) => acc + m.lectures.length,
                    0
                  );

                  return (
                    <div
                      key={enrollment.id}
                      className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden hover:border-[var(--border-strong)] hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
                    >
                      <div className="relative aspect-[16/10] bg-[var(--bg-secondary)] overflow-hidden">
                        {enrollment.course.thumbnailUrl ? (
                          <Image
                            src={enrollment.course.thumbnailUrl}
                            alt={enrollment.course.title}
                            fill
                            sizes="360px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">
                            📖
                          </div>
                        )}
                        <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                          {enrollment.course.difficulty}
                        </span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {enrollment.course.scholar?.user.name ?? "Scholar"}
                          </p>
                          <h3 className="font-display text-lg font-bold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                            {enrollment.course.title}
                          </h3>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                            <span>{totalLectures} Lectures</span>
                            <span className="font-bold text-[var(--accent)]">
                              {Math.round(enrollment.progress)}%
                            </span>
                          </div>

                          <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-400"
                              style={{ width: `${Math.min(100, Math.max(5, enrollment.progress))}%` }}
                            />
                          </div>

                          <Link
                            href={href}
                            className="btn-primary w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
                          >
                            <FiPlay size={14} /> Continue Learning
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Completed Courses */}
          {data.completed.length > 0 && (
            <section className="space-y-4 pt-6 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FiCheckCircle className="text-emerald-400" size={18} />
                  Completed Courses ({data.completed.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.completed.map((enrollment) => {
                  const certId = data.certMap.get(enrollment.course.id);
                  return (
                    <div
                      key={enrollment.id}
                      className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden hover:border-[var(--border-strong)] transition-all flex flex-col justify-between group"
                    >
                      <div className="relative aspect-[16/10] bg-[var(--bg-secondary)] overflow-hidden">
                        {enrollment.course.thumbnailUrl ? (
                          <Image
                            src={enrollment.course.thumbnailUrl}
                            alt={enrollment.course.title}
                            fill
                            sizes="360px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">
                            🎓
                          </div>
                        )}
                        <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white backdrop-blur-sm flex items-center gap-1">
                          <FiCheckCircle size={10} /> Completed
                        </span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {enrollment.course.scholar?.user.name ?? "Scholar"}
                          </p>
                          <h3 className="font-display text-lg font-bold text-[var(--text-primary)] leading-snug line-clamp-2">
                            {enrollment.course.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-[var(--border)]">
                          <Link
                            href={`/courses/${enrollment.course.slug}`}
                            className="flex-1 btn-secondary py-2 rounded-xl text-xs font-medium text-center"
                          >
                            Review Course
                          </Link>
                          {certId && (
                            <Link
                              href={`/api/certificates/${certId}/pdf`}
                              target="_blank"
                              className="px-3 py-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold flex items-center gap-1 hover:bg-purple-500/20 transition-all"
                            >
                              <FiAward size={13} /> Cert
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-card rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] text-2xl mx-auto">
            <FiBookOpen />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
              No enrolled courses yet
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
              You haven&apos;t started any courses. Explore our authentic catalog from qualified scholars to begin learning.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/courses"
              className="btn-primary px-6 py-3 text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center gap-2 shadow-md"
            >
              <FiCompass size={16} /> Explore Courses
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

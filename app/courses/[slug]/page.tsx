import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { EnrollButton } from "../../components/courses/EnrollButton";
import { CourseProgress } from "../../components/courses/CourseProgress";
import { CourseRatingWidget } from "../../components/courses/CourseRatingWidget";
import {
  FiCheckCircle, FiClock, FiUsers, FiStar,
  FiAward, FiChevronDown, FiLock, FiPlayCircle,
  FiFileText, FiHeadphones, FiFile,
} from "react-icons/fi";
import type { SessionUser } from "../../types/auth.types";

interface Props {
  params: Promise<{ slug: string }>;
}

// ── Data fetching ──────────────────────────────────────────────────────────────

async function getCourse(slug: string) {
  return prisma.course.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: {
      category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
      author:   { select: { id: true, name: true, image: true } },
      scholar:  { include: { user: { select: { name: true, image: true, bio: true } } } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lectures: {
            orderBy: { order: "asc" },
            where:   { published: true },
            select: {
              id: true, title: true, slug: true, type: true,
              duration: true, order: true,
            },
          },
          _count: { select: { lectures: true, quizzes: true } },
        },
      },
      _count: { select: { modules: true, enrollments: true, ratings: true } },
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDuration(min: number): string {
  if (!min) return "";
  const h = Math.floor(min / 60), m = min % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${min}m`;
}

function fmtSeconds(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? (s ? `${m}m ${s}s` : `${m}m`) : `${sec}s`;
}

const lectureIcon: Record<string, React.ReactNode> = {
  VIDEO: <FiPlayCircle  size={14} className="text-[var(--text-muted)]" />,
  TEXT:  <FiFileText    size={14} className="text-[var(--text-muted)]" />,
  AUDIO: <FiHeadphones  size={14} className="text-[var(--text-muted)]" />,
  PDF:   <FiFile        size={14} className="text-[var(--text-muted)]" />,
};

const difficultyLabel: Record<string, string> = {
  BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced",
};

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const course    = await getCourse(slug);
  if (!course) return { title: "Course Not Found" };
  return {
    title:       course.seoTitle       ?? course.title,
    description: course.seoDescription ?? course.description.slice(0, 160),
    openGraph:   {
      title:       course.seoTitle ?? course.title,
      description: course.seoDescription ?? course.description.slice(0, 160),
      images:      course.thumbnailUrl ? [course.thumbnailUrl] : [],
    },
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function CourseDetailPage({ params }: Props) {
  const { slug }          = await params;
  const [course, session] = await Promise.all([getCourse(slug), getServerSession(authOptions)]);

  if (!course || (!course.published && session?.user?.role !== "ADMIN")) notFound();

  const user       = session?.user as SessionUser | undefined;
  const enrollment = user
    ? await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      })
    : null;

  // Pre-fetch next lecture server-side
  let nextLectureSlug: string | null = null;
  if (enrollment && enrollment.status !== "COMPLETED" && user) {
    const allLectures = course.modules.flatMap((m) => m.lectures.map((l) => ({ id: l.id, slug: l.slug })));
    if (allLectures.length > 0) {
      const done = await prisma.lectureProgress.findMany({
        where:  { userId: user.id, lectureId: { in: allLectures.map((l) => l.id) }, completed: true },
        select: { lectureId: true },
      });
      const doneSet      = new Set(done.map((p) => p.lectureId));
      const next         = allLectures.find((l) => !doneSet.has(l.id)) ?? allLectures[0];
      nextLectureSlug    = next?.slug ?? null;
    }
  }

  const ratingAgg     = await prisma.courseRating.aggregate({
    where:  { courseId: course.id },
    _avg:   { rating: true },
    _count: { rating: true },
  });

  const avgRating     = ratingAgg._avg.rating ?? 0;
  const totalRatings  = ratingAgg._count.rating;
  const totalLectures = course.modules.reduce((s, m) => s + m._count.lectures, 0);
  const instructor    = course.scholar?.user.name ?? course.author.name;
  const instructorImg = course.scholar?.user.image ?? course.author.image;
  const canAccess     = !!enrollment || user?.role === "ADMIN" || user?.role === "SCHOLAR";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* ── Course header — full-width dark band (Udacity-style) ── */}
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="max-w-3xl">

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-5">
              <Link href="/courses" className="hover:text-[var(--accent)] transition-colors">Courses</Link>
              {course.category && (
                <>
                  <span>/</span>
                  <Link
                    href={`/courses?categoryId=${course.category.id}`}
                    className="hover:text-[var(--accent)] transition-colors"
                  >
                    {course.category.name}
                  </Link>
                </>
              )}
            </nav>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] leading-tight mb-2">
              {course.title}
            </h1>

            {/* Subtitle */}
            {course.subtitle && (
              <p className="text-base text-[var(--text-secondary)] mb-3">
                {course.subtitle}
              </p>
            )}

            {/* Description — truncated */}
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-5 line-clamp-3">
              {course.description}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
              {avgRating > 0 && (
                <span className="flex items-center gap-1 text-[var(--accent)] font-medium">
                  <FiStar size={14} className="fill-current" />
                  {avgRating.toFixed(1)}
                  <span className="text-[var(--text-muted)] font-normal ml-0.5">
                    ({totalRatings.toLocaleString()})
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <FiUsers size={13} />
                {course._count.enrollments.toLocaleString()} students
              </span>
              {course.estimatedDuration > 0 && (
                <span className="flex items-center gap-1">
                  <FiClock size={13} />
                  {fmtDuration(course.estimatedDuration)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FiAward size={13} />
                {difficultyLabel[course.difficulty] ?? course.difficulty}
              </span>
            </div>

            {/* Instructor line */}
            <p className="text-xs text-[var(--text-muted)] mt-3">
              Taught by{" "}
              {course.scholar ? (
                <Link href={`/scholars/${course.scholar.id}`} className="text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
                  {instructor}
                </Link>
              ) : (
                <span>{instructor}</span>
              )}
              {course.scholar?.verified && (
                <span className="ml-1.5 text-emerald-400 text-xs">✓ Verified</span>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── Left column: course content ── */}
          <div className="flex-1 min-w-0 order-2 lg:order-1">

            {/* What you'll learn */}
            {course.objectives.length > 0 && (
              <section className="mb-10">
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4 pb-2 border-b border-[var(--border)]">
                  What You&apos;ll Learn
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {course.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                      <FiCheckCircle className="text-[var(--accent)] flex-shrink-0 mt-0.5" size={14} />
                      {obj}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Prerequisites */}
            {course.prerequisites.length > 0 && (
              <section className="mb-10">
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4 pb-2 border-b border-[var(--border)]">
                  Requirements
                </h2>
                <ul className="space-y-2">
                  {course.prerequisites.map((p, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                      <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] flex-shrink-0 mt-2" />
                      {p}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Curriculum */}
            <section className="mb-10">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] mb-4">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Course Content
                </h2>
                <span className="text-xs text-[var(--text-muted)]">
                  {course.modules.length} section{course.modules.length !== 1 ? "s" : ""} · {totalLectures} lesson{totalLectures !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="border border-[var(--border)] rounded-lg overflow-hidden divide-y divide-[var(--border)]">
                {course.modules.map((module, modIdx) => (
                  <details key={module.id} className="group" open={modIdx === 0}>
                    {/* Section header */}
                    <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors list-none">
                      <div className="flex items-center gap-3">
                        <FiChevronDown
                          className="text-[var(--text-muted)] group-open:rotate-180 transition-transform flex-shrink-0"
                          size={15}
                        />
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {module.title}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-3">
                        {module._count.lectures} lesson{module._count.lectures !== 1 ? "s" : ""}
                        {module._count.quizzes > 0 && ` · ${module._count.quizzes} quiz`}
                      </span>
                    </summary>

                    {/* Lesson list */}
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {module.lectures.map((lecture) => (
                        <div key={lecture.id} className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)]">
                          <span className="flex-shrink-0 text-[var(--text-muted)]">
                            {lectureIcon[lecture.type] ?? lectureIcon.TEXT}
                          </span>

                          <span className="flex-1 text-sm text-[var(--text-secondary)] min-w-0">
                            {canAccess ? (
                              <Link
                                href={`/lectures/${lecture.slug}`}
                                className="hover:text-[var(--accent)] transition-colors line-clamp-1"
                              >
                                {lecture.title}
                              </Link>
                            ) : (
                              <span className="line-clamp-1">{lecture.title}</span>
                            )}
                          </span>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!canAccess && (
                              <FiLock size={11} className="text-[var(--text-muted)]" />
                            )}
                            {lecture.duration && lecture.duration > 0 && (
                              <span className="text-xs text-[var(--text-muted)] tabular-nums">
                                {fmtSeconds(lecture.duration)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {/* Instructor section */}
            <section className="mb-10">
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4 pb-2 border-b border-[var(--border)]">
                Your Instructor
              </h2>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-[var(--border)] flex-shrink-0 bg-[var(--bg-secondary)]">
                  {instructorImg ? (
                    <Image src={instructorImg} alt={instructor} width={56} height={56} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] font-semibold text-lg">
                      {instructor[0]}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={course.scholar ? `/scholars/${course.scholar.id}` : "#"}
                      className="text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
                    >
                      {instructor}
                    </Link>
                    {course.scholar?.verified && (
                      <span className="text-xs text-emerald-400">✓ Verified</span>
                    )}
                  </div>
                  {course.scholar?.user.bio && (
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-3">
                      {course.scholar.user.bio}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Ratings */}
            <CourseRatingWidget courseId={course.id} isEnrolled={!!enrollment} />
          </div>

          {/* ── Right column: sticky enrollment card ── */}
          <div className="lg:w-80 flex-shrink-0 order-1 lg:order-2">
            <div className="lg:sticky lg:top-20">

              {/* Course thumbnail */}
              {course.thumbnailUrl && (
                <div className="relative aspect-video rounded-xl overflow-hidden mb-4 border border-[var(--border)]">
                  <Image
                    src={course.thumbnailUrl}
                    alt={course.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}

              {/* Enrollment card */}
              <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
                <div className="p-5">
                  {/* Free badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xl font-bold text-[var(--text-primary)]">Free</span>
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                      Open Enrollment
                    </span>
                  </div>

                  {enrollment ? (
                    <CourseProgress
                      enrollment={{
                        status:      enrollment.status,
                        progress:    enrollment.progress,
                        completedAt: enrollment.completedAt?.toISOString() ?? null,
                      }}
                      courseId={course.id}
                      courseSlug={course.slug}
                      nextLectureSlug={nextLectureSlug}
                    />
                  ) : (
                    <EnrollButton
                      courseId={course.id}
                      courseSlug={course.slug}
                      isLoggedIn={!!user}
                    />
                  )}
                </div>

                {/* Course meta */}
                <div className="border-t border-[var(--border)] px-5 py-4 space-y-2.5 text-sm">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    This course includes
                  </p>
                  {[
                    { icon: <FiFileText size={14} />,  label: `${totalLectures} lesson${totalLectures !== 1 ? "s" : ""}` },
                    { icon: <FiClock size={14} />,     label: course.estimatedDuration > 0 ? fmtDuration(course.estimatedDuration) + " of content" : null },
                    { icon: <FiAward size={14} />,     label: difficultyLabel[course.difficulty] + " level" },
                    { icon: <FiUsers size={14} />,     label: course._count.enrollments.toLocaleString() + " enrolled" },
                    course.language && course.language !== "en"
                      ? { icon: <span className="text-xs">🌐</span>, label: course.language.toUpperCase() }
                      : null,
                  ].filter(Boolean).map((item, i) => item && item.label && (
                    <div key={i} className="flex items-center gap-2.5 text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)] flex-shrink-0">{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {course.tags && course.tags.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-[var(--text-muted)] mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {course.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/courses?search=${encodeURIComponent(tag)}`}
                        className="text-xs px-2.5 py-1 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

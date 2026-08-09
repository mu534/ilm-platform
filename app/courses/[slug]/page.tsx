import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { EnrollButton } from "../../components/courses/EnrollButton";
import { CourseProgress } from "../../components/courses/CourseProgress";
import { CourseRatingWidget } from "../../components/courses/CourseRatingWidget";
import { CourseDetailTabs } from "../../components/courses/CourseDetailTabs";
import {
  FiCheckCircle, FiClock, FiUsers, FiStar,
  FiAward, FiChevronRight, FiLock, FiPlayCircle,
  FiFileText, FiHeadphones, FiFile, FiBookOpen,
} from "react-icons/fi";
import type { SessionUser } from "../../types/auth.types";

interface Props {
  params: Promise<{ slug: string }>;
}

// ── Data fetching ─────────────────────────────────────────────────────────────

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
            select:  { id: true, title: true, slug: true, type: true, duration: true, order: true },
          },
          _count: { select: { lectures: true, quizzes: true } },
        },
      },
      _count: { select: { modules: true, enrollments: true, ratings: true } },
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(min: number): string {
  if (!min) return "";
  const h = Math.floor(min / 60), m = min % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${min}m`;
}

function fmtSeconds(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? (s ? `${m}m ${s}s` : `${m}m`) : `${sec}s`;
}

const lectureTypeConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  VIDEO: { icon: <FiPlayCircle  size={13} />, label: "Video"   },
  TEXT:  { icon: <FiFileText    size={13} />, label: "Article" },
  AUDIO: { icon: <FiHeadphones  size={13} />, label: "Audio"   },
  PDF:   { icon: <FiFile        size={13} />, label: "PDF"     },
};

const difficultyLabel: Record<string, string> = {
  BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced",
};

// ── Metadata ──────────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

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
  // For active students: find the next uncompleted lecture.
  // For completed students: point to the first lecture so they can review content.
  if (enrollment && user) {
    const allLectures = course.modules.flatMap((m) => m.lectures.map((l) => ({ id: l.id, slug: l.slug })));
    if (allLectures.length > 0) {
      if (enrollment.status === "COMPLETED") {
        // Completed — go back to the first lecture for review
        nextLectureSlug = allLectures[0]?.slug ?? null;
      } else {
        const done = await prisma.lectureProgress.findMany({
          where:  { userId: user.id, lectureId: { in: allLectures.map((l) => l.id) }, completed: true },
          select: { lectureId: true },
        });
        const doneSet   = new Set(done.map((p) => p.lectureId));
        const next      = allLectures.find((l) => !doneSet.has(l.id)) ?? allLectures[0];
        nextLectureSlug = next?.slug ?? null;
      }
    }
  }

  const ratingAgg = await prisma.courseRating.aggregate({
    where: { courseId: course.id },
    _avg:  { rating: true },
    _count: { rating: true },
  });

  const avgRating     = ratingAgg._avg.rating ?? 0;
  const totalRatings  = ratingAgg._count.rating;
  const totalLectures = course.modules.reduce((s, m) => s + m._count.lectures, 0);
  const totalModules  = course.modules.length;
  const instructor    = course.scholar?.user.name ?? course.author.name;
  const instructorImg = course.scholar?.user.image ?? course.author.image;
  const canAccess     = !!enrollment || user?.role === "ADMIN" || user?.role === "SCHOLAR";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* ── Hero header band ─────────────────────────────────────────────── */}
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-6">
            <Link href="/courses" className="hover:text-[var(--accent)] transition-colors">Courses</Link>
            {course.category && (
              <>
                <FiChevronRight size={11} />
                <Link
                  href={`/courses?categoryId=${course.category.id}`}
                  className="hover:text-[var(--accent)] transition-colors"
                >
                  {course.category.name}
                </Link>
              </>
            )}
            <FiChevronRight size={11} />
            <span className="text-[var(--text-secondary)] truncate max-w-[220px]">{course.title}</span>
          </nav>

          <div className="max-w-3xl">
            {/* Title */}
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] leading-tight mb-3">
              {course.title}
            </h1>

            {/* Subtitle */}
            {course.subtitle && (
              <p className="text-lg text-[var(--text-secondary)] mb-4 leading-relaxed">
                {course.subtitle}
              </p>
            )}

            {/* Description */}
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6 line-clamp-3">
              {course.description}
            </p>

            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {avgRating > 0 && (
                <span className="flex items-center gap-1.5 text-[var(--accent)] font-semibold">
                  <FiStar size={14} className="fill-current" />
                  {avgRating.toFixed(1)}
                  <span className="text-[var(--text-muted)] font-normal text-xs">
                    ({totalRatings.toLocaleString()} review{totalRatings !== 1 ? "s" : ""})
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
                <FiUsers size={12} />
                {course._count.enrollments.toLocaleString()} enrolled
              </span>
              {course.estimatedDuration > 0 && (
                <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
                  <FiClock size={12} />
                  {fmtDuration(course.estimatedDuration)}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
                <FiAward size={12} />
                {difficultyLabel[course.difficulty] ?? course.difficulty}
              </span>
              <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
                <FiBookOpen size={12} />
                {totalLectures} lesson{totalLectures !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Instructor attribution */}
            <div className="flex items-center gap-2.5 mt-5">
              <div className="w-7 h-7 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--bg-secondary)] flex-shrink-0">
                {instructorImg ? (
                  <Image src={instructorImg} alt={instructor} width={28} height={28} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs font-semibold">
                    {instructor[0]}
                  </div>
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                Created by{" "}
                {course.scholar ? (
                  <Link href={`/scholars/${course.scholar.id}`} className="text-[var(--accent)] hover:underline">
                    {instructor}
                  </Link>
                ) : (
                  <span className="text-[var(--text-secondary)]">{instructor}</span>
                )}
                {course.scholar?.verified && (
                  <span className="ml-1.5 text-emerald-400">✓ Verified Scholar</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Program info stat strip (Udacity "at a glance" bar) ──────────── */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap divide-x divide-[var(--border)]">
            {[
              { label: "Skill Level", value: difficultyLabel[course.difficulty] ?? course.difficulty },
              { label: "Duration",    value: course.estimatedDuration > 0 ? fmtDuration(course.estimatedDuration) : "Self-paced" },
              { label: "Lessons",     value: `${totalLectures}` },
              { label: "Sections",    value: `${totalModules}` },
              { label: "Language",    value: course.language.toUpperCase() },
            ].map((stat) => (
              <div key={stat.label} className="px-5 first:pl-0 last:border-r-0">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1">
                  {stat.label}
                </p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* ── Left: course body — Udacity-style tabbed program page ──────── */}
          <div className="flex-1 min-w-0 order-2 lg:order-1">
            <CourseDetailTabs
              tabs={[
                {
                  id:    "overview",
                  label: "Overview",
                  content: (
                    <div>
                      {/* Skills you'll gain */}
                      {course.tags.length > 0 && (
                        <section className="mb-10" aria-labelledby="skills-heading">
                          <h2 id="skills-heading" className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                            Skills You&apos;ll Gain
                          </h2>
                          <div className="flex flex-wrap gap-2">
                            {course.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-subtle)]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* What you'll learn */}
                      {course.objectives.length > 0 && (
                        <section className="mb-10" aria-labelledby="objectives-heading">
                          <h2
                            id="objectives-heading"
                            className="text-lg font-semibold text-[var(--text-primary)] mb-5"
                          >
                            What You&apos;ll Learn
                          </h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 p-5 border border-[var(--border)] rounded-xl bg-[var(--bg-card)]">
                            {course.objectives.map((obj, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <FiCheckCircle
                                  className="text-[var(--accent)] flex-shrink-0 mt-0.5"
                                  size={14}
                                  aria-hidden="true"
                                />
                                <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{obj}</span>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Prerequisites */}
                      {course.prerequisites.length > 0 && (
                        <section className="mb-2" aria-labelledby="prereqs-heading">
                          <h2 id="prereqs-heading" className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                            Requirements
                          </h2>
                          <ul className="space-y-2.5">
                            {course.prerequisites.map((p, i) => (
                              <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0 mt-1.5" aria-hidden="true" />
                                {p}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </div>
                  ),
                },
                {
                  id:    "curriculum",
                  label: "Syllabus",
                  count: totalModules,
                  content: (
                    <section aria-labelledby="curriculum-heading">
                      <div className="flex items-center justify-between mb-5">
                        <h2 id="curriculum-heading" className="text-lg font-semibold text-[var(--text-primary)]">
                          Course Curriculum
                        </h2>
                        <span className="text-xs text-[var(--text-muted)] tabular-nums">
                          {totalModules} section{totalModules !== 1 ? "s" : ""} · {totalLectures} lesson{totalLectures !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {course.modules.length === 0 ? (
                        <div className="border border-[var(--border)] rounded-xl p-8 text-center">
                          <FiBookOpen className="text-[var(--text-muted)] text-2xl mx-auto mb-2" />
                          <p className="text-sm text-[var(--text-muted)]">Curriculum is being prepared.</p>
                        </div>
                      ) : (
                        <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
                          {course.modules.map((module, modIdx) => (
                            <CurriculumSection
                              key={module.id}
                              module={module}
                              modIdx={modIdx}
                              canAccess={canAccess}
                              courseSlug={course.slug}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  ),
                },
                {
                  id:    "instructor",
                  label: "Instructor",
                  content: (
                    <section aria-labelledby="instructor-heading">
                      <h2 id="instructor-heading" className="text-lg font-semibold text-[var(--text-primary)] mb-5">
                        About the Instructor
                      </h2>
                      <div className="flex items-start gap-5 p-5 border border-[var(--border)] rounded-xl bg-[var(--bg-card)]">
                        <div className="w-16 h-16 rounded-full overflow-hidden border border-[var(--border)] flex-shrink-0 bg-[var(--bg-secondary)]">
                          {instructorImg ? (
                            <Image src={instructorImg} alt={instructor} width={64} height={64} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] font-semibold text-xl">
                              {instructor[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {course.scholar ? (
                              <Link
                                href={`/scholars/${course.scholar.id}`}
                                className="text-base font-semibold text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
                              >
                                {instructor}
                              </Link>
                            ) : (
                              <span className="text-base font-semibold text-[var(--text-primary)]">{instructor}</span>
                            )}
                            {course.scholar?.verified && (
                              <span className="text-xs text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                          {(course.scholar?.user.bio ?? course.author.image) && (
                            <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-4">
                              {course.scholar?.user.bio ?? ""}
                            </p>
                          )}
                          {course.scholar && (
                            <Link
                              href={`/scholars/${course.scholar.id}`}
                              className="inline-flex items-center gap-1.5 mt-3 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
                            >
                              View full profile →
                            </Link>
                          )}
                        </div>
                      </div>
                    </section>
                  ),
                },
                {
                  id:    "reviews",
                  label: "Reviews",
                  count: totalRatings,
                  content: <CourseRatingWidget
                    courseId={course.id}
                    isEnrolled={!!enrollment}
                    isCompleted={enrollment?.status === "COMPLETED"}
                  />,
                },
              ]}
            />
          </div>

          {/* ── Right: sticky enrollment card ────────────────────────────── */}
          <aside className="lg:w-80 flex-shrink-0 order-1 lg:order-2" aria-label="Course enrollment">
            <div className="lg:sticky lg:top-20 space-y-4">

              {/* Thumbnail */}
              {course.thumbnailUrl && (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border)]">
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
                <div className="p-5 border-b border-[var(--border)]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-[var(--text-primary)]">
                      {course.enrollmentType === "PAID" && course.price > 0
                        ? new Intl.NumberFormat("en-US", { style: "currency", currency: course.currency.toUpperCase() }).format(course.price / 100)
                        : "Free"}
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      course.enrollmentType === "PAID" && course.price > 0
                        ? "text-[var(--accent)] bg-[var(--accent-dim)] border-[var(--border-subtle)]"
                        : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    }`}>
                      {course.enrollmentType === "PAID" && course.price > 0 ? "One-time payment" : "Open Enrollment"}
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
                      isPaid={course.enrollmentType === "PAID" && course.price > 0}
                      price={course.price}
                      currency={course.currency}
                    />
                  )}
                </div>

                {/* Includes list */}
                <div className="px-5 py-4 space-y-2.5">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                    This course includes
                  </p>
                  {[
                    totalLectures > 0 && { icon: <FiFileText size={13} />,  text: `${totalLectures} lesson${totalLectures !== 1 ? "s" : ""}` },
                    course.estimatedDuration > 0 && { icon: <FiClock size={13} />, text: `${fmtDuration(course.estimatedDuration)} of content` },
                    { icon: <FiAward size={13} />, text: `${difficultyLabel[course.difficulty] ?? course.difficulty} level` },
                    { icon: <FiUsers size={13} />, text: `${course._count.enrollments.toLocaleString()} enrolled` },
                    course.language && course.language !== "en"
                      ? { icon: <span className="text-xs leading-none">🌐</span>, text: course.language.toUpperCase() }
                      : null,
                  ].filter(Boolean).map((item, i) => item && (
                    <div key={i} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)] flex-shrink-0">{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {course.tags && course.tags.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2.5">
                    Topics
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {course.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/courses?search=${encodeURIComponent(tag)}`}
                        className="text-xs px-2.5 py-1 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── Curriculum Section (details/summary accordion) ───────────────────────────

interface CurriculumSectionProps {
  module: {
    id:          string;
    title:       string;
    description: string | null;
    lectures:    {
      id:       string;
      title:    string;
      slug:     string;
      type:     string;
      duration: number | null;
      order:    number;
    }[];
    _count: { lectures: number; quizzes: number };
  };
  modIdx:     number;
  canAccess:  boolean;
  courseSlug: string;
}

function CurriculumSection({ module, modIdx, canAccess, courseSlug }: CurriculumSectionProps) {
  return (
    <details className="group" open={modIdx === 0}>

      {/* Section header */}
      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none list-none bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          {/* Chevron */}
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-[var(--text-muted)] group-open:rotate-90 transition-transform duration-200"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>

          <div className="min-w-0">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
              Section {modIdx + 1}
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1">
              {module.title}
            </span>
          </div>
        </div>

        <span className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-4 tabular-nums">
          {module._count.lectures} lesson{module._count.lectures !== 1 ? "s" : ""}
          {module._count.quizzes > 0 && (
            <span className="ml-1.5 text-[var(--accent)]">· {module._count.quizzes} quiz</span>
          )}
        </span>
      </summary>

      {/* Lesson rows */}
      {module.lectures.length > 0 && (
        <div className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-card)]">
          {module.lectures.map((lecture, lIdx) => {
            const typeConf = lectureTypeConfig[lecture.type] ?? lectureTypeConfig.TEXT;
            return (
              <div
                key={lecture.id}
                className="flex items-center gap-3 px-5 py-3 group/row hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                {/* Lesson number */}
                <span className="text-[11px] text-[var(--text-muted)] tabular-nums w-5 flex-shrink-0 text-right">
                  {lIdx + 1}
                </span>

                {/* Type icon */}
                <span className="text-[var(--text-muted)] flex-shrink-0" aria-label={typeConf.label}>
                  {typeConf.icon}
                </span>

                {/* Title */}
                <span className="flex-1 text-sm text-[var(--text-secondary)] min-w-0">
                  {canAccess ? (
                    <Link
                      href={`/lectures/${lecture.slug}`}
                      className="hover:text-[var(--accent)] transition-colors line-clamp-1 focus-visible:underline"
                    >
                      {lecture.title}
                    </Link>
                  ) : (
                    <span className="line-clamp-1">{lecture.title}</span>
                  )}
                </span>

                {/* Duration + lock */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {lecture.duration && lecture.duration > 0 && (
                    <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                      {fmtSeconds(lecture.duration)}
                    </span>
                  )}
                  {!canAccess ? (
                    <FiLock size={11} className="text-[var(--text-muted)]" aria-label="Locked" />
                  ) : (
                    <FiPlayCircle
                      size={11}
                      className="text-[var(--accent)] opacity-0 group-hover/row:opacity-100 transition-opacity"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </details>
  );
}

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
  FiBookOpen, FiUsers, FiStar, FiClock,
  FiAward, FiCheckCircle, FiChevronDown,
} from "react-icons/fi";
import type { SessionUser } from "../../types/auth.types";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getCourse(slug: string) {
  return prisma.course.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: {
      category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
      author:   { select: { id: true, name: true, image: true } },
      scholar:  {
        include: { user: { select: { name: true, image: true } } },
      },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lectures: {
            orderBy: { order: "asc" },
            where: { published: true },
            select: {
              id: true, title: true, slug: true, type: true,
              duration: true, thumbnailUrl: true,
            },
          },
          _count: { select: { lectures: true, quizzes: true } },
        },
      },
      _count: { select: { modules: true, enrollments: true, ratings: true } },
    },
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} hours`;
}

function formatLectureDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) return { title: "Course Not Found" };
  return {
    title: course.title,
    description: course.description.slice(0, 160),
    openGraph: { images: course.thumbnailUrl ? [course.thumbnailUrl] : [] },
  };
}

const difficultyLabel: Record<string, string> = {
  BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced",
};

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const [course, session] = await Promise.all([
    getCourse(slug),
    getServerSession(authOptions),
  ]);

  if (!course || (!course.published && session?.user?.role !== "ADMIN")) {
    notFound();
  }

  const user = session?.user as SessionUser | undefined;

  // Check enrollment
  const enrollment = user
    ? await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      })
    : null;

  // Rating aggregate
  const ratingAgg = await prisma.courseRating.aggregate({
    where: { courseId: course.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const avgRating    = ratingAgg._avg.rating ?? 0;
  const totalRatings = ratingAgg._count.rating;
  const totalLectures = course.modules.reduce((sum, m) => sum + m._count.lectures, 0);
  const instructor   = course.scholar?.user.name ?? course.author.name;
  const instructorImg = course.scholar?.user.image ?? course.author.image;

  return (
    <div className="min-h-screen">

      {/* Hero banner */}
      <div className="relative w-full h-64 md:h-80 bg-[var(--bg-secondary)]">
        {course.bannerUrl ?? course.thumbnailUrl ? (
          <Image
            src={(course.bannerUrl ?? course.thumbnailUrl)!}
            alt={course.title}
            fill
            className="object-cover"
            priority
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-black/50 to-transparent" />

        {/* Category */}
        {course.category && (
          <div className="absolute top-6 left-6">
            <span
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm border"
              style={{
                backgroundColor: `${course.category.color ?? "#c8871a"}22`,
                color: course.category.color ?? "#c8871a",
                borderColor: `${course.category.color ?? "#c8871a"}44`,
              }}
            >
              {course.category.icon} {course.category.name}
            </span>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-16 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Main content ── */}
          <div className="lg:col-span-2">

            {/* Title block */}
            <div className="mb-8">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--text-primary)] leading-tight mb-3">
                {course.title}
              </h1>
              <p className="text-[var(--text-secondary)] text-base leading-relaxed">
                {course.description}
              </p>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <FiAward size={14} className="text-[var(--accent)]" />
                  {difficultyLabel[course.difficulty]}
                </span>
                {course.estimatedDuration > 0 && (
                  <span className="flex items-center gap-1">
                    <FiClock size={14} className="text-[var(--accent)]" />
                    {formatDuration(course.estimatedDuration)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FiBookOpen size={14} className="text-[var(--accent)]" />
                  {totalLectures} lectures
                </span>
                <span className="flex items-center gap-1">
                  <FiUsers size={14} className="text-[var(--accent)]" />
                  {course._count.enrollments} enrolled
                </span>
                {avgRating > 0 && (
                  <span className="flex items-center gap-1 text-[var(--accent)]">
                    <FiStar size={14} />
                    {avgRating.toFixed(1)} ({totalRatings})
                  </span>
                )}
              </div>

              {/* Tags */}
              {course.tags && course.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {course.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/courses?search=${encodeURIComponent(tag)}`}
                      className="tag hover:tag-accent transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Objectives */}
            {course.objectives.length > 0 && (
              <section className="mb-8 glass-card rounded-2xl p-6">
                <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-4">
                  What you&apos;ll learn
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {course.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <FiCheckCircle className="text-[var(--accent)] flex-shrink-0 mt-0.5" size={14} />
                      {obj}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Prerequisites */}
            {course.prerequisites.length > 0 && (
              <section className="mb-8">
                <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-3">
                  Prerequisites
                </h2>
                <ul className="space-y-1.5">
                  {course.prerequisites.map((prereq, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0 mt-1.5" />
                      {prereq}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Course curriculum */}
            <section className="mb-8">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-4">
                Curriculum
              </h2>
              <div className="space-y-3">
                {course.modules.map((module) => (
                  <details key={module.id} className="glass-card rounded-xl overflow-hidden group">
                    <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-[var(--bg-card-hover)] transition-colors list-none">
                      <div>
                        <h3 className="font-medium text-[var(--text-primary)] text-sm">
                          {module.title}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {module._count.lectures} lectures
                          {module._count.quizzes > 0 && ` · ${module._count.quizzes} quiz`}
                        </p>
                      </div>
                      <FiChevronDown className="text-[var(--text-muted)] group-open:rotate-180 transition-transform" size={16} />
                    </summary>
                    <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                      {module.lectures.map((lecture) => (
                        <div key={lecture.id} className="flex items-center gap-3 px-5 py-3">
                          <span className="text-[var(--text-muted)] text-xs uppercase tracking-wide w-10 flex-shrink-0">
                            {lecture.type === "VIDEO" ? "🎥" : lecture.type === "AUDIO" ? "🎧" : lecture.type === "PDF" ? "📄" : "📝"}
                          </span>
                          <span className="flex-1 text-sm text-[var(--text-secondary)]">
                            {enrollment || user?.role === "ADMIN" || user?.role === "SCHOLAR" ? (
                              <Link
                                href={`/lectures/${lecture.slug}`}
                                className="hover:text-[var(--accent)] transition-colors"
                              >
                                {lecture.title}
                              </Link>
                            ) : (
                              lecture.title
                            )}
                          </span>
                          {lecture.duration && (
                            <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                              {formatLectureDuration(lecture.duration)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {/* Instructor */}
            <section className="glass-card rounded-2xl p-6 mb-8">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-4">
                Instructor
              </h2>              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--border-strong)] flex-shrink-0">
                  {instructorImg ? (
                    <Image src={instructorImg} alt={instructor} width={64} height={64} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] text-xl font-bold font-display">
                      {instructor[0]}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                      {instructor}
                    </h3>
                    {course.scholar?.verified && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-strong)]">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  {course.scholar && (
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">
                      {course.scholar.bio}
                    </p>
                  )}
                  {course.scholar && (
                    <Link
                      href={`/scholars/${course.scholar.id}`}
                      className="text-sm text-[var(--accent)] hover:text-[var(--accent-light)] mt-1 inline-block transition-colors"
                    >
                      View full profile →
                    </Link>
                  )}
                </div>
              </div>
            </section>

            {/* Ratings & Reviews */}
            <CourseRatingWidget courseId={course.id} isEnrolled={!!enrollment} />
          </div>

          {/* ── Sidebar ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="glass-card rounded-2xl p-6">
                {/* Enroll / Progress */}
                {enrollment ? (
                  <CourseProgress enrollment={enrollment} courseId={course.id} />
                ) : (
                  <EnrollButton courseId={course.id} courseSlug={course.slug} isLoggedIn={!!user} />
                )}

                <div className="mt-5 pt-5 border-t border-[var(--border)] space-y-3 text-sm text-[var(--text-secondary)]">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Modules</span>
                    <span className="font-medium text-[var(--text-primary)]">{course._count.modules}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Lectures</span>
                    <span className="font-medium text-[var(--text-primary)]">{totalLectures}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Level</span>
                    <span className="font-medium text-[var(--text-primary)]">{difficultyLabel[course.difficulty]}</span>
                  </div>
                  {course.estimatedDuration > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Duration</span>
                      <span className="font-medium text-[var(--text-primary)]">{formatDuration(course.estimatedDuration)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Students</span>
                    <span className="font-medium text-[var(--text-primary)]">{course._count.enrollments}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

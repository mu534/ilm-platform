import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { CommentSection } from "../../components/CommentSection";
import { LikeButton } from "../../components/lectures/LikeButton";
import { LectureResources } from "../../components/lectures/LectureResources";
import { CourseSidebar } from "../../components/lectures/CourseSidebar";
import { LectureTopBar, LectureBottomBar } from "../../components/lectures/LectureNavigation";
import { sanitizeHtml } from "../../utils/sanitize";
import { FiLock, FiBookOpen } from "react-icons/fi";
import type { SessionUser } from "../../types/auth.types";

interface Props {
  params: Promise<{ slug: string }>;
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getLecture(slug: string) {
  return prisma.lecture.findFirst({
    where: { OR: [{ slug }, { id: slug }], published: true },
    include: {
      author:   { select: { id: true, name: true, image: true, bio: true } },
      scholar:  { include: { user: { select: { name: true, image: true } } } },
      category: { select: { name: true, icon: true } },
      media:    { select: { id: true, url: true, type: true, filename: true, size: true } },
      module: {
        select: {
          id:    true,
          title: true,
          order: true,
          courseId: true,
          course: {
            select: {
              id: true, title: true, slug: true,
              modules: {
                orderBy: { order: "asc" },
                select: {
                  id: true, title: true, order: true,
                  lectures: {
                    orderBy: { order: "asc" },
                    where:   { published: true },
                    select:  { id: true, title: true, slug: true, order: true },
                  },
                },
              },
            },
          },
          lectures: {
            orderBy: { order: "asc" },
            where:   { published: true },
            select:  { id: true, title: true, slug: true, order: true },
          },
        },
      },
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface NavInfo {
  prevSlug:         string | null;
  prevTitle:        string | null;
  nextSlug:         string | null;
  nextTitle:        string | null;
  isLastLecture:    boolean;
  isNextSection:    boolean;
  nextSectionTitle: string | null;
  lectureNumber:    number;
  totalLectures:    number;
}

function buildNavInfo(
  lectureId: string,
  modules: { id: string; title: string; lectures: { id: string; title: string; slug: string }[] }[],
): NavInfo {
  // Flatten all lectures in order
  const all: { id: string; title: string; slug: string; moduleId: string; moduleTitle: string }[] = [];
  for (const mod of modules) {
    for (const lec of mod.lectures) {
      all.push({ ...lec, moduleId: mod.id, moduleTitle: mod.title });
    }
  }

  const idx = all.findIndex((l) => l.id === lectureId);
  if (idx === -1) {
    return {
      prevSlug: null, prevTitle: null,
      nextSlug: null, nextTitle: null,
      isLastLecture: false, isNextSection: false,
      nextSectionTitle: null,
      lectureNumber: 1, totalLectures: all.length,
    };
  }

  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;
  const curr = all[idx];

  const isNextSection = !!(next && next.moduleId !== curr.moduleId);

  return {
    prevSlug:         prev?.slug  ?? null,
    prevTitle:        prev?.title ?? null,
    nextSlug:         next?.slug  ?? null,
    nextTitle:        next?.title ?? null,
    isLastLecture:    idx === all.length - 1,
    isNextSection,
    nextSectionTitle: isNextSection ? next!.moduleTitle : null,
    lectureNumber:    idx + 1,
    totalLectures:    all.length,
  };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const lecture  = await getLecture(slug);
  if (!lecture) return { title: "Lesson Not Found" };
  return {
    title:       `${lecture.title}${lecture.module?.course ? ` — ${lecture.module.course.title}` : ""}`,
    description: lecture.description,
    openGraph:   { images: lecture.thumbnailUrl ? [lecture.thumbnailUrl] : [] },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LecturePage({ params }: Props) {
  const { slug } = await params;
  const [lecture, session] = await Promise.all([
    getLecture(slug),
    getServerSession(authOptions),
  ]);

  if (!lecture) notFound();

  const user     = session?.user as SessionUser | undefined;
  const courseId = lecture.module?.courseId ?? null;
  let   isEnrolled = false;

  // ── Enrollment gate ────────────────────────────────────────────────────────
  if (courseId) {
    if (!user) redirect(`/login?callbackUrl=/lectures/${slug}`);

    const isStaff = user.role === "ADMIN" || user.role === "SCHOLAR";

    if (!isStaff) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId } },
      });
      if (!enrollment) {
        return (
          <EnrollmentGate
            lectureTitle={lecture.title}
            courseSlug={lecture.module!.course.slug}
            courseTitle={lecture.module!.course.title}
          />
        );
      }
      isEnrolled = true;
    } else {
      isEnrolled = true;
    }

    // Record last-viewed (non-blocking)
    if (user && isEnrolled) {
      void prisma.lectureProgress.upsert({
        where: { userId_lectureId: { userId: user.id, lectureId: lecture.id } },
        create: { userId: user.id, lectureId: lecture.id, lastViewedAt: new Date() },
        update: { lastViewedAt: new Date() },
      }).catch(() => {});
    }
  }

  // ── Navigation info ────────────────────────────────────────────────────────
  const courseModules = lecture.module?.course.modules ?? [];
  const navInfo = buildNavInfo(lecture.id, courseModules);

  // ── Is this a course lecture? ──────────────────────────────────────────────
  const inCourse = !!(courseId && lecture.module);
  const course   = lecture.module?.course;
  const section  = lecture.module;

  return (
    // Full-viewport layout: sidebar left, content right
    <div className="flex min-h-screen bg-[var(--bg-primary)]">

      {/* ── Curriculum sidebar (only for course lectures) ── */}
      {inCourse && courseId && (
        <CourseSidebar
          courseId={courseId}
          activeLectureId={lecture.id}
        />
      )}

      {/* ── Main learning area ── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Top nav bar */}
        {inCourse && course && section && (
          <LectureTopBar
            courseTitle={course.title}
            courseSlug={course.slug}
            sectionTitle={section.title}
            lectureNumber={navInfo.lectureNumber}
            totalLectures={navInfo.totalLectures}
            prevSlug={navInfo.prevSlug}
            nextSlug={navInfo.nextSlug}
          />
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto">
          <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-4">

            {/* Breadcrumb (standalone lectures or non-course) */}
            {!inCourse && (
              <nav className="flex items-center gap-2 mb-6 text-xs text-[var(--text-muted)] flex-wrap">
                <Link href="/" className="hover:text-[var(--accent)] transition-colors">Home</Link>
                <span>/</span>
                <Link href="/courses" className="hover:text-[var(--accent)] transition-colors">Courses</Link>
                <span>/</span>
                <span className="text-[var(--text-secondary)] line-clamp-1">{lecture.title}</span>
              </nav>
            )}

            {/* Section label */}
            {inCourse && section && (
              <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">
                {section.title}
              </p>
            )}

            {/* Lecture title */}
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] leading-tight mb-3">
              {lecture.title}
            </h1>

            {/* Description */}
            {lecture.description && (
              <p className="text-[var(--text-secondary)] text-base leading-relaxed mb-6">
                {lecture.description}
              </p>
            )}

            {/* ── VIDEO ── */}
            {lecture.type === "VIDEO" && lecture.mediaUrl && (
              <div className="mb-8 rounded-xl overflow-hidden border border-[var(--border)] bg-black">
                <video
                  src={lecture.mediaUrl}
                  controls
                  className="w-full aspect-video"
                  poster={lecture.thumbnailUrl ?? undefined}
                  preload="metadata"
                />
              </div>
            )}

            {/* ── AUDIO ── */}
            {lecture.type === "AUDIO" && lecture.mediaUrl && (
              <div className="mb-8 p-5 border border-[var(--border)] rounded-xl bg-[var(--bg-card)]">
                <p className="text-xs text-[var(--text-muted)] mb-3 uppercase tracking-wide font-semibold">
                  Audio Lesson
                </p>
                <audio src={lecture.mediaUrl} controls className="w-full" />
              </div>
            )}

            {/* ── PDF ── */}
            {lecture.type === "PDF" && lecture.mediaUrl && (
              <div className="mb-8 border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">
                    PDF Document
                  </p>
                  <a
                    href={lecture.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
                  >
                    Open in new tab →
                  </a>
                </div>
                <iframe
                  src={lecture.mediaUrl}
                  className="w-full h-[600px]"
                  title={lecture.title}
                />
              </div>
            )}

            {/* ── Thumbnail (non-video) ── */}
            {lecture.thumbnailUrl && lecture.type === "TEXT" && (
              <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden mb-8 border border-[var(--border)]">
                <Image
                  src={lecture.thumbnailUrl}
                  alt={lecture.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* ── Text content ── */}
            {lecture.content && (
              <div
                className="lecture-prose mb-10"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(lecture.content) }}
              />
            )}

            {/* ── Resources / Attachments ── */}
            {lecture.media && lecture.media.length > 0 && (
              <div className="mb-10">
                <LectureResources media={lecture.media} />
              </div>
            )}

            {/* ── Meta row (likes, views) — quiet, below content ── */}
            <div className="flex items-center gap-5 text-sm text-[var(--text-muted)] pb-6 mb-8 border-b border-[var(--border)]">
              <LikeButton lectureId={lecture.id} />
              <span className="text-xs">{lecture.views.toLocaleString()} views</span>
              {lecture.category && (
                <span className="tag text-xs">{lecture.category.icon} {lecture.category.name}</span>
              )}
            </div>

            {/* ── Scholar bio (if applicable) ── */}
            {lecture.scholar && (
              <div className="border border-[var(--border)] rounded-xl p-5 mb-10 bg-[var(--bg-card)]">
                <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-3">
                  About the Scholar
                </p>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--border)] flex-shrink-0 bg-[var(--bg-secondary)]">
                    {lecture.scholar.user.image ? (
                      <Image
                        src={lecture.scholar.user.image}
                        alt={lecture.scholar.user.name}
                        width={48} height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--accent)] font-bold">
                        {lecture.scholar.user.name[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                      {lecture.scholar.user.name}
                    </p>
                    {lecture.scholar.bio && (
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3">
                        {lecture.scholar.bio}
                      </p>
                    )}
                    <Link
                      href={`/scholars/${lecture.scholar.id}`}
                      className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] mt-2 inline-block transition-colors"
                    >
                      View full profile →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ── Comments ── */}
            <CommentSection lectureId={lecture.id} />

          </article>
        </div>

        {/* Bottom navigation bar */}
        {inCourse && courseId && course && isEnrolled && (
          <LectureBottomBar
            lectureId={lecture.id}
            courseId={courseId}
            courseSlug={course.slug}
            courseTitle={course.title}
            sectionTitle={section?.title ?? ""}
            lectureNumber={navInfo.lectureNumber}
            totalLectures={navInfo.totalLectures}
            prevSlug={navInfo.prevSlug}
            prevTitle={navInfo.prevTitle}
            nextSlug={navInfo.nextSlug}
            nextTitle={navInfo.nextTitle}
            isLastLecture={navInfo.isLastLecture}
            isNextSection={navInfo.isNextSection}
            nextSectionTitle={navInfo.nextSectionTitle}
          />
        )}
      </div>
    </div>
  );
}

// ── Enrollment gate ───────────────────────────────────────────────────────────

function EnrollmentGate({
  lectureTitle,
  courseSlug,
  courseTitle,
}: {
  lectureTitle: string;
  courseSlug:   string;
  courseTitle:  string;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 hero-bg opacity-50" />
      <div className="absolute inset-0 pattern-overlay opacity-30" />

      <div className="relative w-full max-w-md text-center animate-fadeInUp">
        <div className="glass-card rounded-2xl p-10 border border-[var(--border-strong)]">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto mb-6">
            <FiLock className="text-[var(--accent)] text-2xl" />
          </div>

          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
            Enrollment Required
          </h1>
          <p className="text-[var(--text-muted)] text-sm mb-1">
            <span className="font-semibold text-[var(--text-secondary)]">
              &ldquo;{lectureTitle}&rdquo;
            </span>
          </p>
          <p className="text-[var(--text-muted)] text-sm mb-8">
            is part of{" "}
            <span className="font-semibold text-[var(--text-secondary)]">{courseTitle}</span>.
            Enroll to access this and all other lessons.
          </p>

          <div className="flex flex-col gap-3">
            <Link href={`/courses/${courseSlug}`} className="btn-primary w-full text-center">
              <FiBookOpen size={14} /> View Course &amp; Enroll
            </Link>
            <Link href="/courses" className="btn-secondary w-full text-center text-sm">
              Browse All Courses
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

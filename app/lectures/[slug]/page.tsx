import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { CommentSection } from "../../components/CommentSection";
import { LikeButton } from "../../components/lectures/LikeButton";
import { formatDate } from "../../utils/api";
import { sanitizeHtml } from "../../utils/sanitize";
import { FiEye, FiCalendar, FiTag, FiLock, FiArrowLeft } from "react-icons/fi";
import type { SessionUser } from "../../types/auth.types";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getLecture(slug: string) {
  return prisma.lecture.findFirst({
    where: { OR: [{ slug }, { id: slug }], published: true },
    include: {
      author:   { select: { id: true, name: true, image: true, bio: true } },
      scholar:  { include: { user: { select: { name: true, image: true } } } },
      category: { select: { name: true, icon: true } },
      module: {
        select: {
          id: true,
          courseId: true,
          course: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const lecture  = await getLecture(slug);
  if (!lecture) return { title: "Lecture Not Found" };
  return {
    title:       lecture.title,
    description: lecture.description,
    openGraph:   { images: lecture.thumbnailUrl ? [lecture.thumbnailUrl] : [] },
  };
}

export default async function LecturePage({ params }: Props) {
  const { slug } = await params;
  const [lecture, session] = await Promise.all([
    getLecture(slug),
    getServerSession(authOptions),
  ]);

  if (!lecture) notFound();

  const user = session?.user as SessionUser | undefined;

  // ── Enrollment gate ─────────────────────────────────────────────────────────
  // If this lecture belongs to a course module, require enrollment
  const courseId = lecture.module?.courseId ?? null;
  let isEnrolled = false;

  if (courseId) {
    if (!user) {
      // Not logged in — redirect to login
      redirect(`/login?callbackUrl=/lectures/${slug}`);
    }

    const isStaff = user.role === "ADMIN" || user.role === "SCHOLAR";

    if (!isStaff) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId } },
      });
      if (!enrollment) {
        // Enrolled check failed — show locked screen
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-8 text-sm text-[var(--text-muted)] flex-wrap">
        <Link href="/"         className="hover:text-[var(--accent)] transition-colors">Home</Link>
        <span>/</span>
        {lecture.module?.course ? (
          <>
            <Link href="/courses" className="hover:text-[var(--accent)] transition-colors">Courses</Link>
            <span>/</span>
            <Link href={`/courses/${lecture.module.course.slug}`} className="hover:text-[var(--accent)] transition-colors">
              {lecture.module.course.title}
            </Link>
            <span>/</span>
          </>
        ) : (
          <>
            <Link href="/lectures" className="hover:text-[var(--accent)] transition-colors">Lectures</Link>
            <span>/</span>
          </>
        )}
        <span className="text-[var(--text-secondary)] line-clamp-1">{lecture.title}</span>
      </nav>

      {/* Article header */}
      <header className="mb-8">
        {/* Type + tags */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="tag-accent">{lecture.type}</span>
          {lecture.category && (
            <span className="tag">{lecture.category.icon} {lecture.category.name}</span>
          )}
          {lecture.tags.map((tag) => (
            <Link key={tag} href={`/lectures?tag=${tag}`} className="tag flex items-center gap-1">
              <FiTag size={9} /> {tag}
            </Link>
          ))}
        </div>

        <h1 className="font-display text-3xl md:text-5xl font-bold text-[var(--text-primary)] leading-tight mb-4">
          {lecture.title}
        </h1>

        <p className="text-[var(--text-secondary)] text-lg leading-relaxed mb-6">
          {lecture.description}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-5 text-sm text-[var(--text-muted)] pb-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            {lecture.author.image ? (
              <Image src={lecture.author.image} alt={lecture.author.name} width={28} height={28} className="rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-xs text-white font-bold">
                {lecture.author.name[0]}
              </div>
            )}
            <span className="text-[var(--text-secondary)] font-medium">{lecture.author.name}</span>
          </div>
          <span className="flex items-center gap-1.5">
            <FiCalendar size={13} className="text-[var(--accent)]" />
            {formatDate(lecture.createdAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <FiEye size={13} className="text-[var(--accent)]" />
            {lecture.views.toLocaleString()} views
          </span>
          <LikeButton lectureId={lecture.id} />
        </div>
      </header>

      {/* Thumbnail */}
      {lecture.thumbnailUrl && lecture.type !== "VIDEO" && (
        <div className="relative w-full h-72 md:h-96 rounded-2xl overflow-hidden mb-8 border border-[var(--border)]">
          <Image src={lecture.thumbnailUrl} alt={lecture.title} fill className="object-cover" />
        </div>
      )}

      {/* Video player */}
      {lecture.type === "VIDEO" && lecture.mediaUrl && (
        <div className="mb-8 rounded-2xl overflow-hidden border border-[var(--border)] bg-black">
          <video src={lecture.mediaUrl} controls className="w-full aspect-video" poster={lecture.thumbnailUrl ?? undefined} />
        </div>
      )}

      {/* Audio player */}
      {lecture.type === "AUDIO" && lecture.mediaUrl && (
        <div className="mb-8 p-5 glass-card rounded-2xl">
          <p className="text-xs text-[var(--text-muted)] mb-3 uppercase tracking-wide font-semibold">Audio Lecture</p>
          <audio src={lecture.mediaUrl} controls className="w-full" />
        </div>
      )}

      {/* PDF embed */}
      {lecture.type === "PDF" && lecture.mediaUrl && (
        <div className="mb-8 glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">PDF Document</p>
            <a href={lecture.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
              Open in new tab →
            </a>
          </div>
          <iframe src={lecture.mediaUrl} className="w-full h-[600px]" title={lecture.title} />
        </div>
      )}

      {/* Text content */}
      {lecture.content && (
        <div className="lecture-prose mb-12" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lecture.content) }} />
      )}

      {/* Scholar bio card */}
      {lecture.scholar && (
        <div className="glass-card rounded-2xl p-6 mb-12 border border-[var(--border-strong)]">
          <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-4">About the Scholar</p>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-[var(--border-strong)]">
              {lecture.scholar.user.image ? (
                <Image src={lecture.scholar.user.image} alt={lecture.scholar.user.name} width={56} height={56} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--accent-dim)] text-[var(--accent)] font-bold font-display text-lg">
                  {lecture.scholar.user.name[0]}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-1">
                {lecture.scholar.user.name}
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-3">{lecture.scholar.bio}</p>
              <Link href={`/scholars/${lecture.scholar.id}`} className="text-sm text-[var(--accent)] hover:text-[var(--accent-light)] mt-2 inline-flex items-center gap-1 transition-colors">
                View full profile →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Course navigation (if part of a course) */}
      {lecture.module?.course && (
        <div className="mb-8 p-4 glass-card rounded-xl flex items-center gap-3 text-sm">
          <FiArrowLeft size={14} className="text-[var(--accent)] flex-shrink-0" />
          <span className="text-[var(--text-muted)]">Part of:</span>
          <Link href={`/courses/${lecture.module.course.slug}`} className="text-[var(--accent)] hover:text-[var(--accent-light)] font-medium transition-colors">
            {lecture.module.course.title}
          </Link>
        </div>
      )}

      <CommentSection lectureId={lecture.id} />
    </div>
  );
}

// ── Enrollment gate screen ────────────────────────────────────────────────────
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
        <div className="glass-card rounded-2xl p-10">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto mb-6">
            <FiLock className="text-[var(--accent)] text-2xl" />
          </div>

          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
            Enrollment Required
          </h1>
          <p className="text-[var(--text-muted)] text-sm mb-1">
            <span className="font-semibold text-[var(--text-secondary)]">&ldquo;{lectureTitle}&rdquo;</span>
          </p>
          <p className="text-[var(--text-muted)] text-sm mb-8">
            is part of{" "}
            <span className="font-semibold text-[var(--text-secondary)]">{courseTitle}</span>.
            Enroll to access this lecture and all course content.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href={`/courses/${courseSlug}`}
              className="btn-primary w-full text-center"
            >
              View Course & Enroll
            </Link>
            <Link
              href="/courses"
              className="btn-secondary w-full text-center text-sm"
            >
              Browse All Courses
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

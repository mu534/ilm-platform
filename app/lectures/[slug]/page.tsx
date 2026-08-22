import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { CommentSection } from "../../components/CommentSection";
import { LikeButton } from "../../components/lectures/LikeButton";
import { LectureResources } from "../../components/lectures/LectureResources";
import { LecturePdfViewer } from "../../components/lectures/LecturePdfViewer";
import { sanitizeHtml } from "../../utils/sanitize";
import type { SessionUser } from "../../types/auth.types";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getLecture(slug: string, userId?: string, userRole?: string) {
  const isStaff = userRole === "ADMIN" || userRole === "INSTRUCTOR";

  // Build the slug/id match combined with the publish gate
  const slugMatch = [{ slug }, { id: slug }];

  return prisma.lecture.findFirst({
    where: isStaff && userId
      ? {
          // Staff: match slug OR id AND (published OR authored by this user)
          AND: [
            { OR: slugMatch },
            { OR: [{ published: true }, { authorId: userId }] },
          ],
        }
      : {
          // Public: must be published AND match slug or id
          OR: slugMatch,
          published: true,
        },
    include: {
      author:   { select: { id: true, name: true, image: true, bio: true } },
      scholar:  { include: { user: { select: { name: true, image: true } } } },
      category: { select: { name: true, icon: true } },
      media:    { select: { id: true, url: true, type: true, category: true, filename: true, size: true } },
      module:   { select: { course: { select: { slug: true } } } },
    },
  });
}

export async function generateMetadata({ params }: Props) {
  const { slug }  = await params;
  const session   = await getServerSession(authOptions);
  const user      = session?.user as SessionUser | undefined;
  const lecture   = await getLecture(slug, user?.id, user?.role);
  if (!lecture) return { title: "Lesson Not Found" };
  return {
    title:       lecture.title,
    description: lecture.description,
    openGraph:   { images: lecture.thumbnailUrl ? [lecture.thumbnailUrl] : [] },
  };
}

/**
 * Standalone lecture viewer.
 *
 * Lectures that belong to a course are owned by that course's classroom —
 * this route immediately redirects to `/courses/[slug]/learn/[lectureSlug]`
 * for those, so old links and bookmarks keep working. Only lectures with
 * no parent course (e.g. free-standing articles/lessons) render here.
 */
export default async function LecturePage({ params }: Props) {
  const { slug }  = await params;
  const session   = await getServerSession(authOptions);
  const user      = session?.user as SessionUser | undefined;
  const lecture   = await getLecture(slug, user?.id, user?.role);
  const isDraft   = !lecture?.published;

  if (!lecture) notFound();

  if (lecture.module?.course) {
    redirect(`/courses/${lecture.module.course.slug}/learn/${lecture.slug}`);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <article>

        {/* Draft preview banner — visible to staff only */}
        {isDraft && (
          <div className="flex items-center gap-2.5 mb-6 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm font-medium">
            <span className="text-base">⚠️</span>
            <span>
              <strong>Draft Preview</strong> — This lesson is not yet published. Only you and admins can see this.
            </span>
          </div>
        )}

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-6 text-xs text-[var(--text-muted)] flex-wrap">
          <Link href="/" className="hover:text-[var(--accent)] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/courses" className="hover:text-[var(--accent)] transition-colors">Courses</Link>
          <span>/</span>
          <span className="text-[var(--text-secondary)] line-clamp-1">{lecture.title}</span>
        </nav>

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
          <LecturePdfViewer url={lecture.mediaUrl} title={lecture.title} />
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

        {/* ── Meta row (likes, views) ── */}
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
  );
}

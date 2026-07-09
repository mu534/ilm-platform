import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "../../lib/prism";
import { CommentSection } from "../../components/CommentSection";
import { LikeButton } from "../../components/lectures/LikeButton";
import { formatDate } from "../../utils/api";
import { sanitizeHtml } from "../../utils/sanitize";
import { FiEye, FiCalendar, FiTag, FiArrowLeft } from "react-icons/fi";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getLecture(slug: string) {
  return prisma.lecture.findFirst({
    where: { OR: [{ slug }, { id: slug }], published: true },
    include: {
      author:  { select: { id: true, name: true, image: true, bio: true } },
      scholar: { include: { user: { select: { name: true, image: true } } } },
      category: { select: { name: true, icon: true } },
    },
  });
}

export async function generateMetadata({ params }: Props) {
  const { slug }  = await params;
  const lecture   = await getLecture(slug);
  if (!lecture) return { title: "Lecture Not Found" };
  return {
    title:       lecture.title,
    description: lecture.description,
    openGraph:   { images: lecture.thumbnailUrl ? [lecture.thumbnailUrl] : [] },
  };
}

export default async function LecturePage({ params }: Props) {
  const { slug }  = await params;
  const lecture   = await getLecture(slug);
  if (!lecture) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-8 text-sm text-[var(--text-muted)]">
        <Link href="/"        className="hover:text-[var(--accent)] transition-colors">Home</Link>
        <span>/</span>
        <Link href="/lectures" className="hover:text-[var(--accent)] transition-colors">Lectures</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)] line-clamp-1">{lecture.title}</span>
      </nav>

      {/* Article header */}
      <header className="mb-8">
        {/* Type + tags */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="tag-accent">
            {lecture.type}
          </span>
          {lecture.category && (
            <span className="tag">
              {lecture.category.icon} {lecture.category.name}
            </span>
          )}
          {lecture.tags.map((tag) => (
            <Link
              key={tag}
              href={`/lectures?tag=${tag}`}
              className="tag flex items-center gap-1"
            >
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
          <video
            src={lecture.mediaUrl}
            controls
            className="w-full aspect-video"
            poster={lecture.thumbnailUrl ?? undefined}
          />
        </div>
      )}

      {/* Audio player */}
      {lecture.type === "AUDIO" && lecture.mediaUrl && (
        <div className="mb-8 p-5 glass-card rounded-2xl">
          <p className="text-xs text-[var(--text-muted)] mb-3 uppercase tracking-wide font-semibold">Audio Lecture</p>
          <audio src={lecture.mediaUrl} controls className="w-full" />
        </div>
      )}

      {/* Content */}
      {lecture.content && (
        <div
          className="lecture-prose mb-12"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(lecture.content) }}
        />
      )}

      {/* Scholar bio card */}
      {lecture.scholar && (
        <div className="glass-card rounded-2xl p-6 mb-12 border border-[var(--border-strong)]">
          <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-4">
            About the Scholar
          </p>
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
              <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-3">
                {lecture.scholar.bio}
              </p>
              <Link href={`/scholars/${lecture.scholar.id}`} className="text-sm text-[var(--accent)] hover:text-[var(--accent-light)] mt-2 inline-flex items-center gap-1 transition-colors">
                View full profile →
              </Link>
            </div>
          </div>
        </div>
      )}

      <CommentSection lectureId={lecture.id} />
    </div>
  );
}

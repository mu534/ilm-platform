import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "../../../lib/prism";
import { CommentSection } from "../../../components/CommentSection";
import { formatDate } from "../../../utils/api";
import { FiEye, FiCalendar, FiTag, FiUser } from "react-icons/fi";
import { GiBookmark } from "react-icons/gi";

interface Props {
  params: { slug: string };
}

async function getLecture(slug: string) {
  const lecture = await prisma.lecture.findFirst({
    where: { OR: [{ slug }, { id: slug }], published: true },
    include: {
      author: { select: { id: true, name: true, image: true, bio: true } },
      scholar: {
        include: { user: { select: { name: true, image: true } } },
      },
    },
  });
  return lecture;
}

export async function generateMetadata({ params }: Props) {
  const lecture = await getLecture(params.slug);
  if (!lecture) return { title: "Lecture Not Found" };
  return {
    title: lecture.title,
    description: lecture.description,
    openGraph: { images: lecture.thumbnailUrl ? [lecture.thumbnailUrl] : [] },
  };
}

export default async function LecturePage({ params }: Props) {
  const lecture = await getLecture(params.slug);
  if (!lecture) notFound();

  // Increment views
  await prisma.lecture
    .update({ where: { id: lecture.id }, data: { views: { increment: 1 } } })
    .catch(() => {});

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-ink-500">
        <Link href="/" className="hover:text-gold-400 transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link
          href="/lectures"
          className="hover:text-gold-400 transition-colors"
        >
          Lectures
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink-300 line-clamp-1">{lecture.title}</span>
      </nav>

      {/* Article header */}
      <header className="mb-8">
        {/* Type badge */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full bg-gold-900/30 text-gold-400 text-xs border border-gold-700/30 font-medium">
            {lecture.type}
          </span>
          {lecture.tags.map((tag) => (
            <Link
              key={tag}
              href={`/lectures?tag=${tag}`}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-ink-800/60 text-ink-400 text-xs hover:text-gold-400 transition-colors border border-white/5"
            >
              <FiTag size={10} /> {tag}
            </Link>
          ))}
        </div>

        <h1 className="font-display text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
          {lecture.title}
        </h1>

        <p className="text-ink-300 text-lg leading-relaxed mb-6">
          {lecture.description}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-ink-500 pb-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            {lecture.author.image ? (
              <Image
                src={lecture.author.image}
                alt={lecture.author.name}
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gold-700 flex items-center justify-center text-xs text-white font-bold">
                {lecture.author.name[0]}
              </div>
            )}
            <span className="text-ink-300">{lecture.author.name}</span>
          </div>
          <span className="flex items-center gap-1">
            <FiCalendar size={13} /> {formatDate(lecture.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <FiEye size={13} /> {lecture.views} views
          </span>
        </div>
      </header>

      {/* Thumbnail */}
      {lecture.thumbnailUrl && lecture.type !== "VIDEO" && (
        <div className="relative w-full h-72 md:h-96 rounded-2xl overflow-hidden mb-8 border border-white/5">
          <Image
            src={lecture.thumbnailUrl}
            alt={lecture.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Video player */}
      {lecture.type === "VIDEO" && lecture.mediaUrl && (
        <div className="mb-8 rounded-2xl overflow-hidden border border-white/10">
          <video
            src={lecture.mediaUrl}
            controls
            className="w-full aspect-video bg-black"
            poster={lecture.thumbnailUrl ?? undefined}
          />
        </div>
      )}

      {/* Audio player */}
      {lecture.type === "AUDIO" && lecture.mediaUrl && (
        <div className="mb-8 p-6 glass-card gold-border rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <GiBookmark className="text-gold-400 text-2xl" />
            <span className="font-display text-lg text-white">
              Listen to Lecture
            </span>
          </div>
          <audio src={lecture.mediaUrl} controls className="w-full" />
        </div>
      )}

      {/* Content */}
      {lecture.content && (
        <div
          className="lecture-prose mb-12"
          dangerouslySetInnerHTML={{ __html: lecture.content }}
        />
      )}

      {/* Scholar bio */}
      {lecture.scholar && (
        <div className="glass-card gold-border rounded-2xl p-6 mb-12">
          <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold mb-3">
            About the Scholar
          </p>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border border-gold-500/20">
              {lecture.scholar.user.image ? (
                <Image
                  src={lecture.scholar.user.image}
                  alt={lecture.scholar.user.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gold-800 text-gold-300 font-bold font-display text-lg">
                  {lecture.scholar.user.name[0]}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-white mb-1">
                {lecture.scholar.user.name}
              </h3>
              <p className="text-sm text-ink-400 leading-relaxed line-clamp-3">
                {lecture.scholar.bio}
              </p>
              <Link
                href={`/scholars/${lecture.scholar.id}`}
                className="text-sm text-gold-400 hover:text-gold-300 mt-2 inline-block transition-colors"
              >
                View full profile →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      <CommentSection lectureId={lecture.id} />
    </div>
  );
}

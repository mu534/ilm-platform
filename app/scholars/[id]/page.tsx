import { notFound } from "next/navigation";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { LectureCard } from "../../components/lectures/LectureCard";
import { FollowButton } from "../../components/scholars/FollowButton";
import { FiBookOpen, FiStar, FiUsers } from "react-icons/fi";
import type { Lecture, LectureType, SessionUser } from "../../types/auth.types";

interface Props {
  params: { id: string };
}

function mapLecture(l: {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string | null;
  type: LectureType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  published: boolean;
  featured: boolean;
  views: number;
  createdAt: Date;
  author: { id: string; name: string; image: string | null };
  scholar: {
    id: string;
    bio: string;
    photo: string | null;
    topics: string[];
    user: { name: string };
  } | null;
  _count: { comments: number };
}): Lecture {
  return {
    id: l.id,
    title: l.title,
    slug: l.slug,
    description: l.description,
    content: l.content,
    type: l.type,
    mediaUrl: l.mediaUrl,
    thumbnailUrl: l.thumbnailUrl,
    tags: l.tags,
    published: l.published,
    featured: l.featured,
    views: l.views,
    createdAt: l.createdAt.toISOString(),
    author: l.author,
    scholar: l.scholar
      ? {
          id: l.scholar.id,
          bio: l.scholar.bio,
          photo: l.scholar.photo,
          topics: l.scholar.topics,
          user: { name: l.scholar.user.name },
        }
      : null,
    _count: l._count,
  };
}

async function getScholar(id: string) {
  return prisma.scholar.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: {
      user: { select: { name: true, email: true, image: true, bio: true } },
      lectures: {
        where: { published: true },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, image: true } },
          scholar: { include: { user: { select: { name: true } } } },
          _count: { select: { comments: true } },
        },
      },
      _count: { select: { lectures: true, followers: true, courses: true } },
    },
  });
}

export async function generateMetadata({ params }: Props) {
  const scholar = await getScholar(params.id);
  if (!scholar) return { title: "Scholar Not Found" };
  return { title: scholar.user.name, description: scholar.bio.slice(0, 160) };
}

export default async function ScholarPage({ params }: Props) {
  const scholar = await getScholar(params.id);
  if (!scholar) notFound();

  const session = await getServerSession(authOptions);
  const currentUser = session?.user as SessionUser | undefined;

  const isFollowing = currentUser
    ? !!(await prisma.scholarFollow.findUnique({
        where: { userId_scholarId: { userId: currentUser.id, scholarId: scholar.id } },
      }))
    : false;

  const photoSrc = scholar.photo ?? scholar.user.image;
  const lectures = scholar.lectures.map(mapLecture);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Profile header */}
      <div className="glass-card gold-border rounded-3xl p-8 mb-12">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Photo */}
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-gold-500/40 flex-shrink-0">
            {photoSrc ? (
              <Image
                src={photoSrc}
                alt={scholar.user.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gold-800/50 text-gold-300 text-4xl font-display font-bold">
                {scholar.user.name[0]}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            {scholar.featured && (
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-900/30 text-gold-400 text-xs border border-gold-700/30">
                  <FiStar size={10} /> Featured Scholar
                </span>
                {scholar.verified && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 text-xs border border-emerald-700/30">
                    ✓ Verified
                  </span>
                )}
              </div>
            )}

            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
              {scholar.user.name}
            </h1>

            <div className="flex items-center justify-center md:justify-start gap-1 text-sm text-ink-400 mb-4">
              <FiBookOpen size={14} />
              <span>{scholar._count.lectures} lectures</span>
              <span className="mx-1">·</span>
              <FiUsers size={14} />
              <span>{scholar._count.followers} followers</span>
            </div>

            <p className="text-ink-300 leading-relaxed mb-6 max-w-2xl">
              {scholar.bio}
            </p>

            {/* Follow button */}
            {currentUser && currentUser.id !== scholar.userId && (
              <div className="mb-4 flex justify-center md:justify-start">
                <FollowButton
                  scholarId={scholar.id}
                  initialFollowing={isFollowing}
                  initialCount={scholar._count.followers}
                />
              </div>
            )}

            {/* Topics */}
            <div className="mb-4">
              <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold mb-2">
                Areas of Knowledge
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {scholar.topics.map((topic: string) => (
                  <span
                    key={topic}
                    className="px-3 py-1 rounded-full bg-gold-900/30 text-gold-400 border border-gold-700/30 text-sm"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* Qualifications */}
            {scholar.qualifications.length > 0 && (
              <div>
                <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold mb-2">
                  Qualifications
                </p>
                <ul className="space-y-1">
                  {scholar.qualifications.map((q: string, i: number) => (
                    <li
                      key={i}
                      className="text-sm text-ink-300 flex items-center gap-2"
                    >
                      <span className="w-1 h-1 rounded-full bg-gold-500 flex-shrink-0" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lectures */}
      <div>
        <h2 className="font-display text-2xl font-semibold text-white mb-6">
          Lectures by {scholar.user.name}
        </h2>
        {lectures.length === 0 ? (
          <p className="text-ink-500 text-center py-12">
            No published lectures yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lectures.map((lecture) => (
              <LectureCard
                key={lecture.id}
                lecture={lecture}
                variant="featured"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

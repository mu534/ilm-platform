// src/app/scholars/[id]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "../../../lib/prism";
import { LectureCard } from "../../../components/LectureCard";
import { FiBookOpen, FiStar } from "react-icons/fi";

interface Props {
  params: { id: string };
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
      _count: { select: { lectures: true } },
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

  const photoSrc = scholar.photo || scholar.user.image;

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
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              {scholar.featured && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-900/30 text-gold-400 text-xs border border-gold-700/30">
                  <FiStar size={10} /> Featured Scholar
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
              {scholar.user.name}
            </h1>

            <div className="flex items-center justify-center md:justify-start gap-1 text-sm text-ink-400 mb-4">
              <FiBookOpen size={14} />
              <span>{scholar._count.lectures} lectures</span>
            </div>

            <p className="text-ink-300 leading-relaxed mb-6 max-w-2xl">
              {scholar.bio}
            </p>

            {/* Topics */}
            <div className="mb-4">
              <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold mb-2">
                Areas of Knowledge
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {scholar.topics.map((topic) => (
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
                  {scholar.qualifications.map((q, i) => (
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
        {scholar.lectures.length === 0 ? (
          <p className="text-ink-500 text-center py-12">
            No published lectures yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scholar.lectures.map((lecture) => (
              <LectureCard
                key={lecture.id}
                lecture={lecture as any}
                variant="featured"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

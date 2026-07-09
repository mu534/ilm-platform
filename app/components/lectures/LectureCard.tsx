import Link from "next/link";
import Image from "next/image";
import { FiVideo, FiFileText, FiEye, FiMessageCircle, FiHeadphones, FiFile } from "react-icons/fi";
import type { Lecture, LectureType } from "../../types/auth.types";
import { formatDate } from "../../utils/api";

const typeIcons: Record<LectureType, React.ReactElement> = {
  VIDEO: <FiVideo      className="text-[var(--accent)]" size={13} />,
  TEXT:  <FiFileText   className="text-[var(--accent)]" size={13} />,
  AUDIO: <FiHeadphones className="text-[var(--accent)]" size={13} />,
  PDF:   <FiFile       className="text-[var(--accent)]" size={13} />,
};

const typeLabels: Record<LectureType, string> = {
  VIDEO: "Video",
  TEXT:  "Article",
  AUDIO: "Audio",
  PDF:   "PDF",
};

interface LectureCardProps {
  lecture: Lecture;
  variant?: "default" | "featured";
}

export function LectureCard({ lecture, variant = "default" }: LectureCardProps) {

  if (variant === "featured") {
    return (
      <Link href={`/lectures/${lecture.slug}`} className="group block">
        <article className="glass-card card-lift rounded-2xl overflow-hidden">
          {/* Thumbnail */}
          {lecture.thumbnailUrl ? (
            <div className="relative h-52 w-full overflow-hidden">
              <Image
                src={lecture.thumbnailUrl}
                alt={lecture.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-[var(--accent-light)] border border-[var(--accent)]/30">
                  {typeIcons[lecture.type]} {typeLabels[lecture.type]}
                </span>
              </div>
              {lecture.featured && (
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 rounded-full bg-[var(--accent)]/80 text-white text-xs font-medium">Featured</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-40 bg-[var(--bg-secondary)] pattern-overlay flex items-center justify-center">
              <div className="text-4xl opacity-20">{typeIcons[lecture.type]}</div>
            </div>
          )}

          <div className="p-5">
            {/* Tags */}
            {lecture.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-2">
                {lecture.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="tag text-xs">{tag}</span>
                ))}
              </div>
            )}

            <h3 className="font-display text-xl font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2 leading-tight mb-2">
              {lecture.title}
            </h3>
            <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-4 leading-relaxed">
              {lecture.description}
            </p>

            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-3">
              <span className="font-medium text-[var(--text-secondary)]">{lecture.author.name}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><FiEye size={11} /> {lecture.views}</span>
                <span className="flex items-center gap-1"><FiMessageCircle size={11} /> {lecture._count?.comments ?? 0}</span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  // Default (compact) variant
  return (
    <Link href={`/lectures/${lecture.slug}`} className="group block">
      <article className="flex gap-4 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-card-hover)] transition-all duration-200">
        {lecture.thumbnailUrl && (
          <div className="relative w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <Image src={lecture.thumbnailUrl} alt={lecture.title} fill className="object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1 text-xs text-[var(--accent)] font-medium">
              {typeIcons[lecture.type]} {typeLabels[lecture.type]}
            </span>
            {lecture.tags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="tag text-xs">{tag}</span>
            ))}
          </div>
          <h3 className="font-medium text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1 mb-1">
            {lecture.title}
          </h3>
          <p className="text-xs text-[var(--text-muted)] line-clamp-1">
            {lecture.description}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
            <span className="font-medium">{lecture.author.name}</span>
            <span>·</span>
            <span>{formatDate(lecture.createdAt)}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><FiEye size={10} /> {lecture.views}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

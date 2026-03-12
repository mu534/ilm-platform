import Link from "next/link";
import Image from "next/image";
import {
  FiVideo,
  FiHeadphones,
  FiFileText,
  FiEye,
  FiMessageCircle,
} from "react-icons/fi";
import type { Lecture, LectureType } from "../../types/auth.types";
import { formatDate } from "../../utils/api";

const typeIcons: Record<LectureType, React.ReactElement> = {
  VIDEO: <FiVideo className="text-gold-400" size={14} />,
  AUDIO: <FiHeadphones className="text-gold-400" size={14} />,
  TEXT: <FiFileText className="text-gold-400" size={14} />,
};

const typeLabels: Record<LectureType, string> = {
  VIDEO: "Video",
  AUDIO: "Audio",
  TEXT: "Article",
};

interface LectureCardProps {
  lecture: Lecture;
  variant?: "default" | "featured";
}

export function LectureCard({
  lecture,
  variant = "default",
}: LectureCardProps) {
  if (variant === "featured") {
    return (
      <Link href={`/lectures/${lecture.slug}`} className="group block">
        <article className="glass-card gold-border rounded-2xl overflow-hidden hover:border-gold-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-gold-900/20">
          {lecture.thumbnailUrl ? (
            <div className="relative h-56 w-full overflow-hidden">
              <Image
                src={lecture.thumbnailUrl}
                alt={lecture.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-gold-300 border border-gold-500/20">
                  {typeIcons[lecture.type]} {typeLabels[lecture.type]}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-40 pattern-overlay flex items-center justify-center bg-ink-800">
              <div className="text-5xl opacity-20">
                {typeIcons[lecture.type]}
              </div>
            </div>
          )}
          <div className="p-5">
            <h3 className="font-display text-xl font-semibold text-white group-hover:text-gold-300 transition-colors line-clamp-2 leading-tight mb-2">
              {lecture.title}
            </h3>
            <p className="text-sm text-ink-400 line-clamp-2 mb-4 leading-relaxed">
              {lecture.description}
            </p>
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span>{lecture.author.name}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <FiEye size={11} /> {lecture.views}
                </span>
                <span className="flex items-center gap-1">
                  <FiMessageCircle size={11} /> {lecture._count?.comments ?? 0}
                </span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/lectures/${lecture.slug}`} className="group block">
      <article className="flex gap-4 p-4 rounded-xl border border-white/5 hover:border-gold-500/20 hover:bg-white/2 transition-all duration-200">
        {lecture.thumbnailUrl && (
          <div className="relative w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={lecture.thumbnailUrl}
              alt={lecture.title}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1 text-xs text-gold-400">
              {typeIcons[lecture.type]} {typeLabels[lecture.type]}
            </span>
            {lecture.tags.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="text-xs text-ink-500 bg-white/5 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          <h3 className="font-medium text-sm text-white group-hover:text-gold-300 transition-colors line-clamp-1 mb-1">
            {lecture.title}
          </h3>
          <p className="text-xs text-ink-500 line-clamp-1">
            {lecture.description}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-ink-600">
            <span>{lecture.author.name}</span>
            <span>·</span>
            <span>{formatDate(lecture.createdAt)}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

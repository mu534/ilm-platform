import Link from "next/link";
import Image from "next/image";
import { FiStar, FiUsers, FiAward } from "react-icons/fi";

interface MarqueeCourse {
  id:           string;
  slug:         string;
  title:        string;
  thumbnailUrl: string | null;
  difficulty:   string;
  avgRating:    number | null;
  enrollCount:  number;
  categoryName: string | null;
  categoryIcon: string | null;
}

const difficultyColor: Record<string, string> = {
  BEGINNER:     "text-emerald-400",
  INTERMEDIATE: "text-amber-400",
  ADVANCED:     "text-red-400",
};

function MarqueeCard({ course }: { course: MarqueeCourse }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group relative flex-shrink-0 w-72 rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-lg)] transition-all duration-300"
    >
      <div className="relative aspect-[16/10] bg-[var(--bg-secondary)] overflow-hidden">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            sizes="288px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl opacity-15">📖</span>
          </div>
        )}
        <span className={`absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-primary)]/85 backdrop-blur-sm border border-[var(--border-subtle)] flex items-center gap-1 ${difficultyColor[course.difficulty] ?? "text-[var(--accent)]"}`}>
          <FiAward size={9} />
          {course.difficulty.charAt(0) + course.difficulty.slice(1).toLowerCase()}
        </span>
      </div>

      <div className="p-4">
        <p className="text-[11px] text-[var(--text-muted)] mb-1.5 truncate">
          {course.categoryIcon && <span className="mr-1">{course.categoryIcon}</span>}
          {course.categoryName ?? "Islamic Studies"}
        </p>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 mb-3 group-hover:text-[var(--accent)] transition-colors min-h-[2.5rem]">
          {course.title}
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
          {course.avgRating && course.avgRating > 0 && (
            <span className="flex items-center gap-1 text-[var(--accent)] font-medium">
              <FiStar size={11} className="fill-current" /> {course.avgRating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <FiUsers size={11} /> {course.enrollCount.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}

function MarqueeRow({ courses, reverse, duration }: { courses: MarqueeCourse[]; reverse?: boolean; duration: number }) {
  // Duplicate the row so the track can loop seamlessly from -50% back to 0.
  const doubled = [...courses, ...courses];
  return (
    <div className="marquee-group overflow-hidden">
      <div
        className={`marquee-track flex gap-5 w-max ${reverse ? "marquee-track--reverse" : ""}`}
        style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      >
        {doubled.map((course, i) => (
          <MarqueeCard key={`${course.id}-${i}`} course={course} />
        ))}
      </div>
    </div>
  );
}

interface CourseMarqueeProps {
  topRow:    MarqueeCourse[];
  bottomRow: MarqueeCourse[];
}

/**
 * The homepage's course showcase. Two rows drift continuously in opposite
 * directions — left row moving one way, right row the other — and pause the
 * instant a visitor's cursor (or keyboard focus) lands on a card, so nothing
 * is ever unreachable. Falls back to a static, non-animated grid for anyone
 * with `prefers-reduced-motion` set.
 */
export function CourseMarquee({ topRow, bottomRow }: CourseMarqueeProps) {
  if (topRow.length === 0) return null;

  return (
    <div className="space-y-5 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
      <MarqueeRow courses={topRow} duration={38} />
      {bottomRow.length > 0 && (
        <MarqueeRow courses={bottomRow} reverse duration={44} />
      )}
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { FiClock, FiUsers, FiStar, FiAward } from "react-icons/fi";

interface CourseCardProps {
  course: {
    id:                string;
    title:             string;
    subtitle?:         string | null;
    slug:              string;
    description:       string;
    thumbnailUrl:      string | null;
    difficulty:        string;
    estimatedDuration: number;
    language?:         string;
    featured:          boolean;
    tags?:             string[];
    enrollmentType?:   string;
    category?:  { id: string; name: string; icon?: string | null; color?: string | null } | null;
    author:     { id: string; name: string; image?: string | null };
    scholar?:   { id: string; photo?: string | null; verified: boolean; user: { name: string } } | null;
    _count:     { modules: number; enrollments: number; ratings: number };
    avgRating?: number;
  };
}

const difficultyConfig: Record<string, { label: string; color: string }> = {
  BEGINNER:     { label: "Beginner",     color: "text-emerald-400" },
  INTERMEDIATE: { label: "Intermediate", color: "text-[var(--accent)]" },
  ADVANCED:     { label: "Advanced",     color: "text-red-400" },
};

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function CourseCard({ course }: CourseCardProps) {
  const instructor = course.scholar?.user.name ?? course.author.name;
  const diff       = difficultyConfig[course.difficulty];

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-xl"
    >
      <article className="h-full flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden transition-all duration-250 group-hover:border-[var(--border-strong)] group-hover:shadow-[var(--shadow-md)] group-hover:-translate-y-0.5">

        {/* ── Thumbnail ── */}
        <div className="relative aspect-[16/9] bg-[var(--bg-secondary)] overflow-hidden flex-shrink-0">
          {course.thumbnailUrl ? (
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-400 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)]">
              <span className="text-4xl opacity-15">📖</span>
            </div>
          )}
          {/* Featured pill */}
          {course.featured && (
            <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)] text-white tracking-wide">
              Featured
            </span>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col flex-1 p-4 gap-3">

          {/* Category + Level */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[var(--text-muted)] truncate">
              {course.category?.icon && <span className="mr-1">{course.category.icon}</span>}
              {course.category?.name ?? "Islamic Studies"}
            </span>
            {diff && (
              <span className={`text-[11px] font-medium flex-shrink-0 flex items-center gap-1 ${diff.color}`}>
                <FiAward size={10} />
                {diff.label}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors duration-200 flex-1">
            {course.title}
          </h3>

          {/* Instructor */}
          <div className="flex items-center gap-1.5">
            {course.scholar?.verified && (
              <span className="text-emerald-400 text-[10px]">✓</span>
            )}
            <span className="text-[12px] text-[var(--text-muted)] truncate">{instructor}</span>
          </div>

          {/* ── Stats footer ── */}
          <div className="flex items-center gap-3 pt-2.5 mt-auto border-t border-[var(--border)]">
            {course.avgRating && course.avgRating > 0 ? (
              <span className="flex items-center gap-1 text-[11px] text-[var(--accent)] font-medium">
                <FiStar size={11} className="fill-current" />
                {course.avgRating.toFixed(1)}
              </span>
            ) : null}
            {course.estimatedDuration > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <FiClock size={11} />
                {formatDuration(course.estimatedDuration)}
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] ml-auto">
              <FiUsers size={11} />
              {course._count.enrollments.toLocaleString()}
              <span className="sr-only">students</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

import Link from "next/link";
import Image from "next/image";
import { FiClock, FiUsers, FiStar } from "react-icons/fi";

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

const difficultyLabel: Record<string, string> = {
  BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced",
};

const difficultyColor: Record<string, string> = {
  BEGINNER:     "text-emerald-400",
  INTERMEDIATE: "text-[var(--accent)]",
  ADVANCED:     "text-red-400",
};

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function CourseCard({ course }: CourseCardProps) {
  const instructor = course.scholar?.user.name ?? course.author.name;

  return (
    <Link href={`/courses/${course.slug}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-xl">
      <article className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden transition-all duration-200 group-hover:border-[var(--border-strong)] group-hover:shadow-[var(--shadow-md)]">

        {/* Thumbnail — clean, no overlay text */}
        <div className="relative aspect-[16/9] bg-[var(--bg-secondary)] overflow-hidden">
          {course.thumbnailUrl ? (
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)]">
              <span className="text-3xl opacity-20">📖</span>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-4 space-y-2">

          {/* Category + Difficulty row */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)] truncate">
              {course.category?.name ?? "Course"}
            </span>
            <span className={`text-xs font-medium flex-shrink-0 ml-2 ${difficultyColor[course.difficulty] ?? ""}`}>
              {difficultyLabel[course.difficulty] ?? course.difficulty}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
            {course.title}
          </h3>

          {/* Subtitle */}
          {course.subtitle && (
            <p className="text-xs text-[var(--text-muted)] line-clamp-1">{course.subtitle}</p>
          )}

          {/* Instructor */}
          <p className="text-xs text-[var(--text-muted)]">
            {course.scholar?.verified && <span className="text-emerald-400 mr-1">✓</span>}
            {instructor}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-3 pt-1 border-t border-[var(--border)]">
            {course.avgRating && course.avgRating > 0 ? (
              <span className="flex items-center gap-1 text-xs text-[var(--accent)]">
                <FiStar size={11} className="fill-current" />
                {course.avgRating.toFixed(1)}
              </span>
            ) : null}
            {course.estimatedDuration > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <FiClock size={11} />
                {formatDuration(course.estimatedDuration)}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] ml-auto">
              <FiUsers size={11} />
              {course._count.enrollments.toLocaleString()}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

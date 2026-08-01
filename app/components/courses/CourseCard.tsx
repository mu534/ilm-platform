import Link from "next/link";
import Image from "next/image";
import { FiBookOpen, FiUsers, FiStar, FiClock } from "react-icons/fi";

interface CourseCardProps {
  course: {
    id:              string;
    title:           string;
    slug:            string;
    description:     string;
    thumbnailUrl:    string | null;
    difficulty:      string;
    estimatedDuration: number;
    featured:        boolean;
    category?:       { id: string; name: string; icon?: string | null; color?: string | null } | null;
    author:          { id: string; name: string; image?: string | null };
    scholar?:        { id: string; photo?: string | null; verified: boolean; user: { name: string } } | null;
    _count:          { modules: number; enrollments: number; ratings: number };
    avgRating?:      number;
  };
}

const difficultyColors: Record<string, string> = {
  BEGINNER:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  INTERMEDIATE: "bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]",
  ADVANCED:     "bg-red-500/10 text-red-400 border-red-500/20",
};

const difficultyLabels: Record<string, string> = {
  BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function CourseCard({ course }: CourseCardProps) {
  const instructor = course.scholar?.user.name ?? course.author.name;

  return (
    <Link href={`/courses/${course.slug}`} className="group block">
      <article className="glass-card rounded-2xl overflow-hidden hover:border-[var(--border-strong)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]">
        {/* Thumbnail */}
        <div className="relative h-48 bg-[var(--bg-secondary)]">
          {course.thumbnailUrl ? (
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FiBookOpen className="text-[var(--text-muted)] text-4xl opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Category badge */}
          {course.category && (
            <div className="absolute top-3 left-3">
              <span
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
                style={{ backgroundColor: `${course.category.color ?? "#c8871a"}22`, color: course.category.color ?? "#c8871a", border: `1px solid ${course.category.color ?? "#c8871a"}44` }}
              >
                {course.category.icon} {course.category.name}
              </span>
            </div>
          )}

          {/* Featured badge */}
          {course.featured && (
            <div className="absolute top-3 right-3">
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] text-[var(--accent)] text-xs font-medium backdrop-blur-sm">
                <FiStar size={10} /> Featured
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Difficulty + duration */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${difficultyColors[course.difficulty] ?? difficultyColors.BEGINNER}`}>
              {difficultyLabels[course.difficulty] ?? course.difficulty}
            </span>
            {course.estimatedDuration > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <FiClock size={11} />
                {formatDuration(course.estimatedDuration)}
              </span>
            )}
          </div>

          {/* Tags */}
          {course.tags && course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {course.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="tag text-xs">{tag}</span>
              ))}
            </div>
          )}

          {/* Title */}
          <h3 className="font-display text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2 leading-tight mb-2">
            {course.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-4 leading-relaxed">
            {course.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-3">
            <span className="flex items-center gap-1">
              {course.scholar?.verified && (
                <span className="text-[var(--accent)]" title="Verified Scholar">✓</span>
              )}
              {instructor}
            </span>
            <div className="flex items-center gap-3">
              {course.avgRating && course.avgRating > 0 ? (
                <span className="flex items-center gap-1 text-[var(--accent)]">
                  <FiStar size={11} />
                  {course.avgRating.toFixed(1)}
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <FiBookOpen size={11} />
                {course._count.modules}
              </span>
              <span className="flex items-center gap-1">
                <FiUsers size={11} />
                {course._count.enrollments}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

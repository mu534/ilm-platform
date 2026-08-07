import Link from "next/link";
import Image from "next/image";
import { FiClock, FiUsers, FiStar, FiAward, FiArrowRight, FiBookOpen } from "react-icons/fi";

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
    price?:            number;
    currency?:         string;
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
  const skills     = (course.tags ?? []).slice(0, 3);

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-xl"
    >
      <article className="relative h-full flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden transition-all duration-250 group-hover:border-[var(--border-strong)] group-hover:shadow-[var(--shadow-lg)] group-hover:-translate-y-1">

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

          {/* Top-left: level badge (Udacity-style program badge) */}
          {diff && (
            <span className={`absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-primary)]/80 backdrop-blur-sm border border-[var(--border-subtle)] flex items-center gap-1 ${diff.color}`}>
              <FiAward size={9} />
              {diff.label}
            </span>
          )}

          {/* Top-right: Free / Price / Featured badge */}
          <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)] text-white tracking-wide shadow-[var(--shadow-sm)]">
            {course.featured
              ? "Featured"
              : course.enrollmentType === "PAID" && (course.price ?? 0) > 0
              ? new Intl.NumberFormat("en-US", { style: "currency", currency: (course.currency ?? "usd").toUpperCase() }).format((course.price ?? 0) / 100)
              : "Free Course"}
          </span>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col flex-1 p-4 gap-2.5">

          {/* Category */}
          <span className="text-[11px] text-[var(--text-muted)] truncate">
            {course.category?.icon && <span className="mr-1">{course.category.icon}</span>}
            {course.category?.name ?? "Islamic Studies"}
          </span>

          {/* Title */}
          <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors duration-200">
            {course.title}
          </h3>

          {/* Skills you'll gain — Udacity "skill chip" row */}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {skills.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-subtle)] truncate max-w-[110px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

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

        {/* ── Hover reveal panel — Udacity's signature "expand on hover" CTA ── */}
        <div
          className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-[var(--bg-elevated)] border-t border-[var(--border-strong)] p-4 shadow-[var(--shadow-lg)] hidden sm:block"
          aria-hidden="true"
        >
          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-3">
            {course.subtitle ?? course.description}
          </p>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--accent)]">
            <FiBookOpen size={12} />
            View Course
            <FiArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </article>
    </Link>
  );
}

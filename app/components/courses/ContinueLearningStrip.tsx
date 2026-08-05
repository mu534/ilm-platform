import Link from "next/link";
import Image from "next/image";
import { FiArrowRight, FiPlayCircle } from "react-icons/fi";

interface InProgressCourse {
  courseId:     string;
  slug:         string;
  title:        string;
  thumbnailUrl: string | null;
  progress:     number;
}

interface ContinueLearningStripProps {
  courses:  InProgressCourse[];
  userName?: string | null;
}

/**
 * Shows the student's actual in-progress courses with their real completion
 * percentage — nothing inferred, nothing "personalized" by a heuristic
 * dressed up as intelligence. If they have no in-progress courses, the
 * caller simply doesn't render this section.
 */
export function ContinueLearningStrip({ courses, userName }: ContinueLearningStripProps) {
  if (courses.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 animate-fadeInUp">
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1.5">
            Pick up where you left off
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">
            {userName ? `Welcome back, ${userName.split(" ")[0]}` : "Continue Learning"}
          </h2>
        </div>
        <Link
          href="/dashboard/my-courses"
          className="flex-shrink-0 flex items-center gap-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors group"
        >
          My Courses
          <FiArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((c) => (
          <Link
            key={c.courseId}
            href={`/courses/${c.slug}`}
            className="group flex items-center gap-4 p-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all duration-250"
          >
            <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
              {c.thumbnailUrl ? (
                <Image src={c.thumbnailUrl} alt={c.title} fill sizes="80px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl opacity-20">📖</div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <FiPlayCircle className="text-white text-2xl" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 mb-2 group-hover:text-[var(--accent)] transition-colors">
                {c.title}
              </h3>
              <div className="h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, c.progress))}%` }}
                />
              </div>
              <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                {Math.round(c.progress)}% complete
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { FiCheckCircle, FiLoader, FiArrowRight } from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";

interface Enrollment {
  status:      string;
  progress:    number;
  completedAt: string | Date | null;
}

interface ProgressData {
  percent:        number;
  completedCount: number;
  totalCount:     number;
}

interface CourseProgressProps {
  enrollment:       Enrollment;
  courseId:         string;
  courseSlug?:      string;
  nextLectureSlug?: string | null;
}

async function fetchProgress(courseId: string): Promise<ProgressData | null> {
  try {
    const res  = await fetch(`/api/progress?courseId=${courseId}`);
    const data = await res.json();
    return data.success ? (data.data as ProgressData) : null;
  } catch { return null; }
}

export function CourseProgress({
  enrollment,
  courseId,
  courseSlug,
  nextLectureSlug,
}: CourseProgressProps) {
  const { data, isLoading } = useQuery({
    queryKey:  ["progress", courseId],
    queryFn:   () => fetchProgress(courseId),
    staleTime: 30_000,
  });

  const percent     = data?.percent ?? Math.round(enrollment.progress ?? 0);
  const isCompleted = enrollment.status === "COMPLETED" || percent >= 100;

  // For completed courses: nextLectureSlug is pre-set to the first lecture (see course page).
  // Fallback to dashboard if somehow no lecture exists — never loop back to the course page.
  const continueHref = nextLectureSlug
    ? `/lectures/${nextLectureSlug}`
    : isCompleted
    ? "/dashboard"
    : courseSlug
    ? `/courses/${courseSlug}`
    : "/dashboard";

  return (
    <div className="space-y-4">

      {/* Status line */}
      {isCompleted ? (
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
          <FiCheckCircle size={15} />
          Course Completed
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Your progress</span>
          <span className="font-semibold text-[var(--text-primary)] tabular-nums">
            {percent}%
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div>
        <div
          className="w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
        {!isLoading && data ? (
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5 tabular-nums">
            {data.completedCount} / {data.totalCount} lessons completed
          </p>
        ) : isLoading ? (
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1">
            <FiLoader className="animate-spin" size={9} />
            Updating…
          </p>
        ) : null}
      </div>

      {/* CTA */}
      <Link
        href={continueHref}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold text-sm transition-colors"
      >
        {isCompleted ? "Review Course" : "Continue Learning"}
        <FiArrowRight size={14} />
      </Link>
    </div>
  );
}

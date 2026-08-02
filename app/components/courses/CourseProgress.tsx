"use client";

import Link from "next/link";
import { FiCheckCircle, FiPlay, FiLoader } from "react-icons/fi";
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
  enrollment:      Enrollment;
  courseId:        string;
  courseSlug?:     string;
  /** Pre-fetched on the server — slug of the next lecture to resume */
  nextLectureSlug?: string | null;
}

async function fetchProgress(courseId: string): Promise<ProgressData | null> {
  try {
    const res  = await fetch(`/api/progress?courseId=${courseId}`);
    const data = await res.json();
    return data.success ? (data.data as ProgressData) : null;
  } catch {
    return null;
  }
}

export function CourseProgress({
  enrollment,
  courseId,
  courseSlug,
  nextLectureSlug,
}: CourseProgressProps) {
  const { data: progressData, isLoading } = useQuery({
    queryKey:  ["progress", courseId],
    queryFn:   () => fetchProgress(courseId),
    staleTime: 30_000,
  });

  const percent     = progressData?.percent ?? Math.round(enrollment.progress ?? 0);
  const isCompleted = enrollment.status === "COMPLETED" || percent >= 100;

  // Build the best possible "continue" href in priority order:
  // 1. Pre-fetched next lecture (most accurate)
  // 2. Student dashboard (always valid)
  const continueHref = nextLectureSlug
    ? `/lectures/${nextLectureSlug}`
    : "/dashboard";

  return (
    <div className="space-y-4">

      {/* Status */}
      {isCompleted ? (
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
          <FiCheckCircle size={16} className="flex-shrink-0" />
          Course Completed!
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">You are enrolled</p>
      )}

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
          <span>Your Progress</span>
          <span className="tabular-nums font-medium">{percent}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-400 transition-all duration-700"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
        {isLoading ? (
          <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
            <FiLoader className="animate-spin" size={10} /> Loading…
          </p>
        ) : progressData ? (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {progressData.completedCount} / {progressData.totalCount} lectures completed
          </p>
        ) : null}
      </div>

      {/* CTA */}
      <Link
        href={continueHref}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white shadow-md shadow-gold-600/20 hover:shadow-gold-500/30 hover:scale-[1.02] active:scale-[0.98]"
      >
        <FiPlay size={13} />
        {isCompleted ? "Review Course" : "Continue Learning"}
      </Link>

      {/* Show course link separately if not going to a lecture */}
      {!nextLectureSlug && courseSlug && (
        <Link
          href={`/courses/${courseSlug}`}
          className="block text-center text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
        >
          View course details →
        </Link>
      )}
    </div>
  );
}

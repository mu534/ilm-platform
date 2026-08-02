"use client";

import Link from "next/link";
import { FiCheckCircle, FiLoader } from "react-icons/fi";
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

export function CourseProgress({ enrollment, courseId, nextLectureSlug }: CourseProgressProps) {
  const { data, isLoading } = useQuery({
    queryKey:  ["progress", courseId],
    queryFn:   () => fetchProgress(courseId),
    staleTime: 30_000,
  });

  const percent     = data?.percent ?? Math.round(enrollment.progress ?? 0);
  const isCompleted = enrollment.status === "COMPLETED" || percent >= 100;
  const continueHref = nextLectureSlug ? `/lectures/${nextLectureSlug}` : "/dashboard";

  return (
    <div className="space-y-3">

      {/* Status */}
      {isCompleted ? (
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
          <FiCheckCircle size={15} />
          Course Completed
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          You&apos;re enrolled · {percent}% complete
        </p>
      )}

      {/* Progress bar */}
      <div>
        <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
        {!isLoading && data ? (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {data.completedCount} of {data.totalCount} lessons completed
          </p>
        ) : isLoading ? (
          <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
            <FiLoader className="animate-spin" size={10} /> Updating…
          </p>
        ) : null}
      </div>

      {/* CTA */}
      <Link
        href={continueHref}
        className="block w-full text-center py-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold text-sm transition-colors"
      >
        {isCompleted ? "Review Course" : "Continue Learning"}
      </Link>
    </div>
  );
}

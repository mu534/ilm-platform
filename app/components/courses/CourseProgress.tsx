"use client";

import Link from "next/link";
import { FiCheckCircle, FiPlay } from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";

interface Enrollment {
  status:     string;
  progress:   number;
  completedAt: string | null;
}

interface CourseProgressProps {
  enrollment: Enrollment;
  courseId:   string;
}

async function fetchProgress(courseId: string) {
  const res  = await fetch(`/api/progress?courseId=${courseId}`);
  const data = await res.json();
  return data.success ? data.data : null;
}

export function CourseProgress({ enrollment, courseId }: CourseProgressProps) {
  const { data } = useQuery({
    queryKey: ["progress", courseId],
    queryFn:  () => fetchProgress(courseId),
    staleTime: 30_000,
  });

  const percent = data?.percent ?? enrollment.progress;
  const isCompleted = enrollment.status === "COMPLETED" || percent >= 100;

  return (
    <div className="space-y-4">
      {/* Status */}
      {isCompleted ? (
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
          <FiCheckCircle size={16} />
          Course Completed!
        </div>
      ) : (
        <div className="text-sm text-[var(--text-muted)]">
          You are enrolled
        </div>
      )}

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
          <span>Progress</span>
          <span>{Math.round(percent)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-400 transition-all duration-500"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
        {data && (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {data.completedCount} / {data.totalCount} lectures completed
          </p>
        )}
      </div>

      {/* Continue / Review button */}
      <Link
        href={`/dashboard/my-courses`}
        className="flex items-center justify-center gap-2 w-full py-2.5 border border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-all duration-200"
      >
        <FiPlay size={13} />
        {isCompleted ? "Review Course" : "Continue Learning"}
      </Link>
    </div>
  );
}

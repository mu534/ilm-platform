"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiChevronLeft, FiChevronRight, FiCheckCircle,
  FiCircle, FiLoader, FiArrowRight, FiBookOpen,
} from "react-icons/fi";
import { useSession } from "next-auth/react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LectureNavigationProps {
  lectureId:   string;
  courseId:    string;
  courseSlug:  string;
  courseTitle: string;
  /** Previous lecture slug (null if first) */
  prevSlug:    string | null;
  prevTitle:   string | null;
  /** Next lecture slug (null if last) */
  nextSlug:    string | null;
  nextTitle:   string | null;
  /** True if this is the very last lecture in the course */
  isLastLecture: boolean;
  /** True if next is in a different section */
  isNextSection: boolean;
  nextSectionTitle?: string | null;
  /** Current section title */
  sectionTitle:  string;
  /** 1-based lecture number within the course */
  lectureNumber: number;
  totalLectures: number;
}

// ── Top navigation bar ────────────────────────────────────────────────────────

export function LectureTopBar({
  courseTitle,
  courseSlug,
  sectionTitle,
  lectureNumber,
  totalLectures,
  prevSlug,
  nextSlug,
}: Pick<
  LectureNavigationProps,
  "courseTitle" | "courseSlug" | "sectionTitle" | "lectureNumber" | "totalLectures" | "prevSlug" | "nextSlug"
>) {
  return (
    <div className="sticky top-0 z-30 bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 sm:px-6">
      <div className="flex items-center gap-3 h-12">

        {/* Course link */}
        <Link
          href={`/courses/${courseSlug}`}
          className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex-shrink-0"
        >
          <FiBookOpen size={12} />
          <span className="max-w-[140px] truncate">{courseTitle}</span>
        </Link>

        <span className="hidden sm:block text-[var(--border-strong)] text-xs flex-shrink-0">/</span>

        {/* Section + progress */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] truncate hidden md:block">
            {sectionTitle}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 tabular-nums">
            {lectureNumber} / {totalLectures}
          </span>
          {/* Mini progress bar */}
          <div className="flex-1 max-w-[120px] h-1 rounded-full bg-[var(--bg-card)] overflow-hidden hidden sm:block">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${Math.round((lectureNumber / totalLectures) * 100)}%` }}
            />
          </div>
        </div>

        {/* Prev / Next quick nav */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {prevSlug ? (
            <Link
              href={`/lectures/${prevSlug}`}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-colors"
              title="Previous lesson"
              aria-label="Previous lesson"
            >
              <FiChevronLeft size={16} />
            </Link>
          ) : (
            <span className="p-1.5 text-[var(--border)] cursor-not-allowed">
              <FiChevronLeft size={16} />
            </span>
          )}
          {nextSlug ? (
            <Link
              href={`/lectures/${nextSlug}`}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-colors"
              title="Next lesson"
              aria-label="Next lesson"
            >
              <FiChevronRight size={16} />
            </Link>
          ) : (
            <span className="p-1.5 text-[var(--border)] cursor-not-allowed">
              <FiChevronRight size={16} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Bottom completion + navigation bar ───────────────────────────────────────

export function LectureBottomBar(props: LectureNavigationProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [completed, setCompleted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [fetching,  setFetching]  = useState(true);

  const {
    lectureId, courseId, courseSlug,
    prevSlug, prevTitle,
    nextSlug, nextTitle,
    isLastLecture, isNextSection, nextSectionTitle,
  } = props;

  // Load current completion state
  useEffect(() => {
    if (!session) { setFetching(false); return; }
    fetch(`/api/progress?lectureId=${lectureId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success && d.data) setCompleted(d.data.completed ?? false); })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [lectureId, session]);

  const markComplete = async () => {
    if (loading || completed) return;
    setLoading(true);
    try {
      await fetch("/api/progress", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lectureId, completed: true }),
      });
      setCompleted(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleNext = async () => {
    // Mark complete first if not already done
    if (!completed && session) {
      await markComplete();
    }
    if (nextSlug) router.push(`/lectures/${nextSlug}`);
    else if (isLastLecture) router.push(`/courses/${courseSlug}`);
  };

  if (!session) return null;

  // ── Next button label ──────────────────────────────────────────────────────
  const nextLabel = isLastLecture
    ? "Complete Course"
    : isNextSection
    ? `Next Section${nextSectionTitle ? `: ${nextSectionTitle}` : ""}`
    : "Next Lesson";

  return (
    <div className="sticky bottom-0 z-30 bg-[var(--bg-secondary)] border-t border-[var(--border)] px-4 sm:px-6 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-3 flex-wrap sm:flex-nowrap">

        {/* Mark complete button */}
        {!fetching && (
          <button
            onClick={() => {
              void (async () => {
                setLoading(true);
                const newVal = !completed;
                try {
                  await fetch("/api/progress", {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ lectureId, completed: newVal }),
                  });
                  setCompleted(newVal);
                } catch { /* silent */ }
                finally { setLoading(false); }
              })();
            }}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 disabled:opacity-60 flex-shrink-0 ${
              completed
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)]"
            }`}
            aria-label={completed ? "Mark as incomplete" : "Mark lesson as complete"}
          >
            {loading ? (
              <FiLoader className="animate-spin" size={14} />
            ) : completed ? (
              <FiCheckCircle size={14} className="fill-current" />
            ) : (
              <FiCircle size={14} />
            )}
            {completed ? "Completed" : "Mark Complete"}
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Prev */}
        {prevSlug && (
          <Link
            href={`/lectures/${prevSlug}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-[var(--border)] transition-colors flex-shrink-0"
            title={prevTitle ?? "Previous lesson"}
          >
            <FiChevronLeft size={14} />
            <span className="hidden sm:block max-w-[120px] truncate">
              {prevTitle ?? "Previous"}
            </span>
          </Link>
        )}

        {/* Next / Complete */}
        {(nextSlug || isLastLecture) && (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white transition-colors flex-shrink-0"
          >
            <span className="max-w-[160px] truncate">{nextLabel}</span>
            <FiArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiChevronLeft, FiChevronRight, FiCheckCircle,
  FiCircle, FiLoader, FiArrowRight, FiBookOpen,
  FiHelpCircle, FiAward,
} from "react-icons/fi";
import { useSession } from "next-auth/react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LectureNavigationProps {
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
  /** If next step is a module quiz */
  nextQuizId?:    string | null;
  nextQuizTitle?: string | null;
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
  nextQuizId,
}: Pick<
  LectureNavigationProps,
  "courseTitle" | "courseSlug" | "sectionTitle" | "lectureNumber" | "totalLectures" | "prevSlug" | "nextSlug" | "nextQuizId"
>) {
  const prevHref = prevSlug ? `/courses/${courseSlug}/learn/${prevSlug}` : null;
  const nextHref = nextSlug
    ? `/courses/${courseSlug}/learn/${nextSlug}`
    : nextQuizId
    ? `/courses/${courseSlug}/learn/quiz/${nextQuizId}`
    : null;

  return (
    <div className="sticky top-0 z-30 bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 sm:px-6">
      <div className="flex items-center gap-3 h-12">

        {/* Course link */}
        <Link
          href={`/courses/${courseSlug}`}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex-shrink-0"
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
              style={{ width: `${Math.round((lectureNumber / Math.max(1, totalLectures)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Prev / Next quick nav */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {prevHref ? (
            <Link
              href={prevHref}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Previous lesson"
              aria-label="Previous lesson"
            >
              <FiChevronLeft size={16} />
              <span className="hidden sm:inline">Back</span>
            </Link>
          ) : (
            <span className="p-1.5 text-[var(--border)] cursor-not-allowed flex items-center gap-1 text-xs">
              <FiChevronLeft size={16} />
              <span className="hidden sm:inline">Back</span>
            </span>
          )}

          {nextHref ? (
            <Link
              href={nextHref}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Next lesson"
              aria-label="Next lesson"
            >
              <span className="hidden sm:inline">Next</span>
              <FiChevronRight size={16} />
            </Link>
          ) : (
            <Link
              href={`/courses/${courseSlug}`}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Course overview"
            >
              <span className="hidden sm:inline">Done</span>
              <FiCheckCircle size={14} className="text-emerald-400" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── In-page Bottom Lesson Action Card ─────────────────────────────────────────

export function LectureInPageNav(props: LectureNavigationProps) {
  const router = useRouter();

  const [completed, setCompleted] = useState(false);
  const [loading,   setLoading]   = useState(false);

  const {
    lectureId, courseSlug,
    prevSlug, prevTitle,
    nextSlug, nextTitle,
    nextQuizId, nextQuizTitle,
    isLastLecture, isNextSection, nextSectionTitle,
  } = props;

  // Fetch completion state
  useEffect(() => {
    fetch(`/api/progress?lectureId=${lectureId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success && d.data) setCompleted(d.data.completed ?? false); })
      .catch(() => {});
  }, [lectureId]);

  const markComplete = async () => {
    if (loading) return;
    setLoading(true);
    const nextVal = !completed;
    try {
      await fetch("/api/progress", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lectureId, completed: nextVal }),
      });
      setCompleted(nextVal);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleNextAction = async () => {
    if (!completed) {
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
    }

    if (nextQuizId) {
      // Must pass module quiz before moving to next module
      router.push(`/courses/${courseSlug}/learn/quiz/${nextQuizId}`);
    } else if (nextSlug) {
      router.push(`/courses/${courseSlug}/learn/${nextSlug}`);
    } else if (isLastLecture) {
      // Last lecture in the course — go to completion page
      router.push(`/courses/${courseSlug}/complete`);
    } else {
      router.push(`/courses/${courseSlug}`);
    }
  };

  const prevHref = prevSlug ? `/courses/${courseSlug}/learn/${prevSlug}` : `/courses/${courseSlug}`;

  let nextLabel = "Continue to Next Lesson";
  let nextSub = nextTitle ?? "";
  if (isLastLecture || !nextSlug) {
    if (nextQuizId) {
      nextLabel = "Take Module Quiz";
      nextSub = nextQuizTitle ?? "Complete the quiz before continuing";
    } else {
      nextLabel = "Finish Course";
      nextSub = "Complete your course journey";
    }
  } else if (isNextSection) {
    nextLabel = "Continue to Next Section";
    nextSub = nextSectionTitle ?? nextTitle ?? "";
  }

  return (
    <div className="mt-12 pt-8 border-t border-[var(--border)]">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm">
        
        {/* Completion status header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              completed ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-strong)]"
            }`}>
              {completed ? <FiCheckCircle size={20} /> : <FiBookOpen size={20} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {completed ? "You've completed this lesson!" : "Finished learning this lesson?"}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {completed ? "Your progress has been recorded." : "Mark it as complete and continue to keep your streak."}
              </p>
            </div>
          </div>

          {/* Mark Complete Toggle */}
          <button
            onClick={() => void markComplete()}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 disabled:opacity-60 flex-shrink-0 ${
              completed
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-[var(--bg-card)] border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)]"
            }`}
          >
            {loading ? (
              <FiLoader className="animate-spin" size={14} />
            ) : completed ? (
              <FiCheckCircle size={14} className="fill-current" />
            ) : (
              <FiCircle size={14} />
            )}
            {completed ? "Marked Complete ✓" : "Mark as Complete"}
          </button>
        </div>

        {/* Big Navigation Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          
          {/* Back button */}
          <Link
            href={prevHref}
            className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-strong)] transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0">
              <FiChevronLeft size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                {prevSlug ? "Previous Lesson" : "Course Hub"}
              </span>
              <p className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate mt-0.5">
                {prevTitle ?? "Back to Course Page"}
              </p>
            </div>
          </Link>

          {/* Continue / Next button */}
          <button
            onClick={() => void handleNextAction()}
            disabled={loading}
            className={`flex items-center justify-between p-4 rounded-xl text-left text-white transition-all shadow-md group ${
              nextQuizId && (isLastLecture || !nextSlug)
                ? "bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-600 hover:to-purple-400"
                : isLastLecture || !nextSlug
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                : "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] hover:opacity-95"
            }`}
          >
            <div className="min-w-0 flex-1 pr-3">
              <div className="flex items-center gap-1.5">
                {nextQuizId && (isLastLecture || !nextSlug)
                  ? <FiHelpCircle size={12} />
                  : (isLastLecture || !nextSlug)
                  ? <FiAward size={12} />
                  : null}
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                  {nextLabel}
                </span>
              </div>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                {nextSub}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white group-hover:translate-x-0.5 transition-transform flex-shrink-0">
              <FiArrowRight size={16} />
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}

// ── Bottom completion + navigation bar ───────────────────────────────────────

export function LectureBottomBar(props: LectureNavigationProps) {
  const router = useRouter();

  const [completed, setCompleted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [fetching,  setFetching]  = useState(true);

  const {
    lectureId, courseSlug,
    prevSlug, prevTitle,
    nextSlug, nextTitle,
    isLastLecture, isNextSection, nextSectionTitle,
  } = props;

  // Load current completion state
  useEffect(() => {
    fetch(`/api/progress?lectureId=${lectureId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success && d.data) setCompleted(d.data.completed ?? false); })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [lectureId]);

  const markComplete = async () => {
    if (loading) return;
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
  };

  const handleNext = async () => {
    if (!completed) {
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
    }

    const { nextQuizId } = props;
    if (nextQuizId) {
      // Must pass module quiz before moving to next module
      router.push(`/courses/${courseSlug}/learn/quiz/${nextQuizId}`);
    } else if (nextSlug) {
      router.push(`/courses/${courseSlug}/learn/${nextSlug}`);
    } else if (isLastLecture) {
      // Last lecture in the course — go to completion/certificate page
      router.push(`/courses/${courseSlug}/complete`);
    } else {
      router.push(`/courses/${courseSlug}`);
    }
  };

  // ── Next button label ──────────────────────────────────────────────────────
  const { nextQuizId: bottomQuizId } = props;
  let nextLabel = "Next Lesson";
  if (bottomQuizId && !nextSlug) {
    nextLabel = "Take Quiz";
  } else if (isLastLecture || !nextSlug) {
    nextLabel = "Finish Course 🎉";
  } else if (isNextSection) {
    nextLabel = nextSectionTitle ? `Next: ${nextSectionTitle}` : "Next Section";
  }

  const prevHref = prevSlug
    ? `/courses/${courseSlug}/learn/${prevSlug}`
    : `/courses/${courseSlug}`;

  return (
    <div className="sticky bottom-0 z-30 bg-[var(--bg-secondary)] border-t border-[var(--border)] px-4 sm:px-6 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">

        {/* Prev / Back */}
        <Link
          href={prevHref}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-[var(--border)] transition-colors flex-shrink-0"
          title={prevTitle ?? "Back"}
        >
          <FiChevronLeft size={16} />
          <span className="hidden sm:inline max-w-[120px] truncate">
            {prevTitle ? `Back: ${prevTitle}` : "Back"}
          </span>
          <span className="sm:hidden">Back</span>
        </Link>

        {/* Mark complete button */}
        <button
          onClick={() => void markComplete()}
          disabled={loading || fetching}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all duration-200 disabled:opacity-60 flex-shrink-0 ${
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
          <span>{completed ? "Completed ✓" : "Mark Complete"}</span>
        </button>

        {/* Next / Continue Action */}
        <button
          onClick={() => void handleNext()}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white transition-colors flex-shrink-0 ${
            bottomQuizId && !nextSlug
              ? "bg-purple-600 hover:bg-purple-500"
              : isLastLecture || !nextSlug
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-[var(--accent)] hover:bg-[var(--accent-light)]"
          }`}
        >
          <span className="max-w-[160px] truncate">{nextLabel}</span>
          <FiArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

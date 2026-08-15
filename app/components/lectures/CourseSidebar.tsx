"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiChevronLeft, FiChevronDown, FiCheckCircle,
  FiPlayCircle, FiFileText, FiHeadphones, FiFile,
  FiLock, FiX, FiMenu, FiHelpCircle,
} from "react-icons/fi";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LectureNav {
  id:        string;
  title:     string;
  slug:      string;
  type:      string;
  duration:  number | null;
  order:     number;
  completed: boolean;
  locked:    boolean;
}

interface ModuleNav {
  id:             string;
  title:          string;
  order:          number;
  lectures:       LectureNav[];
  completedCount: number;
  quizzes:        { id: string; title: string }[];
  _count:         { lectures: number; quizzes: number };
}

interface CurriculumData {
  courseId:           string;
  courseTitle:        string;
  courseSlug:         string;
  sequentialLearning: boolean;
  modules:            ModuleNav[];
  totalLectures:      number;
  totalCompleted:     number;
  percent:            number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSeconds(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? (s ? `${m}m ${s}s` : `${m}m`) : `${sec}s`;
}

const typeIcon: Record<string, React.ReactNode> = {
  VIDEO: <FiPlayCircle size={12} />,
  TEXT:  <FiFileText   size={12} />,
  AUDIO: <FiHeadphones size={12} />,
  PDF:   <FiFile       size={12} />,
};

// ── Main component ────────────────────────────────────────────────────────────

interface CourseSidebarProps {
  courseId:   string;
  courseSlug: string;
  /** Called whenever a lecture is marked complete inside the sidebar */
  onProgressChange?: () => void;
}

export function CourseSidebar({
  courseId,
  courseSlug,
  onProgressChange,
}: CourseSidebarProps) {
  const pathname = usePathname();
  // Active lecture is derived from the URL itself (…/learn/{lectureSlug}),
  // so the sidebar never needs the page to hand it a prop, and never
  // needs to remount when navigating between lectures.
  const activeLectureSlug = useMemo(() => pathname.split("/").filter(Boolean).pop() ?? "", [pathname]);

  const [data,      setData]      = useState<CurriculumData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [collapsed, setCollapsed] = useState(false);   // desktop collapse
  const [mobileOpen, setMobileOpen] = useState(false); // mobile drawer

  // Track which modules are open
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  // Fetch curriculum once per course — NOT on every lecture navigation.
  // Re-fetching on every lecture change was causing the whole sidebar to
  // flash back to its loading skeleton each time a student clicked
  // Next/Previous, which is exactly the "leaving the classroom" feeling
  // this redesign is meant to remove.
  const load = useCallback(async () => {
    try {
      const res  = await fetch(`/api/courses/${courseId}/curriculum`);
      const json = await res.json();
      if (json.success) setData(json.data as CurriculumData);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { void load(); }, [load]);

  // Auto-open (and keep open) whichever module contains the active lecture.
  // This runs on every pathname change, but only touches which section is
  // expanded — it never resets `data`/`loading`, so there's no flicker.
  useEffect(() => {
    if (!data) return;
    const activeModule = data.modules.find((m) =>
      m.lectures.some((l) => l.slug === activeLectureSlug),
    );
    if (activeModule) {
      setOpenModules((prev) => new Set(prev).add(activeModule.id));
    }
  }, [data, activeLectureSlug]);

  // Re-fetch when a lecture is marked complete (so % and checkmarks update)
  const refresh = useCallback(() => { void load(); onProgressChange?.(); }, [load, onProgressChange]);

  const toggleModule = (id: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Sidebar inner content ─────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Course title header */}
      <div className="px-4 py-4 border-b border-[var(--border)] flex-shrink-0">
        {data ? (
          <>
            <Link
              href={`/courses/${data.courseSlug}`}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors flex items-center gap-1 mb-2"
            >
              <FiChevronLeft size={12} /> Back to course
            </Link>
            <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-snug">
              {data.courseTitle}
            </p>

            {/* Overall progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                <span>{data.totalCompleted} / {data.totalLectures} lessons</span>
                <span className="font-semibold text-[var(--text-primary)]">{data.percent}%</span>
              </div>
              <div
                className="h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden"
                role="progressbar"
                aria-valuenow={data.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                  style={{ width: `${data.percent}%` }}
                />
              </div>
            </div>

            {data.sequentialLearning && (
              <p className="flex items-center gap-1.5 mt-2.5 text-[10px] text-[var(--text-muted)]">
                <FiLock size={9} />
                Lessons unlock in order
              </p>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded shimmer" />
            <div className="h-2 w-full rounded shimmer" />
          </div>
        )}
      </div>

      {/* Module + lecture list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 rounded shimmer" />
                <div className="h-3 w-5/6 rounded shimmer ml-3" />
                <div className="h-3 w-4/6 rounded shimmer ml-3" />
              </div>
            ))}
          </div>
        ) : data?.modules.map((mod) => {
          const isOpen      = openModules.has(mod.id);
          const hasActive   = mod.lectures.some((l) => l.slug === activeLectureSlug);
          const isComplete  = mod.completedCount === mod._count.lectures && mod._count.lectures > 0;

          return (
            <div key={mod.id} className="border-b border-[var(--border-subtle)]">

              {/* Module header */}
              <button
                onClick={() => toggleModule(mod.id)}
                className={`w-full flex items-start gap-2.5 px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg-card-hover)] ${
                  hasActive ? "bg-[var(--accent-dim)]" : ""
                }`}
                aria-expanded={isOpen}
              >
                <FiChevronDown
                  size={14}
                  className={`flex-shrink-0 mt-0.5 text-[var(--text-muted)] transition-transform duration-200 ${
                    isOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
                    {mod.title}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {mod.completedCount}/{mod._count.lectures} lessons
                    {isComplete && (
                      <span className="ml-1.5 text-emerald-400">✓</span>
                    )}
                  </p>
                </div>
              </button>

              {/* Lecture list */}
              {isOpen && (
                <div className="bg-[var(--bg-primary)]">
                  {mod.lectures.map((lec, lIdx) => {
                    const isActive = lec.slug === activeLectureSlug;

                    const indicator = lec.locked ? (
                      <span
                        className="w-5 h-5 rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center justify-center"
                        aria-label="Locked"
                      >
                        <FiLock size={10} />
                      </span>
                    ) : lec.completed ? (
                      <span
                        className="w-5 h-5 rounded-full bg-emerald-400/15 border border-emerald-400 flex items-center justify-center"
                        aria-label="Completed"
                      >
                        <FiCheckCircle size={11} className="text-emerald-400" />
                      </span>
                    ) : isActive ? (
                      <span
                        className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[9px] font-bold flex items-center justify-center"
                        aria-label="Current lesson"
                      >
                        {lIdx + 1}
                      </span>
                    ) : (
                      <span
                        className="w-5 h-5 rounded-full border border-[var(--border-strong)] text-[var(--text-muted)] text-[9px] font-semibold flex items-center justify-center"
                        aria-label={`Lesson ${lIdx + 1}`}
                      >
                        {lIdx + 1}
                      </span>
                    );

                    const rowContent = (
                      <>
                        <div className="flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                          {indicator}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-snug line-clamp-2 ${
                            lec.locked
                              ? "text-[var(--text-muted)]"
                              : isActive
                              ? "text-[var(--accent)] font-semibold"
                              : lec.completed
                              ? "text-[var(--text-muted)]"
                              : "text-[var(--text-secondary)]"
                          }`}>
                            {lec.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[var(--text-muted)]">
                              {typeIcon[lec.type] ?? typeIcon.TEXT}
                            </span>
                            {lec.duration && lec.duration > 0 && (
                              <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                                {fmtSeconds(lec.duration)}
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    );

                    if (lec.locked) {
                      return (
                        <div
                          key={lec.id}
                          className="flex items-start gap-2.5 px-4 py-3 border-b border-[var(--border-subtle)] opacity-60 cursor-not-allowed"
                          title="Complete the previous lessons to unlock this one"
                          aria-disabled="true"
                        >
                          {rowContent}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={lec.id}
                        href={`/courses/${courseSlug}/learn/${lec.slug}`}
                        className={`flex items-start gap-2.5 px-4 py-3 border-b border-[var(--border-subtle)] transition-colors ${
                          isActive
                            ? "bg-[var(--accent-dim)] border-l-2 border-l-[var(--accent)]"
                            : "hover:bg-[var(--bg-card-hover)]"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {rowContent}
                      </Link>
                    );
                  })}

                  {/* Quiz links — shown at the bottom of each module */}
                  {mod.quizzes && mod.quizzes.length > 0 && mod.quizzes.map((quiz) => (
                    <Link
                      key={quiz.id}
                      href={`/quiz/${quiz.id}`}
                      className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-colors group"
                    >
                      <span className="w-5 h-5 rounded-full bg-purple-500/15 border border-purple-400/50 flex items-center justify-center flex-shrink-0">
                        <FiHelpCircle size={10} className="text-purple-400" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-purple-400 font-medium leading-snug truncate group-hover:text-purple-300 transition-colors">
                          {quiz.title}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Module Quiz</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`hidden lg:flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border)] transition-all duration-300 h-screen sticky top-0 flex-shrink-0 ${
          collapsed ? "w-12" : "w-72"
        }`}
        aria-label="Course curriculum"
      >
        {collapsed ? (
          // Collapsed — show only toggle button
          <div className="flex flex-col items-center pt-4 gap-4">
            <button
              onClick={() => setCollapsed(false)}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              aria-label="Expand sidebar"
            >
              <FiMenu size={18} />
            </button>
          </div>
        ) : (
          <>
            {/* Collapse button */}
            <button
              onClick={() => setCollapsed(true)}
              className="absolute top-3 right-3 p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors z-10"
              aria-label="Collapse sidebar"
            >
              <FiChevronLeft size={14} />
            </button>
            <SidebarContent />
          </>
        )}
      </aside>

      {/* ── Mobile: floating button + drawer ────────────────────────────── */}
      <div className="lg:hidden">
        {/* Toggle button (fixed bottom-left) */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-20 left-4 z-40 flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-xl shadow-[var(--shadow-md)] text-xs font-medium text-[var(--text-primary)]"
          aria-label="Open course curriculum"
        >
          <FiMenu size={14} className="text-[var(--accent)]" />
          <span>Curriculum</span>
          {data && (
            <span className="ml-1 text-[var(--text-muted)]">{data.percent}%</span>
          )}
        </button>

        {/* Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Course curriculum"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Course Content</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Close"
            >
              <FiX size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarContent />
          </div>
        </div>
      </div>
    </>
  );
}

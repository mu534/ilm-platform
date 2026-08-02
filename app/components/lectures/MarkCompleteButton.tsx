"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FiCheckCircle, FiCircle, FiLoader, FiArrowRight } from "react-icons/fi";

interface Props {
  lectureId:  string;
  courseId?:  string | null;
  /** If provided, shown as a "Next Lesson" button after marking complete */
  nextSlug?:  string | null;
}

export function MarkCompleteButton({ lectureId, courseId, nextSlug }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [completed, setCompleted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [fetching,  setFetching]  = useState(true);
  const [justDone,  setJustDone]  = useState(false);

  useEffect(() => {
    if (!session) { setFetching(false); return; }
    fetch(`/api/progress?lectureId=${lectureId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) setCompleted(d.data.completed ?? false);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [lectureId, session]);

  if (!session || fetching) return null;

  const toggle = async () => {
    setLoading(true);
    const newValue = !completed;
    try {
      const res  = await fetch("/api/progress", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lectureId, completed: newValue }),
      });
      const data = await res.json();
      if (data.success) {
        setCompleted(newValue);
        if (newValue) setJustDone(true); // show next lesson prompt
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={completed ? "Mark as incomplete" : "Mark as complete"}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border disabled:opacity-60 disabled:cursor-not-allowed ${
          completed
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
            : "border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)]"
        }`}
      >
        {loading ? (
          <FiLoader className="animate-spin" size={15} />
        ) : completed ? (
          <FiCheckCircle size={15} className="fill-current" />
        ) : (
          <FiCircle size={15} />
        )}
        {completed ? "Completed" : "Mark Complete"}
      </button>

      {/* Next lesson button — appears briefly after marking complete */}
      {justDone && nextSlug && (
        <button
          onClick={() => router.push(`/lectures/${nextSlug}`)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white transition-all duration-200 hover:scale-105 active:scale-95 animate-fadeInUp"
        >
          Next Lesson <FiArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

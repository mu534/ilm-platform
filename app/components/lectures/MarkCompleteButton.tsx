"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FiCheckCircle, FiCircle, FiLoader } from "react-icons/fi";

interface Props {
  lectureId: string;
  courseId?: string | null;
}

export function MarkCompleteButton({ lectureId, courseId }: Props) {
  const { data: session } = useSession();
  const [completed, setCompleted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [fetching,  setFetching]  = useState(true);

  // Load current progress state
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
      const res = await fetch("/api/progress", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lectureId, completed: newValue }),
      });
      const data = await res.json();
      if (data.success) {
        setCompleted(newValue);
      }
    } catch {
      // silent fail — UI already reverted on next render
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
}

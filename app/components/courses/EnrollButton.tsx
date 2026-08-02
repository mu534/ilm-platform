"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiLoader, FiCheckCircle } from "react-icons/fi";

interface EnrollButtonProps {
  courseId:   string;
  courseSlug: string;
  isLoggedIn: boolean;
}

export function EnrollButton({ courseId, courseSlug, isLoggedIn }: EnrollButtonProps) {
  const router    = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="space-y-3">
        <Link
          href={`/login?callbackUrl=/courses/${courseSlug}`}
          className="block w-full text-center py-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold text-sm transition-colors"
        >
          Sign In to Enroll
        </Link>
        <p className="text-xs text-[var(--text-muted)] text-center">
          Free · Start learning immediately
        </p>
      </div>
    );
  }

  const handleEnroll = async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
      const data = await res.json();

      if (!data.success) {
        if (res.status === 409) { router.refresh(); return; }
        setError(data.error ?? "Enrollment failed. Please try again.");
        return;
      }

      setSuccess(true);

      try {
        const nextRes  = await fetch(`/api/courses/${courseId}/next-lecture`);
        const nextData = await nextRes.json();
        if (nextData.success && nextData.data?.slug) {
          setTimeout(() => router.push(`/lectures/${nextData.data.slug}`), 800);
          return;
        }
      } catch { /* fall through */ }

      setTimeout(() => router.refresh(), 600);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-2">
        <div className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <FiCheckCircle size={15} />
          Enrolled! Loading your first lesson…
        </div>
        <div className="w-full h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full animate-pulse" style={{ width: "65%" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? <><FiLoader className="animate-spin" size={15} /> Enrolling…</> : "Enroll Now — Free"}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      <p className="text-xs text-[var(--text-muted)] text-center">
        Free · Learn at your own pace
      </p>
    </div>
  );
}

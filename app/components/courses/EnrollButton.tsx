"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiBookOpen, FiLoader, FiCheckCircle } from "react-icons/fi";

interface EnrollButtonProps {
  courseId:   string;
  courseSlug: string;
  isLoggedIn: boolean;
}

export function EnrollButton({ courseId, courseSlug, isLoggedIn }: EnrollButtonProps) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="space-y-3">
        <Link
          href={`/login?callbackUrl=/courses/${courseSlug}`}
          className="block w-full text-center py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-md shadow-gold-600/30"
        >
          Sign In to Enroll
        </Link>
        <p className="text-xs text-[var(--text-muted)] text-center">
          Free enrollment · Learn at your own pace
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
        // If already enrolled, just refresh the page to show the progress component
        if (res.status === 409) {
          router.refresh();
          return;
        }
        setError(data.error ?? "Enrollment failed. Please try again.");
        return;
      }

      // Enrollment successful — show brief success state then navigate to first lecture
      setSuccess(true);

      // Try to get the first lecture to start learning immediately
      try {
        const nextRes  = await fetch(`/api/courses/${courseId}/next-lecture`);
        const nextData = await nextRes.json();
        if (nextData.success && nextData.data?.slug) {
          // Small delay so the user sees the success state
          setTimeout(() => {
            router.push(`/lectures/${nextData.data.slug}`);
          }, 800);
          return;
        }
      } catch {
        // Fall through to page refresh
      }

      // Fallback: refresh the course page to show CourseProgress
      setTimeout(() => {
        router.refresh();
      }, 600);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-3">
        <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <FiCheckCircle size={16} />
          Enrolled! Starting your course…
        </div>
        <div className="w-full h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 animate-pulse rounded-full" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-gold-600/30"
      >
        {loading ? (
          <><FiLoader className="animate-spin" size={16} /> Enrolling…</>
        ) : (
          <><FiBookOpen size={16} /> Enroll Now — Free</>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-400 text-center px-2">{error}</p>
      )}
      <p className="text-xs text-[var(--text-muted)] text-center">
        Free · Learn at your own pace · Start immediately
      </p>
    </div>
  );
}

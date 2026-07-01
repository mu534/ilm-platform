"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiBookOpen, FiLoader } from "react-icons/fi";

interface EnrollButtonProps {
  courseId:   string;
  courseSlug: string;
  isLoggedIn: boolean;
}

export function EnrollButton({ courseId, courseSlug, isLoggedIn }: EnrollButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  if (!isLoggedIn) {
    return (
      <Link
        href={`/login?callbackUrl=/courses/${courseSlug}`}
        className="block w-full text-center py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-md shadow-gold-600/30"
      >
        Sign In to Enroll
      </Link>
    );
  }

  const handleEnroll = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Enrollment failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-gold-600/30"
      >
        {loading ? (
          <FiLoader className="animate-spin" size={16} />
        ) : (
          <FiBookOpen size={16} />
        )}
        {loading ? "Enrolling..." : "Enroll Now — Free"}
      </button>
      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
      <p className="text-xs text-[var(--text-muted)] text-center">
        Free enrollment · Learn at your own pace
      </p>
    </div>
  );
}

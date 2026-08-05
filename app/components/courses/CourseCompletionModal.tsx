"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FiAward, FiStar, FiArrowRight, FiX,
  FiCheckCircle, FiDownload, FiBookOpen,
} from "react-icons/fi";

interface CompletionStats {
  completedCount: number;
  totalCount:     number;
}

interface Certificate {
  id: string;
  course: { id: string };
}

interface RecommendedCourse {
  id:           string;
  title:        string;
  slug:         string;
  thumbnailUrl: string | null;
  difficulty:   string;
}

interface CourseCompletionModalProps {
  courseId:    string;
  courseSlug:  string;
  courseTitle: string;
  categoryId?: string | null;
  onClose:     () => void;
}

export function CourseCompletionModal({
  courseId,
  courseSlug,
  courseTitle,
  categoryId,
  onClose,
}: CourseCompletionModalProps) {
  const [stats,       setStats]       = useState<CompletionStats | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [recommended, setRecommended] = useState<RecommendedCourse[]>([]);

  useEffect(() => {
    // Final stats for this course
    fetch(`/api/progress?courseId=${courseId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.data); })
      .catch(() => {});

    // Was a certificate already issued (e.g. via a final quiz)?
    fetch(`/api/certificates`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const match = (d.data as Certificate[]).find((c) => c.course.id === courseId);
          if (match) setCertificate(match);
        }
      })
      .catch(() => {});

    // A few recommended next courses
    const qs = categoryId ? `?categoryId=${categoryId}&pageSize=4` : "?pageSize=4";
    fetch(`/api/courses${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const list = (d.data.items ?? []) as RecommendedCourse[];
          setRecommended(list.filter((c) => c.id !== courseId).slice(0, 3));
        }
      })
      .catch(() => {});
  }, [courseId, categoryId]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-heading"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl shadow-[var(--shadow-lg)] animate-fadeInUp">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Close"
        >
          <FiX size={18} />
        </button>

        <div className="p-8 text-center border-b border-[var(--border)]">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto mb-5">
            <FiAward className="text-[var(--accent)] text-2xl" />
          </div>
          <h2 id="completion-heading" className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
            Course Complete!
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            You&apos;ve finished every lesson in{" "}
            <span className="text-[var(--text-secondary)] font-semibold">{courseTitle}</span>.
            Congratulations on your dedication.
          </p>

          {stats && (
            <div className="flex items-center justify-center gap-6 mt-6">
              <div>
                <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{stats.completedCount}</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Lessons Completed</p>
              </div>
              <div className="w-px h-8 bg-[var(--border)]" />
              <div>
                <p className="text-xl font-bold text-emerald-400 tabular-nums">100%</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Progress</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-3 border-b border-[var(--border)]">
          {certificate ? (
            <a
              href={`/api/certificates/${certificate.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold text-sm transition-colors"
            >
              <FiDownload size={14} /> Download Certificate
            </a>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] px-1">
              <FiCheckCircle size={13} className="flex-shrink-0" />
              A certificate becomes available if this course includes a final assessment.
            </div>
          )}

          <Link
            href={`/courses/${courseSlug}#reviews`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] font-medium text-sm transition-colors"
          >
            <FiStar size={14} /> Leave a Review
          </Link>
        </div>

        {recommended.length > 0 && (
          <div className="p-6">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Continue Learning
            </p>
            <div className="space-y-2">
              {recommended.map((c) => (
                <Link
                  key={c.id}
                  href={`/courses/${c.slug}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-card-hover)] transition-colors group"
                >
                  <div className="relative w-14 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--bg-secondary)]">
                    {c.thumbnailUrl && (
                      <Image src={c.thumbnailUrl} alt={c.title} fill className="object-cover" />
                    )}
                  </div>
                  <span className="flex-1 min-w-0 text-sm text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors truncate">
                    {c.title}
                  </span>
                  <FiArrowRight size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 pt-0">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <FiBookOpen size={13} /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

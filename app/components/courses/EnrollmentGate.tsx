import Link from "next/link";
import { FiLock, FiBookOpen } from "react-icons/fi";

interface EnrollmentGateProps {
  courseSlug:   string;
  courseTitle:  string;
  /** Optional — shown when we know exactly which lesson triggered the gate */
  lectureTitle?: string;
}

/**
 * Shown in place of the classroom workspace when a visitor isn't enrolled
 * (or isn't logged in) and tries to open a course lecture.
 */
export function EnrollmentGate({ courseSlug, courseTitle, lectureTitle }: EnrollmentGateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 hero-bg opacity-50" />
      <div className="absolute inset-0 pattern-overlay opacity-30" />

      <div className="relative w-full max-w-md text-center animate-fadeInUp">
        <div className="glass-card rounded-2xl p-10 border border-[var(--border-strong)]">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto mb-6">
            <FiLock className="text-[var(--accent)] text-2xl" />
          </div>

          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
            Enrollment Required
          </h1>
          {lectureTitle && (
            <p className="text-[var(--text-muted)] text-sm mb-1">
              <span className="font-semibold text-[var(--text-secondary)]">
                &ldquo;{lectureTitle}&rdquo;
              </span>
            </p>
          )}
          <p className="text-[var(--text-muted)] text-sm mb-8">
            is part of{" "}
            <span className="font-semibold text-[var(--text-secondary)]">{courseTitle}</span>.
            Enroll to access this and all other lessons.
          </p>

          <div className="flex flex-col gap-3">
            <Link href={`/courses/${courseSlug}`} className="btn-primary w-full text-center">
              <FiBookOpen size={14} /> View Course &amp; Enroll
            </Link>
            <Link href="/courses" className="btn-secondary w-full text-center text-sm">
              Browse All Courses
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

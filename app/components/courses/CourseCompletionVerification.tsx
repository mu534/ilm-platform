"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiAward, FiCheckCircle, FiUser, FiAlertCircle,
  FiDownload, FiArrowRight, FiBookOpen, FiEdit2,
  FiLoader, FiLock, FiShare2,
} from "react-icons/fi";

interface Props {
  courseId:           string;
  courseSlug:         string;
  courseTitle:        string;
  enrollmentStatus:   string;
  currentName:        string;
  certificateEnabled: boolean;
  existingCertId:     string | null;
  existingCertDbId:   string | null;
  completedLectures:  number;
  totalRequired:      number;
  passedQuizzes:      number;
  totalQuizzes:       number;
  firstLectureSlug:   string | null;
}

// ── Step indicator ─────────────────────────────────────────────────────────

function StepDots({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {([1, 2, 3] as const).map((n) => (
        <div
          key={n}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            n === current
              ? "w-8 bg-[var(--accent)]"
              : n < current
              ? "w-4 bg-emerald-500/60"
              : "w-4 bg-[var(--border-strong)]"
          }`}
        />
      ))}
    </div>
  );
}

export function CourseCompletionVerification({
  courseId,
  courseSlug,
  courseTitle,
  enrollmentStatus,
  currentName,
  certificateEnabled,
  existingCertId,
  existingCertDbId,
  completedLectures,
  totalRequired,
  passedQuizzes,
  totalQuizzes,
  firstLectureSlug,
}: Props) {
  const [name,       setName]       = useState(currentName);
  const [nameEditing, setNameEditing] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [certDbId,   setCertDbId]   = useState(existingCertDbId);
  const [certPubId,  setCertPubId]  = useState(existingCertId);
  const [error,      setError]      = useState("");
  const [nameApproved, setNameApproved] = useState(false);

  // If cert already exists go straight to success
  const [step, setStep] = useState<1 | 2 | 3>(
    existingCertId ? 3 : 1
  );

  const isCompleted = enrollmentStatus === "COMPLETED";

  // ── Step 1: Approve name ──────────────────────────────────────────────────
  const approveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setError("Please enter your full name (at least 2 characters)");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res  = await fetch("/api/account", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ certificateName: trimmed }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!data.success) { setError(data.error ?? "Failed to save name"); return; }
      setNameApproved(true);
      setNameEditing(false);
      setStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2: Generate certificate ─────────────────────────────────────────
  const generateCertificate = async () => {
    setGenerating(true);
    setError("");
    try {
      // Ensure name is saved
      await fetch("/api/account", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ certificateName: name.trim() }),
      });

      const res  = await fetch(`/api/courses/${courseId}/claim-certificate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json() as {
        success?: boolean;
        data?: { id: string; certificateId: string };
        error?: string;
      };

      if (data.success && data.data) {
        setCertDbId(data.data.id);
        setCertPubId(data.data.certificateId);
        setStep(3);
      } else {
        setError(data.error ?? "Could not generate certificate. Make sure all course requirements are met.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // NOT COMPLETED — show requirements missing
  // ─────────────────────────────────────────────────────────────────────────
  if (!isCompleted) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="glass-card rounded-3xl p-8 border border-amber-500/20 bg-amber-500/5 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
              <FiLock className="text-amber-400" size={28} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
                Course Not Yet Complete
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                Complete all required lessons and quizzes to earn your certificate.
              </p>
            </div>

            {/* Progress */}
            <div className="text-left space-y-3 bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Lessons</span>
                <span className={`font-semibold ${completedLectures >= totalRequired ? "text-emerald-400" : "text-amber-400"}`}>
                  {completedLectures}/{totalRequired}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${totalRequired > 0 ? Math.min(100,(completedLectures/totalRequired)*100) : 0}%` }} />
              </div>
              {totalQuizzes > 0 && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Quizzes</span>
                    <span className={`font-semibold ${passedQuizzes >= totalQuizzes ? "text-emerald-400" : "text-amber-400"}`}>
                      {passedQuizzes}/{totalQuizzes} passed
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{ width: `${Math.min(100,(passedQuizzes/totalQuizzes)*100)}%` }} />
                  </div>
                </>
              )}
            </div>

            <Link
              href={`/courses/${courseSlug}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold text-sm transition-all"
            >
              <FiBookOpen size={14} /> Continue Learning <FiArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CERT NOT ENABLED
  // ─────────────────────────────────────────────────────────────────────────
  if (isCompleted && !certificateEnabled) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full glass-card rounded-3xl p-8 border border-[var(--border)] text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto">
            <FiAward className="text-[var(--accent)]" size={28} />
          </div>
          <h1 className="font-display text-xl font-bold text-[var(--text-primary)]">Course Completed!</h1>
          <p className="text-sm text-[var(--text-muted)]">
            The certificate for <strong className="text-[var(--text-primary)]">{courseTitle}</strong> is
            pending administrator approval. Check back soon.
          </p>
          <Link href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            <FiArrowRight size={13} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Verify Certificate Name
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          <StepDots current={1} />

          <div className="glass-card rounded-3xl p-8 border border-[var(--border-strong)] space-y-6">
            {/* Icon */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto mb-4">
                <FiUser className="text-[var(--accent)]" size={28} />
              </div>
              <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-1">
                Verify Your Certificate Name
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                This name will appear on your certificate. Please make sure it is correct.
              </p>
            </div>

            {/* Name input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Certificate Name
              </label>
              {nameEditing || !name.trim() ? (
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  placeholder="Your full name e.g. Ahmad Ibn Ibrahim"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && void approveName()}
                  className="w-full px-4 py-3.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              ) : (
                <div className="flex items-center justify-between px-4 py-3.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{name}</span>
                  <button
                    onClick={() => setNameEditing(true)}
                    className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors ml-3 flex-shrink-0"
                  >
                    <FiEdit2 size={12} /> Edit
                  </button>
                </div>
              )}
              <p className="text-[11px] text-[var(--text-muted)]">
                This name <strong className="text-[var(--text-primary)]">cannot be changed</strong> after the certificate is generated.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <FiAlertCircle size={12} className="flex-shrink-0" /> {error}
              </div>
            )}

            <button
              onClick={() => void approveName()}
              disabled={saving || !name.trim()}
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] hover:opacity-95 text-white font-bold text-sm transition-all shadow-md disabled:opacity-60 hover:scale-[1.005]"
            >
              {saving
                ? <><FiLoader className="animate-spin" size={15} /> Saving…</>
                : <><FiCheckCircle size={15} /> Approve &amp; Continue</>}
            </button>
          </div>

          <Link href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <FiArrowRight size={13} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Generate Certificate
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          <StepDots current={2} />

          <div className="glass-card rounded-3xl p-8 border border-[var(--border-strong)] space-y-6 text-center">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto">
              <FiAward className="text-[var(--accent)]" size={28} />
            </div>

            <div>
              <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
                Generate Your Certificate
              </h1>
              <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">
                Your certificate will be issued with the name:
              </p>
              <div className="mt-3 px-4 py-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] inline-block">
                <p className="text-sm font-bold text-[var(--text-primary)]">{name}</p>
                <p className="text-[11px] text-[var(--text-muted)]">Certificate name</p>
              </div>
            </div>

            {/* Course info */}
            <div className="text-left space-y-2 bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Course</span>
                <span className="font-semibold text-[var(--text-primary)] text-right max-w-[200px]">{courseTitle}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Status</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <FiCheckCircle size={11} /> Completed
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Date</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left">
                <FiAlertCircle size={12} className="flex-shrink-0" /> {error}
              </div>
            )}

            <button
              onClick={() => void generateCertificate()}
              disabled={generating}
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] hover:opacity-95 text-white font-bold text-sm transition-all shadow-md disabled:opacity-60 hover:scale-[1.005]"
            >
              {generating
                ? <><FiLoader className="animate-spin" size={15} /> Generating Certificate…</>
                : <><FiAward size={15} /> Generate Your Certificate</>}
            </button>

            <button
              onClick={() => { setStep(1); setNameEditing(true); setError(""); }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              ← Edit name
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3 — Certificate Success (matches screenshot)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="glass-card rounded-3xl overflow-hidden border border-[var(--border-strong)]">

          {/* Top emerald glow zone — matches screenshot dark card with green icon */}
          <div
            className="relative flex flex-col items-center pt-10 pb-6 px-8"
            style={{
              background: "radial-gradient(ellipse 90% 70% at 50% 0%, rgba(16,185,129,0.15), transparent 80%)",
            }}
          >
            {/* Badge icon */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/10">
              <FiAward className="text-emerald-400" size={40} />
            </div>

            {/* CERTIFICATE ISSUED pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[11px] font-bold tracking-widest uppercase mb-4">
              <FiCheckCircle size={10} /> Certificate Issued
            </div>

            {/* Headline */}
            <h1 className="font-display text-3xl font-bold text-[var(--text-primary)] mb-2">
              Congratulations! 🎉
            </h1>
            <p className="text-sm text-[var(--text-muted)] text-center">
              You have successfully completed{" "}
              <strong className="text-[var(--text-primary)]">{courseTitle}</strong>
            </p>

            {/* Certificate ID */}
            {certPubId && (
              <p className="text-[11px] text-[var(--text-muted)] font-mono mt-3">
                Certificate ID:{" "}
                <span className="text-[var(--text-secondary)] select-all">{certPubId}</span>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 pb-8 space-y-2.5">
            {/* Download — solid green, most prominent */}
            {certDbId && (
              <a
                href={`/api/certificates/${certDbId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all hover:scale-[1.01]"
              >
                <FiDownload size={15} /> Download Certificate (PDF)
              </a>
            )}

            {/* Share / Verify */}
            {certPubId && (
              <Link
                href={`/certificates/verify/${certPubId}`}
                target="_blank"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] text-sm font-medium transition-colors"
              >
                <FiShare2 size={13} /> Share / Verify Certificate
              </Link>
            )}

            {/* Relearn */}
            {firstLectureSlug && (
              <Link
                href={`/courses/${courseSlug}/learn/${firstLectureSlug}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] text-sm transition-colors"
              >
                <FiBookOpen size={13} /> Relearn Course from Beginning
              </Link>
            )}

            {/* Leave a Review */}
            <Link
              href={`/courses/${courseSlug}#reviews`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors"
            >
              ⭐ Leave a Review
            </Link>

            {/* Back to Dashboard */}
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              <FiArrowRight size={13} /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

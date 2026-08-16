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
  /** Slug of the first lecture — used for the "Relearn" button */
  firstLectureSlug:   string | null;
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
  const [name,      setName]      = useState(currentName);
  const [editing,   setEditing]   = useState(!currentName.trim());
  const [saving,    setSaving]    = useState(false);
  const [certDbId,  setCertDbId]  = useState(existingCertDbId);
  const [certPubId, setCertPubId] = useState(existingCertId);
  const [error,     setError]     = useState("");
  const [step,      setStep]      = useState<"verify" | "done">(existingCertId ? "done" : "verify");

  const isCompleted = enrollmentStatus === "COMPLETED";

  // ── Save certificate name ─────────────────────────────────────────────────
  const saveName = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters)");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res  = await fetch("/api/account", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ certificateName: name.trim() }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!data.success) { setError(data.error ?? "Failed to save name"); return; }
      setEditing(false);
    } catch {
      setError("Something went wrong saving your name");
    } finally {
      setSaving(false);
    }
  };

  // ── Claim certificate ─────────────────────────────────────────────────────
  const claimCertificate = async () => {
    if (!name.trim()) { setError("Please confirm your name first"); return; }
    if (editing)      { setError("Please confirm your name before claiming"); return; }
    setSaving(true);
    setError("");
    try {
      // Persist the certificate name
      await fetch("/api/account", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ certificateName: name.trim() }),
      });

      // Issue the certificate
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
        setStep("done");
      } else {
        setError(data.error ?? "Could not issue certificate. Make sure all course requirements are met.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Certificate ready screen ──────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full">
          {/* Confetti-style hero */}
          <div className="relative glass-card rounded-3xl p-8 sm:p-10 border border-emerald-500/25 bg-gradient-to-b from-emerald-500/5 to-transparent text-center space-y-6 overflow-hidden">
            {/* Background glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(52,211,153,0.12), transparent)" }}
              aria-hidden="true"
            />

            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <FiAward className="text-emerald-400" size={44} />
              </div>
            </div>

            <div className="relative space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide">
                <FiCheckCircle size={11} /> CERTIFICATE ISSUED
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
                Congratulations! 🎉
              </h1>
              <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">
                You have successfully completed{" "}
                <strong className="text-[var(--text-primary)]">{courseTitle}</strong>
              </p>
              {certPubId && (
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
                  Certificate ID: <span className="text-[var(--text-secondary)]">{certPubId}</span>
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="relative space-y-2.5">
              {certDbId && (
                <a
                  href={`/api/certificates/${certDbId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md shadow-emerald-900/30 hover:scale-[1.01]"
                >
                  <FiDownload size={15} /> Download Certificate (PDF)
                </a>
              )}
              {certPubId && (
                <Link
                  href={`/certificates/verify/${certPubId}`}
                  target="_blank"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] text-sm font-medium transition-colors"
                >
                  <FiShare2 size={13} /> Share / Verify Certificate
                </Link>
              )}

              {/* Relearn — go back to first lecture */}
              {firstLectureSlug && (
                <Link
                  href={`/courses/${courseSlug}/learn/${firstLectureSlug}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] text-sm transition-colors"
                >
                  <FiBookOpen size={13} /> Relearn Course from Beginning
                </Link>
              )}

              <Link
                href={`/courses/${courseSlug}#reviews`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors"
              >
                ⭐ Leave a Review
              </Link>
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

  // ── Completion + name verification screen ────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-4">

        {/* ── Page header ── */}
        <div className="text-center space-y-3 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto">
            <FiAward className="text-[var(--accent)]" size={28} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {isCompleted ? "Claim Your Certificate" : "Course Progress"}
          </h1>
          <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
            {isCompleted
              ? `You've completed all requirements for ${courseTitle}. Confirm your name and claim your certificate.`
              : `Complete all required lessons and quizzes in ${courseTitle} to earn your certificate.`}
          </p>
        </div>

        {/* ── Progress checklist (always visible) ── */}
        <div className="glass-card rounded-2xl p-5 border border-[var(--border)] space-y-3">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Completion Status
          </p>
          <div className="space-y-2.5">
            {/* Lectures */}
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                totalRequired === 0 || completedLectures >= totalRequired
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}>
                {totalRequired === 0 || completedLectures >= totalRequired
                  ? <FiCheckCircle size={13} />
                  : <FiLock size={11} />}
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--text-primary)]">Required Lessons</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {totalRequired === 0
                    ? "No required lessons"
                    : `${completedLectures} / ${totalRequired} completed`}
                </p>
              </div>
              {totalRequired > 0 && (
                <div className="w-24 h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden flex-shrink-0">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${Math.min(100, (completedLectures / totalRequired) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Quizzes */}
            {totalQuizzes > 0 && (
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                  passedQuizzes >= totalQuizzes
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}>
                  {passedQuizzes >= totalQuizzes
                    ? <FiCheckCircle size={13} />
                    : <FiLock size={11} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-primary)]">Required Quizzes</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {passedQuizzes} / {totalQuizzes} passed
                  </p>
                </div>
                <div className="w-24 h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden flex-shrink-0">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${Math.min(100, (passedQuizzes / totalQuizzes) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── NOT completed — show what's missing ── */}
        {!isCompleted && (
          <div className="glass-card rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5 space-y-3">
            <p className="text-sm font-semibold text-amber-400 flex items-center gap-2">
              <FiAlertCircle size={14} /> Not yet complete
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {totalRequired > 0 && completedLectures < totalRequired && (
                <span>Complete {totalRequired - completedLectures} more lesson{totalRequired - completedLectures !== 1 ? "s" : ""}. </span>
              )}
              {totalQuizzes > 0 && passedQuizzes < totalQuizzes && (
                <span>Pass {totalQuizzes - passedQuizzes} more quiz{totalQuizzes - passedQuizzes !== 1 ? "zes" : ""}.</span>
              )}
            </p>
            <Link
              href={`/courses/${courseSlug}`}
              className="flex items-center gap-2 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] font-semibold transition-colors"
            >
              <FiBookOpen size={12} /> Continue Learning <FiArrowRight size={11} />
            </Link>
          </div>
        )}

        {/* ── Certificate not enabled ── */}
        {isCompleted && !certificateEnabled && (
          <div className="glass-card rounded-2xl p-5 border border-[var(--border)] space-y-2">
            <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <FiAward size={14} className="text-[var(--text-muted)]" /> Certificate Not Yet Available
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              The certificate for this course is pending administrator approval. You have completed all
              course requirements — check back soon.
            </p>
          </div>
        )}

        {/* ── Name verification (only when completed + cert enabled) ── */}
        {isCompleted && certificateEnabled && (
          <div className="glass-card rounded-2xl p-6 border border-[var(--border-strong)] space-y-4">
            <div className="flex items-center gap-2">
              <FiUser size={14} className="text-[var(--accent)]" />
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Your Certificate Name
              </p>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              This name will be printed on your certificate exactly as entered.
              Use your full legal name or preferred professional name. It{" "}
              <strong className="text-[var(--text-primary)]">cannot be changed</strong> after claiming.
            </p>

            {editing ? (
              <div className="space-y-3">
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  placeholder="Enter your full name e.g. Ahmad Ibn Ibrahim"
                  className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && void saveName()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => void saveName()}
                    disabled={saving || !name.trim()}
                    className="btn-primary text-sm flex items-center gap-2 px-4 py-2.5 disabled:opacity-50"
                  >
                    {saving
                      ? <><FiLoader className="animate-spin" size={13} /> Saving…</>
                      : <><FiCheckCircle size={13} /> Confirm Name</>}
                  </button>
                  {currentName && (
                    <button
                      onClick={() => { setName(currentName); setEditing(false); setError(""); }}
                      className="btn-secondary text-sm px-4 py-2.5"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Will appear on certificate</p>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors ml-3"
                >
                  <FiEdit2 size={11} /> Edit
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <FiAlertCircle size={12} className="flex-shrink-0" /> {error}
          </div>
        )}

        {/* ── Claim button ── */}
        {isCompleted && certificateEnabled && !editing && name.trim() && (
          <button
            onClick={() => void claimCertificate()}
            disabled={saving}
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] hover:opacity-95 text-white font-bold text-sm transition-all shadow-lg disabled:opacity-60 hover:scale-[1.01]"
          >
            {saving ? (
              <><FiLoader className="animate-spin" size={15} /> Generating Certificate…</>
            ) : (
              <><FiAward size={16} /> Claim Certificate</>
            )}
          </button>
        )}

        {/* ── Back link ── */}
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 w-full py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <FiBookOpen size={13} /> Back to Dashboard
        </Link>

      </div>
    </div>
  );
}

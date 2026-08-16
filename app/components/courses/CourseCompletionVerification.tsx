"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiAward, FiCheckCircle, FiUser, FiAlertCircle,
  FiDownload, FiArrowRight, FiBookOpen, FiEdit2, FiLoader,
} from "react-icons/fi";

interface Props {
  courseId:          string;
  courseSlug:        string;
  courseTitle:       string;
  enrollmentStatus:  string;
  currentName:       string;
  certificateEnabled: boolean;
  existingCertId:    string | null;
  existingCertDbId:  string | null;
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
}: Props) {
  const [name,     setName]     = useState(currentName);
  const [editing,  setEditing]  = useState(!currentName.trim());
  const [saving,   setSaving]   = useState(false);
  const [certId,   setCertId]   = useState(existingCertDbId);
  const [certPubId, setCertPubId] = useState(existingCertId);
  const [error,    setError]    = useState("");
  const [step,     setStep]     = useState<"verify" | "done">(existingCertId ? "done" : "verify");

  const isCompleted = enrollmentStatus === "COMPLETED";

  const saveName = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters)");
      return;
    }
    setSaving(true); setError("");
    try {
      const res  = await fetch("/api/account", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ certificateName: name.trim() }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!data.success) { setError(data.error ?? "Failed to save name"); return; }
      setEditing(false);
    } catch { setError("Something went wrong"); }
    finally { setSaving(false); }
  };

  const claimCertificate = async () => {
    if (!name.trim()) { setError("Please confirm your name first"); return; }
    setSaving(true); setError("");
    try {
      // Save name first if needed
      await fetch("/api/account", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ certificateName: name.trim() }),
      });

      // Trigger certificate issuance by marking the course as needing a cert check
      const res  = await fetch(`/api/courses/${courseId}/claim-certificate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json() as { success?: boolean; data?: { id: string; certificateId: string }; error?: string };
      if (data.success && data.data) {
        setCertId(data.data.id);
        setCertPubId(data.data.certificateId);
        setStep("done");
      } else {
        setError(data.error ?? "Could not issue certificate. Please ensure all course requirements are met.");
      }
    } catch { setError("Something went wrong"); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-6">

        {step === "done" ? (
          /* ── Certificate issued ── */
          <div className="glass-card rounded-3xl p-8 border border-emerald-500/20 bg-emerald-500/5 text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <FiAward className="text-emerald-400 text-4xl" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
                <FiCheckCircle size={12} /> CERTIFICATE READY
              </div>
              <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
                Congratulations! 🎉
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-2">
                You have completed <strong className="text-[var(--text-primary)]">{courseTitle}</strong>
              </p>
            </div>

            <div className="space-y-3">
              {certId && (
                <a
                  href={`/api/certificates/${certId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold text-sm transition-colors"
                >
                  <FiDownload size={14} /> Download Certificate
                </a>
              )}
              {certPubId && (
                <Link
                  href={`/certificates/verify/${certPubId}`}
                  target="_blank"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] text-sm transition-colors"
                >
                  <FiCheckCircle size={14} /> Verify Certificate
                </Link>
              )}
              <Link
                href={`/courses/${courseSlug}#reviews`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors"
              >
                Leave a Review
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              >
                <FiBookOpen size={13} /> Back to Dashboard
              </Link>
            </div>
          </div>

        ) : (
          /* ── Verification step ── */
          <div className="space-y-5">
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto mb-4">
                <FiAward className="text-[var(--accent)] text-2xl" />
              </div>
              <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
                {isCompleted ? "Claim Your Certificate" : "Almost There!"}
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-2 max-w-sm mx-auto">
                {isCompleted
                  ? "Please confirm your name exactly as you want it to appear on your certificate."
                  : "Complete all lessons and required quizzes to earn your certificate."}
              </p>
            </div>

            {/* Name verification */}
            {isCompleted && (
              <div className="glass-card rounded-2xl p-6 space-y-4 border border-[var(--border-strong)]">
                <div className="flex items-center gap-2">
                  <FiUser size={14} className="text-[var(--accent)]" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Your Certificate Name</p>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  This name will be printed on your certificate and cannot be changed afterwards.
                  Use your full legal name or preferred professional name.
                </p>

                {editing ? (
                  <div className="space-y-3">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                      onKeyDown={(e) => e.key === "Enter" && void saveName()}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => void saveName()}
                        disabled={saving || !name.trim()}
                        className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        {saving ? <FiLoader className="animate-spin" size={13} /> : <FiCheckCircle size={13} />}
                        Confirm Name
                      </button>
                      {currentName && (
                        <button onClick={() => { setName(currentName); setEditing(false); }} className="btn-secondary text-sm">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{name}</span>
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
                    >
                      <FiEdit2 size={11} /> Edit
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Status / requirement checklist */}
            {!isCompleted && (
              <div className="glass-card rounded-2xl p-5 space-y-3 border border-amber-500/20 bg-amber-500/5">
                <p className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                  <FiAlertCircle size={14} /> Requirements not yet met
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Complete all required lessons and pass all required quizzes in{" "}
                  <strong>{courseTitle}</strong> to earn your certificate.
                </p>
                <Link
                  href={`/courses/${courseSlug}`}
                  className="flex items-center gap-2 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors font-medium"
                >
                  <FiBookOpen size={12} /> Continue Learning <FiArrowRight size={11} />
                </Link>
              </div>
            )}

            {/* Certificate not enabled */}
            {isCompleted && !certificateEnabled && (
              <div className="glass-card rounded-2xl p-5 space-y-2 border border-[var(--border)]">
                <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <FiAward size={14} className="text-[var(--text-muted)]" /> Certificate Not Available
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Certificates have not been enabled for this course by the administrator.
                  You have still completed all the course requirements.
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <FiAlertCircle size={12} /> {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              {isCompleted && certificateEnabled && !editing && name.trim() && (
                <button
                  onClick={() => void claimCertificate()}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold text-sm transition-colors disabled:opacity-60"
                >
                  {saving ? (
                    <><FiLoader className="animate-spin" size={14} /> Generating Certificate…</>
                  ) : (
                    <><FiAward size={14} /> Claim Certificate</>
                  )}
                </button>
              )}

              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <FiBookOpen size={13} /> Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

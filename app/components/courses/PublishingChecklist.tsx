"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiCheckCircle, FiXCircle, FiLoader, FiSend } from "react-icons/fi";

interface CheckItem {
  label: string;
  met:   boolean;
}

interface Props {
  courseId:      string;
  currentStatus: string;
  isAdmin:       boolean;
}

async function fetchChecklist(courseId: string): Promise<{ valid: boolean; errors: string[] }> {
  const res  = await fetch(`/api/courses/${courseId}/checklist`);
  const data = await res.json();
  return data.success ? data.data : { valid: false, errors: ["Failed to load checklist"] };
}

export function PublishingChecklist({ courseId, currentStatus, isAdmin }: Props) {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [check,   setCheck]   = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [acting,  setActing]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [err,     setErr]     = useState("");

  const loadChecklist = async () => {
    setLoading(true);
    setMsg(""); setErr("");
    try {
      const result = await fetchChecklist(courseId);
      setCheck(result);
      setOpen(true);
    } finally { setLoading(false); }
  };

  const submitForReview = async () => {
    setActing(true); setErr("");
    try {
      const res  = await fetch(`/api/courses/${courseId}/review`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "submit" }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg("Submitted for review! An admin will review your course shortly.");
        router.refresh();
      } else {
        setErr(data.error ?? "Submission failed");
      }
    } finally { setActing(false); }
  };

  const approve = async () => {
    setActing(true); setErr("");
    try {
      const res  = await fetch(`/api/courses/${courseId}/review`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg("Course approved and published!");
        router.refresh();
      } else {
        setErr(data.error ?? "Approval failed");
      }
    } finally { setActing(false); }
  };

  const isDraft    = currentStatus === "DRAFT" || currentStatus === "REJECTED";
  const isPending  = currentStatus === "PENDING" || currentStatus === "PENDING_REVIEW";
  const isPublished = currentStatus === "PUBLISHED";

  if (isPublished) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
        <FiCheckCircle size={15} /> Course is Live
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main action button */}
      {!open && !msg && (
        <button
          onClick={loadChecklist}
          disabled={loading}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          {loading ? <FiLoader className="animate-spin" size={14} /> : <FiCheckCircle size={14} />}
          {isPending ? "View Checklist" : "Check Before Publishing"}
        </button>
      )}

      {/* Checklist panel */}
      {open && check && (
        <div className="glass-card rounded-xl p-5 border border-[var(--border-strong)] space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Publishing Checklist
          </h3>

          {/* Requirements list */}
          <div className="space-y-2">
            {[
              "Title must be at least 5 characters",
              "Description must be at least 50 characters",
              "A thumbnail image is required",
              "A category must be selected",
              "At least 2 learning objectives are required",
              "At least one module is required",
              "At least one published lecture is required",
            ].map((req) => {
              const failed = check.errors.includes(req);
              return (
                <div key={req} className={`flex items-start gap-2.5 text-xs ${failed ? "text-red-400" : "text-emerald-400"}`}>
                  {failed
                    ? <FiXCircle     size={13} className="flex-shrink-0 mt-0.5" />
                    : <FiCheckCircle size={13} className="flex-shrink-0 mt-0.5" />
                  }
                  <span className={failed ? "" : "line-through opacity-60"}>{req}</span>
                </div>
              );
            })}
          </div>

          {err && <p className="text-xs text-red-400">{err}</p>}

          {/* Action buttons */}
          {check.valid ? (
            <div className="flex gap-2 pt-1">
              {isDraft && (
                <button
                  onClick={submitForReview}
                  disabled={acting}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  {acting ? <FiLoader className="animate-spin" size={13} /> : <FiSend size={13} />}
                  {acting ? "Submitting…" : "Submit for Review"}
                </button>
              )}
              {isPending && isAdmin && (
                <button
                  onClick={approve}
                  disabled={acting}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  {acting ? <FiLoader className="animate-spin" size={13} /> : <FiCheckCircle size={13} />}
                  {acting ? "Approving…" : "Approve & Publish"}
                </button>
              )}
              {isPending && !isAdmin && (
                <p className="text-xs text-blue-400">
                  ✓ Submitted — waiting for admin approval.
                </p>
              )}
              <button onClick={() => setOpen(false)} className="btn-secondary text-sm">
                Close
              </button>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <p className="text-xs text-red-400 flex-1">
                Fix {check.errors.length} issue{check.errors.length !== 1 ? "s" : ""} above before publishing.
              </p>
              <button onClick={() => setOpen(false)} className="btn-secondary text-sm">
                Close
              </button>
            </div>
          )}
        </div>
      )}

      {/* Success message */}
      {msg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <FiCheckCircle size={14} /> {msg}
        </div>
      )}
    </div>
  );
}

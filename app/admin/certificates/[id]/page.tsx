"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft, FiAward, FiCheckCircle, FiXCircle,
  FiRefreshCw, FiLoader, FiAlertTriangle, FiUser,
  FiBookOpen, FiCalendar, FiClock, FiExternalLink,
} from "react-icons/fi";

interface Audit {
  id:          string;
  action:      string;
  reason:      string | null;
  createdAt:   string;
  performedBy: { name: string } | null;
}

interface CertDetail {
  id:             string;
  certificateId:  string | null;
  studentName:    string | null;
  title:          string;
  instructorName: string | null;
  issuedAt:       string;
  completionDate: string | null;
  courseDuration: number | null;
  isRevoked:      boolean;
  revokedAt:      string | null;
  revocationReason: string | null;
  verificationUrl: string | null;
  certificateTemplateVersion: string;
  user:    { id: string; name: string; email: string; image: string | null };
  course:  { id: string; title: string; slug: string; difficulty: string } | null;
  revokedBy: { name: string } | null;
  audits:  Audit[];
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const actionStyles: Record<string, string> = {
  ISSUED:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REVOKED:     "bg-red-500/10 text-red-400 border-red-500/20",
  REINSTATED:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function AdminCertificateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [cert,    setCert]    = useState<CertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [err,     setErr]     = useState("");

  const load = async () => {
    const res  = await fetch(`/api/admin/certificates/${id}`);
    const json = await res.json() as { success?: boolean; data?: CertDetail };
    if (json.success && json.data) setCert(json.data);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [id]);

  const revoke = async () => {
    const reason = prompt("Reason for revocation (required):");
    if (!reason?.trim()) return;
    setActing(true); setErr(""); setMsg("");
    const res  = await fetch(`/api/admin/certificates/${id}/revoke`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ reason: reason.trim() }),
    });
    const json = await res.json() as { success?: boolean; error?: string };
    if (json.success) { setMsg("Certificate revoked."); void load(); }
    else setErr(json.error ?? "Failed");
    setActing(false);
  };

  const reinstate = async () => {
    if (!confirm("Reinstate this certificate?")) return;
    setActing(true); setErr(""); setMsg("");
    const res  = await fetch(`/api/admin/certificates/${id}/reinstate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json() as { success?: boolean; error?: string };
    if (json.success) { setMsg("Certificate reinstated."); void load(); }
    else setErr(json.error ?? "Failed");
    setActing(false);
  };

  if (loading) return (
    <div className="p-8 space-y-4">{[1,2,3].map((i) => <div key={i} className="h-16 shimmer rounded-2xl" />)}</div>
  );

  if (!cert) return (
    <div className="p-8 text-center text-[var(--text-muted)]">
      Certificate not found.
      <Link href="/admin/certificates" className="block mt-2 text-[var(--accent)] text-sm">← Back</Link>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link href="/admin/certificates" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-2">
          <FiArrowLeft size={12} /> All Certificates
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FiAward className="text-[var(--accent)]" /> Certificate Details
            </h1>
            {cert.certificateId && (
              <code className="font-mono text-sm text-[var(--accent)] mt-1 block">{cert.certificateId}</code>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cert.certificateId && (
              <Link
                href={`/verify-certificate/${cert.certificateId}`}
                target="_blank"
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <FiExternalLink size={12} /> Verify
              </Link>
            )}
            <Link
              href={`/api/certificates/${cert.id}/pdf`}
              target="_blank"
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <FiAward size={12} /> View PDF
            </Link>
            {acting ? (
              <FiLoader className="animate-spin text-[var(--accent)]" size={16} />
            ) : cert.isRevoked ? (
              <button onClick={reinstate} className="btn-primary text-xs flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400">
                <FiRefreshCw size={12} /> Reinstate
              </button>
            ) : (
              <button onClick={revoke} className="text-xs px-3 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5">
                <FiXCircle size={12} /> Revoke
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status banner */}
      {cert.isRevoked ? (
        <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex items-start gap-3">
          <FiAlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-sm font-semibold text-red-400">Certificate Revoked</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Revoked {formatDate(cert.revokedAt)} by {cert.revokedBy?.name ?? "Admin"}
              {cert.revocationReason && ` — ${cert.revocationReason}`}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
          <FiCheckCircle className="text-emerald-400 flex-shrink-0" size={16} />
          <p className="text-sm font-semibold text-emerald-400">Certificate Valid & Active</p>
        </div>
      )}

      {msg && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{msg}</div>}
      {err && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{err}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Student info */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2"><FiUser size={13} className="text-[var(--accent)]" /> Student</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Certificate Name</span>
              <span className="font-semibold text-[var(--text-primary)]">{cert.studentName ?? cert.user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Account Name</span>
              <span className="text-[var(--text-primary)]">{cert.user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Email</span>
              <span className="text-[var(--text-primary)] text-xs">{cert.user.email}</span>
            </div>
          </div>
        </div>

        {/* Course info */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2"><FiBookOpen size={13} className="text-[var(--accent)]" /> Course</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Title</span>
              {cert.course ? (
                <Link href={`/courses/${cert.course.slug}`} target="_blank" className="text-[var(--accent)] hover:underline text-right max-w-[200px] line-clamp-1">
                  {cert.course.title}
                </Link>
              ) : (
                <span className="text-[var(--text-primary)] text-right">{cert.title}</span>
              )}
            </div>
            {cert.instructorName && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Instructor</span>
                <span className="text-[var(--text-primary)]">{cert.instructorName}</span>
              </div>
            )}
            {cert.courseDuration != null && cert.courseDuration > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Duration</span>
                <span className="text-[var(--text-primary)]">{cert.courseDuration} min</span>
              </div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2"><FiCalendar size={13} className="text-[var(--accent)]" /> Dates</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Completion</span>
              <span className="text-[var(--text-primary)]">{formatDate(cert.completionDate ?? cert.issuedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Issued</span>
              <span className="text-[var(--text-primary)]">{formatDate(cert.issuedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Template</span>
              <code className="text-xs text-[var(--text-muted)]">{cert.certificateTemplateVersion}</code>
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2"><FiCheckCircle size={13} className="text-[var(--accent)]" /> Verification</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-muted)]">Certificate ID</span>
              <code className="font-mono text-xs text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded">
                {cert.certificateId ?? "—"}
              </code>
            </div>
            {cert.verificationUrl && (
              <div>
                <span className="text-[var(--text-muted)] block mb-1">Verification URL</span>
                <Link href={cert.verificationUrl} target="_blank" className="text-xs text-[var(--accent)] hover:underline break-all">
                  {cert.verificationUrl}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit trail */}
      <div className="glass-card rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <FiClock size={13} className="text-[var(--accent)]" /> Audit Trail
        </h2>
        {cert.audits.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No audit records.</p>
        ) : (
          <div className="space-y-3">
            {cert.audits.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <span className={`mt-0.5 text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${actionStyles[a.action] ?? "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]"}`}>
                  {a.action}
                </span>
                <div className="flex-1 min-w-0">
                  {a.reason && <p className="text-xs text-[var(--text-secondary)]">{a.reason}</p>}
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {formatDateTime(a.createdAt)}
                    {a.performedBy && ` · by ${a.performedBy.name}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FiAward, FiSearch, FiCheckCircle, FiXCircle,
  FiRefreshCw, FiLoader, FiEye, FiAlertTriangle,
  FiFilter,
} from "react-icons/fi";

interface Certificate {
  id:             string;
  certificateId:  string | null;
  studentName:    string | null;
  title:          string;
  instructorName: string | null;
  issuedAt:       string;
  completionDate: string | null;
  isRevoked:      boolean;
  revokedAt:      string | null;
  revocationReason: string | null;
  user:  { id: string; name: string; email: string };
  course: { id: string; title: string; slug: string } | null;
}

interface PageData {
  certificates: Certificate[];
  total:        number;
  page:         number;
  totalPages:   number;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminCertificatesPage() {
  const [data,      setData]      = useState<PageData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState<"all" | "valid" | "revoked">("all");
  const [page,      setPage]      = useState(1);
  const [acting,    setActing]    = useState<string | null>(null);
  const [msg,       setMsg]       = useState("");
  const [err,       setErr]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:   String(page),
        search: search.trim(),
        filter,
      });
      const res  = await fetch(`/api/admin/certificates?${params}`);
      const json = await res.json() as { success?: boolean; data?: PageData };
      if (json.success && json.data) setData(json.data);
    } finally { setLoading(false); }
  }, [page, search, filter]);

  useEffect(() => { void load(); }, [load]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); void load(); }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const revoke = async (certId: string) => {
    const reason = prompt("Reason for revocation (required):");
    if (!reason?.trim()) return;
    setActing(certId); setErr(""); setMsg("");
    try {
      const res  = await fetch(`/api/admin/certificates/${certId}/revoke`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reason: reason.trim() }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (json.success) { setMsg("Certificate revoked."); void load(); }
      else setErr(json.error ?? "Failed");
    } finally { setActing(null); }
  };

  const reinstate = async (certId: string) => {
    if (!confirm("Reinstate this certificate? It will become valid again.")) return;
    setActing(certId); setErr(""); setMsg("");
    try {
      const res  = await fetch(`/api/admin/certificates/${certId}/reinstate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (json.success) { setMsg("Certificate reinstated."); void load(); }
      else setErr(json.error ?? "Failed");
    } finally { setActing(null); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">Admin</p>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FiAward className="text-[var(--accent)]" /> Certificate Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {data?.total ?? 0} certificates total
          </p>
        </div>
        <Link href="/admin/certificate-settings" className="btn-secondary text-sm flex items-center gap-2">
          <FiFilter size={14} /> Settings & Signatures
        </Link>
      </div>

      {/* Messages */}
      {msg && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2"><FiCheckCircle size={14} />{msg}</div>}
      {err && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"><FiAlertTriangle size={14} />{err}</div>}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, certificate ID, or course…"
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "valid", "revoked"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <FiLoader className="animate-spin text-[var(--accent)] text-2xl mx-auto" />
          </div>
        ) : !data || data.certificates.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)]">
            <FiAward className="text-4xl mx-auto mb-3 opacity-30" />
            <p>No certificates found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Certificate", "Student", "Course", "Issued", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.certificates.map((cert) => (
                  <tr key={cert.id} className={`transition-colors hover:bg-[var(--bg-card-hover)] ${cert.isRevoked ? "opacity-70" : ""}`}>
                    {/* Certificate ID */}
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded">
                        {cert.certificateId ?? cert.id.slice(0, 12).toUpperCase()}
                      </code>
                    </td>

                    {/* Student */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{cert.studentName ?? cert.user.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{cert.user.email}</p>
                    </td>

                    {/* Course */}
                    <td className="px-4 py-3">
                      {cert.course ? (
                        <Link href={`/courses/${cert.course.slug}`} target="_blank" className="text-sm text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors line-clamp-1 max-w-[180px] block">
                          {cert.course.title}
                        </Link>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">{cert.title}</span>
                      )}
                    </td>

                    {/* Issued */}
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {formatDate(cert.issuedAt)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {cert.isRevoked ? (
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20 font-medium">
                          Revoked
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium">
                          Valid
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/certificates/${cert.id}`}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors"
                          title="View details & audit trail"
                        >
                          <FiEye size={13} />
                        </Link>
                        {cert.certificateId && (
                          <Link
                            href={`/certificates/verify/${cert.certificateId}`}
                            target="_blank"
                            className="p-1.5 text-[var(--text-muted)] hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Public verification"
                          >
                            <FiCheckCircle size={13} />
                          </Link>
                        )}
                        {acting === cert.id ? (
                          <FiLoader className="animate-spin text-[var(--accent)]" size={13} />
                        ) : cert.isRevoked ? (
                          <button
                            onClick={() => void reinstate(cert.id)}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Reinstate certificate"
                          >
                            <FiRefreshCw size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={() => void revoke(cert.id)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Revoke certificate"
                          >
                            <FiXCircle size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            Page {data.page} of {data.totalPages} · {data.total} total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

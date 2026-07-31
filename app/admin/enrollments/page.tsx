"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  FiSearch, FiTrash2, FiCheckCircle, FiClock,
  FiXCircle, FiUsers, FiDownload,
} from "react-icons/fi";
import { formatDate } from "../../utils/api";

interface Enrollment {
  id:          string;
  status:      "ACTIVE" | "COMPLETED" | "DROPPED";
  progress:    number;
  enrolledAt:  string;
  completedAt: string | null;
  user:        { id: string; name: string; email: string; image: string | null };
  course:      { id: string; title: string; slug: string; thumbnailUrl: string | null };
}

interface PaginatedData {
  items:      Enrollment[];
  total:      number;
  page:       number;
  totalPages: number;
}

const statusStyles: Record<string, string> = {
  ACTIVE:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DROPPED:   "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]",
};

const statusIcon = {
  ACTIVE:    <FiClock size={11} />,
  COMPLETED: <FiCheckCircle size={11} />,
  DROPPED:   <FiXCircle size={11} />,
};

export default function AdminEnrollmentsPage() {
  const router = useRouter();
  const [data,      setData]      = useState<PaginatedData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [status,    setStatus]    = useState("");
  const [page,      setPage]      = useState(1);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const res  = await fetch(`/api/enrollments?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { void fetch_(); }, [fetch_]);

  // Reset to page 1 on filter change
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusChange = (v: string) => { setStatus(v); setPage(1); };

  const remove = async (id: string, name: string, courseTitle: string) => {
    if (!confirm(`Remove ${name} from "${courseTitle}"? They will lose all progress.`)) return;
    await fetch(`/api/enrollments/${id}`, { method: "DELETE" });
    void fetch_();
  };

  // Export as CSV
  const exportCsv = () => {
    if (!data?.items.length) return;
    const rows = [
      ["Student", "Email", "Course", "Status", "Progress %", "Enrolled", "Completed"],
      ...data.items.map((e) => [
        e.user.name,
        e.user.email,
        e.course.title,
        e.status,
        String(Math.round(e.progress)),
        e.enrolledAt,
        e.completedAt ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "enrollments.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 sm:p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">Manage</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Enrollments</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {data ? `${data.total.toLocaleString()} total enrollments` : "Loading…"}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!data?.items.length}
          className="btn-secondary text-sm disabled:opacity-40"
        >
          <FiDownload size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search student or course…"
            className="input-themed pl-9 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="input-themed text-sm max-w-[140px]"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="DROPPED">Dropped</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[var(--border)]">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 shimmer" />)}
          </div>
        ) : !data?.items.length ? (
          <div className="py-16 text-center">
            <FiUsers className="mx-auto text-3xl text-[var(--text-muted)] mb-3 opacity-30" />
            <p className="text-[var(--text-muted)] text-sm">No enrollments found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Student", "Course", "Status", "Progress", "Enrolled", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.items.map((en) => (
                  <tr key={en.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">

                    {/* Student */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[var(--accent-dim)] border border-[var(--border)]">
                          {en.user.image ? (
                            <Image src={en.user.image} alt={en.user.name} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--accent)] text-xs font-bold">
                              {en.user.name[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{en.user.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{en.user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Course */}
                    <td className="px-4 py-3">
                      <Link href={`/courses/${en.course.slug}`} className="text-sm text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate block max-w-[180px]">
                        {en.course.title}
                      </Link>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyles[en.status]}`}>
                        {statusIcon[en.status]} {en.status}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400"
                            style={{ width: `${Math.min(100, en.progress)}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--text-muted)] tabular-nums w-8 text-right">
                          {Math.round(en.progress)}%
                        </span>
                      </div>
                    </td>

                    {/* Enrolled date */}
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {formatDate(en.enrolledAt)}
                      {en.completedAt && (
                        <div className="text-emerald-400">
                          ✓ {formatDate(en.completedAt)}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => remove(en.id, en.user.name, en.course.title)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove enrollment"
                      >
                        <FiTrash2 size={13} />
                      </button>
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
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-[var(--text-muted)]">
            {page} / {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

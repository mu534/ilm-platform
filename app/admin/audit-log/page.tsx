"use client";

import { useState, useEffect, useCallback } from "react";
import { FiSearch, FiShield, FiTrash2, FiUser, FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { formatDate } from "../../utils/api";

interface AuditEntry {
  id:         string;
  action:     string;
  entityType: string;
  entityId:   string | null;
  metadata:   string | null;
  ipAddress:  string | null;
  createdAt:  string;
  user:       { id: string; name: string; email: string };
}

interface Data {
  items:      AuditEntry[];
  total:      number;
  totalPages: number;
}

const actionIcon: Record<string, React.ReactNode> = {
  CHANGE_ROLE:    <FiUser  size={13} className="text-[var(--accent)]" />,
  DELETE_USER:    <FiTrash2 size={13} className="text-red-400" />,
  DELETE_LECTURE: <FiTrash2 size={13} className="text-red-400" />,
};

const actionColor: Record<string, string> = {
  CHANGE_ROLE:    "text-[var(--accent)]",
  DELETE_USER:    "text-red-400",
  DELETE_LECTURE: "text-red-400",
};

export default function AuditLogPage() {
  const [data,    setData]    = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [action,  setAction]  = useState("");
  const [page,    setPage]    = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (search) params.set("search", search);
      if (action) params.set("action", action);
      const res  = await fetch(`/api/admin/audit-log?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally { setLoading(false); }
  }, [page, search, action]);

  useEffect(() => { void load(); }, [load]);

  const resetFilters = () => { setSearch(""); setAction(""); setPage(1); };

  return (
    <div className="p-6 sm:p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">Security</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Audit Log</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {data ? `${data.total.toLocaleString()} logged events` : "Loading…"}
          </p>
        </div>
        <button onClick={() => void load()} className="btn-secondary text-sm">
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={13} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by user or entity…"
            className="input-themed pl-9 text-sm"
          />
        </div>
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="input-themed text-sm max-w-[180px]"
        >
          <option value="">All Actions</option>
          <option value="CHANGE_ROLE">Role Changes</option>
          <option value="DELETE_USER">User Deletions</option>
          <option value="DELETE_LECTURE">Lecture Deletions</option>
        </select>
        {(search || action) && (
          <button onClick={resetFilters} className="text-xs text-red-400 hover:text-red-300 px-2 transition-colors">
            Clear ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[var(--border)]">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 shimmer" />)}
          </div>
        ) : !data?.items.length ? (
          <div className="py-16 text-center">
            <FiShield className="mx-auto text-3xl text-[var(--text-muted)] mb-3 opacity-30" />
            <p className="text-[var(--text-muted)] text-sm">No audit events found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Admin", "Action", "Entity", "Details", "IP", "Date"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.items.map((entry) => {
                  let meta: Record<string, string> = {};
                  try { if (entry.metadata) meta = JSON.parse(entry.metadata) as Record<string, string>; }
                  catch { /* ignore */ }

                  return (
                    <tr key={entry.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                      {/* Admin */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{entry.user.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{entry.user.email}</p>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${actionColor[entry.action] ?? "text-[var(--text-muted)]"}`}>
                          {actionIcon[entry.action] ?? <FiAlertCircle size={13} />}
                          {entry.action.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-[var(--text-secondary)]">{entry.entityType}</p>
                        {entry.entityId && (
                          <p className="text-xs text-[var(--text-muted)] font-mono">{entry.entityId.slice(0, 10)}…</p>
                        )}
                      </td>

                      {/* Metadata */}
                      <td className="px-4 py-3">
                        {Object.entries(meta).map(([k, v]) => (
                          <p key={k} className="text-xs text-[var(--text-muted)]">
                            <span className="font-medium">{k}:</span> {String(v)}
                          </p>
                        ))}
                      </td>

                      {/* IP */}
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)] font-mono">
                        {entry.ipAddress ?? "—"}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 transition-colors">
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-[var(--text-muted)]">{page} / {data.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
            className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 transition-colors">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

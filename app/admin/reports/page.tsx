import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { formatDate } from "../../utils/api";
import Link from "next/link";
import { FiAlertCircle, FiCheck, FiX, FiEye } from "react-icons/fi";
import { ReportActions } from "../../components/admin/ReportActions";
import type { SessionUser } from "../../types/auth.types";

type StatusFilter = "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED" | "";

interface SearchProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

async function getReports(status: StatusFilter, page: number) {
  const pageSize = 20;
  const where = status ? { status } : {};

  const [total, reports] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        reportedBy: { select: { id: true, name: true, email: true } },
        comment: {
          select: {
            id: true,
            body: true,
            approved: true,
            author: { select: { name: true } },
            lecture: { select: { title: true, slug: true } },
          },
        },
      },
    }),
  ]);

  return { reports, total, totalPages: Math.ceil(total / pageSize) };
}

const statusStyles: Record<string, string> = {
  PENDING:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  REVIEWED:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  RESOLVED:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DISMISSED: "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]",
};

const reasonLabels: Record<string, string> = {
  SPAM:              "Spam",
  INAPPROPRIATE:     "Inappropriate",
  INCORRECT_CONTENT: "Incorrect Content",
  ABUSE:             "Abuse",
  OTHER:             "Other",
};

export const metadata = { title: "Reports" };

export default async function AdminReportsPage({ searchParams }: SearchProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (user?.role !== "ADMIN") redirect("/admin");

  const sp = await searchParams;
  const statusFilter = (sp.status ?? "") as StatusFilter;
  const page = Math.max(1, Number(sp.page ?? 1));

  const { reports, total, totalPages } = await getReports(statusFilter, page);

  const buildUrl = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    Object.entries(overrides).forEach(([k, v]) => params.set(k, v));
    return `/admin/reports?${params.toString()}`;
  };

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">Moderation</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Reports</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">{total} total reports</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["", "PENDING", "REVIEWED", "RESOLVED", "DISMISSED"] as StatusFilter[]).map((s) => {
          const label = s === "" ? "All" : s.charAt(0) + s.slice(1).toLowerCase();
          return (
            <Link
              key={s}
              href={buildUrl({ status: s, page: "1" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        {reports.length === 0 ? (
          <div className="py-16 text-center">
            <FiCheck className="mx-auto text-emerald-400 text-3xl mb-3" />
            <p className="text-[var(--text-muted)] text-sm">No reports found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Reported By", "Reason", "Content", "Status", "Date", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                    {/* Reporter */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-[var(--text-primary)]">{report.reportedBy.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{report.reportedBy.email}</p>
                    </td>

                    {/* Reason */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-[var(--accent)]">
                        {reasonLabels[report.reason] ?? report.reason}
                      </span>
                      {report.description && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 max-w-xs truncate">
                          {report.description}
                        </p>
                      )}
                    </td>

                    {/* Reported content */}
                    <td className="px-4 py-3">
                      {report.comment ? (
                        <div>
                          <p className="text-xs text-[var(--text-muted)] line-clamp-1 max-w-xs">
                            &ldquo;{report.comment.body}&rdquo;
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            by {report.comment.author.name}
                          </p>
                          <Link
                            href={`/lectures/${report.comment.lecture.slug}`}
                            className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] flex items-center gap-1 mt-0.5"
                            target="_blank"
                          >
                            <FiEye size={10} /> View lecture
                          </Link>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyles[report.status] ?? ""}`}>
                        {report.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {formatDate(report.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {report.status === "PENDING" && (
                        <ReportActions reportId={report.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <Link href={buildUrl({ page: String(page - 1) })} className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link href={buildUrl({ page: String(page + 1) })} className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

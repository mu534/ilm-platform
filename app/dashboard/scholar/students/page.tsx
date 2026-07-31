import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "../../../utils/api";
import { FiArrowLeft, FiUsers, FiCheckCircle } from "react-icons/fi";
import type { SessionUser } from "../../../types/auth.types";

export const metadata = { title: "My Students" };

async function getStudents(userId: string) {
  const scholar = await prisma.scholar.findUnique({ where: { userId } });
  if (!scholar) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { course: { scholarId: scholar.id } },
    orderBy: { enrolledAt: "desc" },
    include: {
      user:   { select: { id: true, name: true, email: true, image: true } },
      course: { select: { id: true, title: true, slug: true } },
    },
  });

  // Aggregate stats per course
  const courseStats = await prisma.enrollment.groupBy({
    by: ["courseId"],
    where: { course: { scholarId: scholar.id } },
    _count: { _all: true },
    _avg:   { progress: true },
  });

  const completedCount = enrollments.filter((e) => e.status === "COMPLETED").length;
  const activeCount    = enrollments.filter((e) => e.status === "ACTIVE").length;

  return { enrollments, courseStats, completedCount, activeCount };
}

export default async function ScholarStudentsPage() {
  const session = await getServerSession(authOptions);
  const user    = session?.user as SessionUser | undefined;
  if (!user) redirect("/login");
  if (!["SCHOLAR", "ADMIN"].includes(user.role)) redirect("/dashboard");

  const data = await getStudents(user.id);
  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-[var(--text-muted)]">No scholar profile found.</p>
        <Link href="/profile" className="btn-primary inline-flex text-sm mt-4">Complete Profile</Link>
      </div>
    );
  }

  const { enrollments, completedCount, activeCount } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/scholar" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-3">
          <FiArrowLeft size={13} /> Scholar Dashboard
        </Link>
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">My Students</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          {enrollments.length} enrollments across all your courses
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Enrolled", value: enrollments.length,  color: "text-[var(--accent)]",  icon: <FiUsers size={18} /> },
          { label: "Active",         value: activeCount,          color: "text-blue-400",          icon: <FiUsers size={18} /> },
          { label: "Completed",      value: completedCount,       color: "text-emerald-400",       icon: <FiCheckCircle size={18} /> },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-5">
            <div className={`text-xl mb-2 ${s.color}`}>{s.icon}</div>
            <div className="font-display text-2xl font-bold text-[var(--text-primary)]">{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Enrollments table */}
      {enrollments.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <FiUsers className="text-[var(--text-muted)] text-4xl mx-auto mb-4 opacity-30" />
          <p className="text-[var(--text-primary)] font-semibold mb-2">No students yet</p>
          <p className="text-[var(--text-muted)] text-sm">Students will appear here once they enroll in your courses.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Student", "Course", "Progress", "Status", "Enrolled"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {enrollments.map((en) => (
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
                      <Link href={`/courses/${en.course.slug}`} className="text-sm text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate block max-w-[160px]">
                        {en.course.title}
                      </Link>
                    </td>

                    {/* Progress bar */}
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

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        en.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : en.status === "ACTIVE"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]"
                      }`}>
                        {en.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {formatDate(en.enrolledAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import Link from "next/link";
import { formatDate } from "../../utils/api";
import { FiPlus, FiEye, FiUsers, FiStar, FiEdit2 } from "react-icons/fi";
import { AdminCourseActions } from "../../components/admin/CourseActions";
import type { SessionUser } from "../../types/auth.types";

async function getCourses(role: string, userId: string) {
  const where = role === "ADMIN" ? {} : { authorId: userId };
  return prisma.course.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      author:   { select: { name: true } },
      category: { select: { name: true, icon: true } },
      _count:   { select: { modules: true, enrollments: true, ratings: true } },
    },
  });
}

const statusStyles: Record<string, string> = {
  PUBLISHED:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DRAFT:          "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]",
  PENDING_REVIEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  REJECTED:       "bg-red-500/10 text-red-400 border-red-500/20",
  ARCHIVED:       "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]",
};

const difficultyLabels: Record<string, string> = {
  BEGINNER: "Beg", INTERMEDIATE: "Int", ADVANCED: "Adv",
};

export default async function AdminCoursesPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user) redirect("/login");

  const courses = await getCourses(user.role, user.id);

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">Manage</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Courses</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">{courses.length} total</p>
        </div>
        <Link
          href="/admin/courses/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl text-sm font-semibold transition-all hover:scale-105"
        >
          <FiPlus size={15} /> New Course
        </Link>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Course", "Category", "Level", "Status", "Modules", "Students", "Date", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="max-w-xs">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{course.title}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{course.author.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {course.category ? `${course.category.icon ?? ""} ${course.category.name}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {difficultyLabels[course.difficulty] ?? course.difficulty}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyles[course.status] ?? statusStyles.DRAFT}`}>
                      {course.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {course._count.modules}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <FiUsers size={11} /> {course._count.enrollments}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {formatDate(course.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/courses/${course.slug}`}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors"
                        title="View"
                      >
                        <FiEye size={13} />
                      </Link>
                      <Link
                        href={`/admin/courses/${course.id}/edit`}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors"
                        title="Edit"
                      >
                        <FiEdit2 size={13} />
                      </Link>
                      <AdminCourseActions course={course} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {courses.length === 0 && (
            <div className="text-center py-16 text-[var(--text-muted)]">
              <p>No courses yet.</p>
              <Link href="/admin/courses/new" className="text-[var(--accent)] text-sm hover:text-[var(--accent-light)] mt-2 inline-block">
                Create one →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

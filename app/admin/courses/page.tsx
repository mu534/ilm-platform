import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { AdminCoursesTable } from "../../components/admin/AdminCoursesTable";
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

      <AdminCoursesTable
        courses={courses.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
      />
    </div>
  );
}

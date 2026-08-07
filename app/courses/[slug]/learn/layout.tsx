import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { CourseSidebar } from "../../../components/lectures/CourseSidebar";
import { EnrollmentGate } from "../../../components/courses/EnrollmentGate";
import type { SessionUser } from "../../../types/auth.types";

interface Props {
  children: React.ReactNode;
  params:   Promise<{ slug: string }>;
}

async function getCourseShell(slug: string) {
  return prisma.course.findFirst({
    where:  { OR: [{ slug }, { id: slug }] },
    select: { id: true, title: true, slug: true, published: true },
  });
}

/**
 * The classroom shell.
 *
 * Renders the curriculum sidebar once — all lecture pages underneath
 * /courses/[slug]/learn/* stream into the same persistent frame.
 * Enrollment is gated here for the entire classroom; individual
 * lecture pages do not need to repeat this check.
 */
export default async function LearnLayout({ children, params }: Props) {
  const { slug } = await params;
  const [course, session] = await Promise.all([
    getCourseShell(slug),
    getServerSession(authOptions),
  ]);

  if (!course) notFound();

  const user     = session?.user as SessionUser | undefined;
  const isStaff  = user?.role === "ADMIN" || user?.role === "SCHOLAR";

  // Redirect unauthenticated users to login
  if (!user) redirect(`/login?callbackUrl=/courses/${course.slug}/learn`);

  let hasAccess = isStaff;

  if (!isStaff) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    hasAccess = !!enrollment;
  }

  if (!hasAccess) {
    return (
      <EnrollmentGate
        courseSlug={course.slug}
        courseTitle={course.title}
      />
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-[var(--bg-primary)]">
      {/* Persistent sidebar — stays mounted across lecture navigations */}
      <CourseSidebar
        courseId={course.id}
        activeLectureId=""   /* will be overridden per-lecture via the sidebar's own state */
      />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

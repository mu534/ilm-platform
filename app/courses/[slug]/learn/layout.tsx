import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../Downloads/ilm/app/lib/auth";
import { prisma } from "../../../../../Downloads/ilm/app/lib/prism";
import { CourseSidebar } from "../../../../../Downloads/ilm/app/components/lectures/CourseSidebar";
import { EnrollmentGate } from "../../../../../Downloads/ilm/app/components/lectures/EnrollmentGate";
import type { SessionUser } from "../../../../../Downloads/ilm/app/types/auth.types";

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
 * This layout is what makes the course "own" the learning experience:
 * it renders the curriculum sidebar exactly once, and every lecture the
 * student opens underneath `/courses/[slug]/learn/*` streams into the
 * same persistent frame — no full remount, no sidebar flicker, no
 * leaving the workspace to find the next lesson.
 *
 * Enrollment/authorization is gated here, once, for the whole classroom —
 * individual lecture pages don't need to repeat this check.
 */
export default async function LearnLayout({ children, params }: Props) {
  const { slug } = await params;
  const [course, session] = await Promise.all([
    getCourseShell(slug),
    getServerSession(authOptions),
  ]);

  if (!course) notFound();

  const user = session?.user as SessionUser | undefined;
  if (!user) redirect(`/login?callbackUrl=/courses/${course.slug}`);

  const isStaff = user.role === "ADMIN" || user.role === "SCHOLAR";
  let hasAccess = isStaff;

  if (!isStaff) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    hasAccess = !!enrollment;
  }

  if (!hasAccess) {
    return <EnrollmentGate courseSlug={course.slug} courseTitle={course.title} />;
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <CourseSidebar courseId={course.id} courseSlug={course.slug} />
      <div className="flex-1 min-w-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}

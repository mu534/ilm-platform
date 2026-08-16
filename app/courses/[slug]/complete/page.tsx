import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { CourseCompletionVerification } from "../../../components/courses/CourseCompletionVerification";
import type { SessionUser } from "../../../types/auth.types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const course = await prisma.course.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { title: true },
  });
  return { title: `Complete: ${course?.title ?? "Course"} | Ilm Platform` };
}

export default async function CourseCompletePage({ params }: Props) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const user    = session?.user as SessionUser | undefined;

  if (!user) redirect(`/login?callbackUrl=/courses/${slug}/complete`);

  const course = await prisma.course.findFirst({
    where:  { OR: [{ slug }, { id: slug }] },
    select: {
      id: true, title: true, slug: true,
      certificateEnabled: true,
    },
  });
  if (!course) notFound();

  // Verify enrollment + completion server-side
  const enrollment = await prisma.enrollment.findUnique({
    where:  { userId_courseId: { userId: user.id, courseId: course.id } },
    select: { status: true, progress: true },
  });
  if (!enrollment) redirect(`/courses/${slug}`);

  // Get user profile for name verification
  const dbUser = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { name: true, certificateName: true },
  });

  // Check if certificate already exists
  const existingCert = await prisma.certificate.findUnique({
    where:  { userId_courseId: { userId: user.id, courseId: course.id } },
    select: { id: true, certificateId: true },
  });

  return (
    <CourseCompletionVerification
      courseId={course.id}
      courseSlug={course.slug}
      courseTitle={course.title}
      enrollmentStatus={enrollment.status}
      currentName={dbUser?.certificateName || dbUser?.name || ""}
      certificateEnabled={course.certificateEnabled}
      existingCertId={existingCert?.certificateId ?? null}
      existingCertDbId={existingCert?.id ?? null}
    />
  );
}

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
      modules: {
        select: {
          lectures: {
            where: { published: true },
            select: { id: true, isOptional: true },
          },
          quizzes: {
            select: { id: true, isOptional: true },
          },
        },
      },
    },
  });
  if (!course) notFound();

  // Verify enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where:  { userId_courseId: { userId: user.id, courseId: course.id } },
    select: { status: true, progress: true },
  });
  if (!enrollment) redirect(`/courses/${slug}`);

  // Compute actual completion from DB — enrollment.status may still be ACTIVE
  // even when the student has finished all required content (it only flips to
  // COMPLETED inside issueCertificate). We check real progress instead.
  const requiredLectureIds = course.modules
    .flatMap((m) => m.lectures)
    .filter((l) => !l.isOptional)
    .map((l) => l.id);

  const requiredQuizIds = course.modules
    .flatMap((m) => m.quizzes)
    .filter((q) => !q.isOptional)
    .map((q) => q.id);

  const [completedLectures, passedQuizzes] = await Promise.all([
    requiredLectureIds.length > 0
      ? prisma.lectureProgress.count({
          where: { userId: user.id, lectureId: { in: requiredLectureIds }, completed: true },
        })
      : Promise.resolve(0),
    requiredQuizIds.length > 0
      ? prisma.quizAttempt.findMany({
          where: { userId: user.id, quizId: { in: requiredQuizIds }, passed: true },
          select: { quizId: true },
          distinct: ["quizId"],
        })
      : Promise.resolve([]),
  ]);

  const allLecturesDone = requiredLectureIds.length === 0 || completedLectures >= requiredLectureIds.length;
  const allQuizzesPassed = requiredQuizIds.length === 0 || passedQuizzes.length >= requiredQuizIds.length;
  const isActuallyComplete = allLecturesDone && allQuizzesPassed;

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
      enrollmentStatus={isActuallyComplete ? "COMPLETED" : enrollment.status}
      currentName={dbUser?.certificateName || dbUser?.name || ""}
      certificateEnabled={course.certificateEnabled}
      existingCertId={existingCert?.certificateId ?? null}
      existingCertDbId={existingCert?.id ?? null}
      completedLectures={completedLectures}
      totalRequired={requiredLectureIds.length}
      passedQuizzes={passedQuizzes.length}
      totalQuizzes={requiredQuizIds.length}
    />
  );
}

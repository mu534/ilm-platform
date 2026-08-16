import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { CourseCompletionVerification } from "../../../components/courses/CourseCompletionVerification";
import { Navbar } from "../../../components/NavBar";
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
  const session  = await getServerSession(authOptions);
  const user     = session?.user as SessionUser | undefined;

  if (!user) redirect(`/login?callbackUrl=/courses/${slug}/complete`);

  const course = await prisma.course.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      id: true, title: true, slug: true,
      certificateEnabled: true,
      modules: {
        select: {
          lectures: {
            where:  { published: true },
            select: { id: true, isOptional: true, slug: true, order: true },
            orderBy: { order: "asc" },
          },
          quizzes: {
            select: { id: true, isOptional: true },
          },
          order: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!course) notFound();

  // Must be enrolled
  const enrollment = await prisma.enrollment.findUnique({
    where:  { userId_courseId: { userId: user.id, courseId: course.id } },
    select: { status: true, progress: true },
  });
  if (!enrollment) redirect(`/courses/${slug}`);

  // Compute real completion — enrollment.status stays ACTIVE until
  // issueCertificate() runs, so we check actual progress records.
  const requiredLectureIds = course.modules
    .flatMap((m) => m.lectures)
    .filter((l) => !l.isOptional)
    .map((l) => l.id);

  const requiredQuizIds = course.modules
    .flatMap((m) => m.quizzes)
    .filter((q) => !q.isOptional)
    .map((q) => q.id);

  const [completedLectureCount, passedQuizAttempts] = await Promise.all([
    requiredLectureIds.length > 0
      ? prisma.lectureProgress.count({
          where: { userId: user.id, lectureId: { in: requiredLectureIds }, completed: true },
        })
      : Promise.resolve(0),
    requiredQuizIds.length > 0
      ? prisma.quizAttempt.findMany({
          where:    { userId: user.id, quizId: { in: requiredQuizIds }, passed: true },
          select:   { quizId: true },
          distinct: ["quizId"],
        })
      : Promise.resolve([]),
  ]);

  const allLecturesDone  = requiredLectureIds.length === 0 || completedLectureCount >= requiredLectureIds.length;
  const allQuizzesPassed = requiredQuizIds.length  === 0 || passedQuizAttempts.length >= requiredQuizIds.length;
  const isActuallyComplete = allLecturesDone && allQuizzesPassed;

  // User profile for name pre-fill
  const dbUser = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { name: true, certificateName: true },
  });

  // Existing certificate (idempotent — may already be issued)
  const existingCert = await prisma.certificate.findUnique({
    where:  { userId_courseId: { userId: user.id, courseId: course.id } },
    select: { id: true, certificateId: true },
  });

  // First lecture slug (for "Relearn" button)
  const firstLectureSlug = course.modules
    .flatMap((m) => m.lectures)
    .sort((a, b) => a.order - b.order)[0]?.slug ?? null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navbar />
      <div className="flex-1">
        <CourseCompletionVerification
          courseId={course.id}
          courseSlug={course.slug}
          courseTitle={course.title}
          enrollmentStatus={isActuallyComplete ? "COMPLETED" : enrollment.status}
          currentName={dbUser?.certificateName || dbUser?.name || ""}
          certificateEnabled={course.certificateEnabled}
          existingCertId={existingCert?.certificateId ?? null}
          existingCertDbId={existingCert?.id ?? null}
          completedLectures={completedLectureCount}
          totalRequired={requiredLectureIds.length}
          passedQuizzes={passedQuizAttempts.length}
          totalQuizzes={requiredQuizIds.length}
          firstLectureSlug={firstLectureSlug}
        />
      </div>
    </div>
  );
}

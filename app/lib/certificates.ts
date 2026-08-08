import { prisma } from "./prism";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Issue a completion certificate only when authoritative records show:
 * - active/completed enrollment
 * - every published lecture completed
 * - every quiz in the course passed at least once
 *
 * Idempotent: unique (userId, courseId) prevents duplicates.
 */
export async function issueCompletionCertificate(
  tx: Tx,
  userId: string,
  courseId: string,
): Promise<boolean> {
  const enrollment = await tx.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment || enrollment.status === "DROPPED") return false;

  const course = await tx.course.findUnique({
    where: { id: courseId },
    select: {
      title: true,
      modules: {
        select: {
          lectures: { where: { published: true }, select: { id: true } },
          quizzes: { select: { id: true } },
        },
      },
    },
  });
  if (!course) return false;

  const allLectureIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));
  const allQuizIds = course.modules.flatMap((m) => m.quizzes.map((q) => q.id));

  if (allLectureIds.length === 0) return false;

  const completedCount = await tx.lectureProgress.count({
    where: { userId, lectureId: { in: allLectureIds }, completed: true },
  });
  if (completedCount < allLectureIds.length) return false;

  if (allQuizIds.length > 0) {
    const passedAttempts = await tx.quizAttempt.findMany({
      where: { userId, quizId: { in: allQuizIds }, passed: true },
      select: { quizId: true },
      distinct: ["quizId"],
    });
    if (passedAttempts.length < allQuizIds.length) return false;
  }

  try {
    await tx.certificate.create({
      data: {
        userId,
        courseId,
        title: `Certificate of Completion — ${course.title}`,
      },
    });
  } catch {
    // Unique (userId, courseId) — concurrent/duplicate issuance is a no-op
    return false;
  }

  await tx.enrollment.update({
    where: { userId_courseId: { userId, courseId } },
    data: {
      progress: 100,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  await tx.notification.create({
    data: {
      userId,
      type: "CERTIFICATE_ISSUED",
      title: "Certificate Issued!",
      message: `You have earned a certificate for completing "${course.title}".`,
      link: "/dashboard",
    },
  });

  return true;
}

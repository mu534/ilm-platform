import { prisma } from "./prism";
import { issueCompletionCertificate } from "./certificates";

export interface RecalculateResult {
  percent: number;
  completedLectures: number;
  totalLectures: number;
  passedQuizzes: number;
  totalQuizzes: number;
  isFullyCompleted: boolean;
}

/**
 * Authoritatively calculates and synchronizes enrollment progress, completion status,
 * and triggers certificate generation when all required lectures & quizzes are complete.
 */
export async function recalculateCourseProgress(
  userId: string,
  courseId: string,
): Promise<RecalculateResult | null> {
  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) return null;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
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
    if (!course) return null;

    const allPublishedLectures = course.modules.flatMap((m) => m.lectures);
    const allLectureIds = allPublishedLectures.map((l) => l.id);
    const requiredLectureIds = allPublishedLectures.filter((l) => !l.isOptional).map((l) => l.id);

    const allQuizzes = course.modules.flatMap((m) => m.quizzes);
    const allQuizIds = allQuizzes.map((q) => q.id);
    const requiredQuizIds = allQuizzes.filter((q) => !q.isOptional).map((q) => q.id);

    const [completedLecturesList, passedQuizList] = await Promise.all([
      allLectureIds.length > 0
        ? prisma.lectureProgress.findMany({
            where: { userId, lectureId: { in: allLectureIds }, completed: true },
            select: { lectureId: true },
          })
        : Promise.resolve([]),
      allQuizIds.length > 0
        ? prisma.quizAttempt.findMany({
            where: { userId, quizId: { in: allQuizIds }, passed: true },
            select: { quizId: true },
            distinct: ["quizId"],
          })
        : Promise.resolve([]),
    ]);

    const completedLectureIds = new Set(completedLecturesList.map((p) => p.lectureId));
    const passedQuizIds = new Set(passedQuizList.map((q) => q.quizId));

    const completedLecturesCount = completedLecturesList.length;
    const passedQuizCount = passedQuizList.length;

    const totalSteps = allLectureIds.length + allQuizIds.length;
    const completedSteps = completedLecturesCount + passedQuizCount;

    const percent = totalSteps > 0
      ? Math.round((completedSteps / totalSteps) * 100)
      : allLectureIds.length > 0
      ? Math.round((completedLecturesCount / allLectureIds.length) * 100)
      : 100;

    const allRequiredLecturesDone = requiredLectureIds.every((id) => completedLectureIds.has(id));
    const allRequiredQuizzesDone = requiredQuizIds.every((id) => passedQuizIds.has(id));

    const isFullyCompleted = (
      (requiredLectureIds.length > 0 || requiredQuizIds.length > 0)
        ? (allRequiredLecturesDone && allRequiredQuizzesDone)
        : (allLectureIds.length > 0 ? completedLecturesCount === allLectureIds.length : false)
    );

    const now = new Date();
    const finalProgress = isFullyCompleted ? 100 : Math.min(99, percent);

    await prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: {
        progress: finalProgress,
        status: isFullyCompleted ? "COMPLETED" : "ACTIVE",
        completedAt: isFullyCompleted ? (enrollment.completedAt || now) : null,
      },
    });

    if (isFullyCompleted) {
      await prisma.$transaction(async (tx) => {
        await issueCompletionCertificate(tx, userId, courseId);
      });
    }

    return {
      percent: finalProgress,
      completedLectures: completedLecturesCount,
      totalLectures: allLectureIds.length,
      passedQuizzes: passedQuizCount,
      totalQuizzes: allQuizIds.length,
      isFullyCompleted,
    };
  } catch (err) {
    console.error("Error in recalculateCourseProgress:", err);
    return null;
  }
}

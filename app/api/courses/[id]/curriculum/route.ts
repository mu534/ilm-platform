import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { requireCourseLearnAccess } from "../../../../lib/courseAccess";
import { successResponse, handleApiError } from "../../../../utils/api";
import { computeLockedLectureIds, isQuizLocked } from "../../../../lib/sequentialLearning";

/**
 * GET /api/courses/[id]/curriculum
 *
 * Returns the full curriculum for a course with per-lecture completion
 * and per-quiz pass/lock status for the authenticated user. Used by the learning sidebar.
 * Requires enrollment (or staff preview).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: courseId } = await params;

    const accessCourse = await requireCourseLearnAccess(user, courseId);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true, title: true, slug: true, sequentialLearning: true,
        modules: {
          orderBy: { order: "asc" },
          select: {
            id: true, title: true, description: true, order: true,
            lectures: {
              orderBy: { order: "asc" },
              where:   { published: true },
              select: {
                id: true, title: true, slug: true,
                type: true, duration: true, order: true,
              },
            },
            quizzes: {
              select: { id: true, title: true, passingScore: true },
            },
            _count: { select: { lectures: true, quizzes: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) {
      return successResponse(null);
    }

    let completedSet = new Set<string>();
    let passedQuizIds = new Set<string>();
    let totalCompletedLectures = 0;
    const totalLectures = course.modules.reduce((s, m) => s + m.lectures.length, 0);
    const allQuizIds = course.modules.flatMap((m) => m.quizzes.map((q) => q.id));

    const allLectureIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));
    if (allLectureIds.length > 0 || allQuizIds.length > 0) {
      const [progress, passedAttempts] = await Promise.all([
        allLectureIds.length > 0
          ? prisma.lectureProgress.findMany({
              where:  { userId: user.id, lectureId: { in: allLectureIds }, completed: true },
              select: { lectureId: true },
            })
          : Promise.resolve([]),
        allQuizIds.length > 0
          ? prisma.quizAttempt.findMany({
              where:  { userId: user.id, quizId: { in: allQuizIds }, passed: true },
              select: { quizId: true },
              distinct: ["quizId"],
            })
          : Promise.resolve([]),
      ]);

      completedSet = new Set(progress.map((p) => p.lectureId));
      totalCompletedLectures = progress.length;
      passedQuizIds = new Set(passedAttempts.map((a) => a.quizId));
    }

    const orderedLectureIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));
    const lockedSet = computeLockedLectureIds(
      orderedLectureIds,
      completedSet,
      accessCourse.sequentialLearning,
      course.modules,
      passedQuizIds,
    );

    const modules = course.modules.map((mod) => ({
      ...mod,
      lectures: mod.lectures.map((lec) => ({
        ...lec,
        completed: completedSet.has(lec.id),
        locked:    lockedSet.has(lec.id),
      })),
      quizzes: mod.quizzes.map((quiz) => {
        const passed = passedQuizIds.has(quiz.id);
        const locked = isQuizLocked(
          quiz.id,
          course.modules,
          completedSet,
          passedQuizIds,
          accessCourse.sequentialLearning,
        );
        return {
          ...quiz,
          passed,
          locked,
        };
      }),
      completedCount: mod.lectures.filter((l) => completedSet.has(l.id)).length,
    }));

    const totalSteps = totalLectures + allQuizIds.length;
    const completedSteps = totalCompletedLectures + passedQuizIds.size;
    const percent = totalSteps > 0
      ? Math.round((completedSteps / totalSteps) * 100)
      : totalLectures > 0
      ? Math.round((totalCompletedLectures / totalLectures) * 100)
      : 0;

    return successResponse({
      courseId:           course.id,
      courseTitle:        course.title,
      courseSlug:         course.slug,
      sequentialLearning: accessCourse.sequentialLearning,
      modules,
      totalLectures,
      totalCompleted:     totalCompletedLectures,
      passedQuizzesCount: passedQuizIds.size,
      totalQuizzesCount:  allQuizIds.length,
      percent,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { requireCourseLearnAccess } from "../../../../lib/courseAccess";
import { successResponse, handleApiError } from "../../../../utils/api";
import { computeLockedLectureIds } from "../../../../lib/sequentialLearning";

/**
 * GET /api/courses/[id]/curriculum
 *
 * Returns the full curriculum for a course with per-lecture completion
 * status for the authenticated user. Used by the learning sidebar.
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
    let totalCompleted = 0;
    const totalLectures = course.modules.reduce((s, m) => s + m.lectures.length, 0);

    const allIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));
    if (allIds.length > 0) {
      const progress = await prisma.lectureProgress.findMany({
        where:  { userId: user.id, lectureId: { in: allIds }, completed: true },
        select: { lectureId: true },
      });
      completedSet   = new Set(progress.map((p) => p.lectureId));
      totalCompleted = progress.length;
    }

    const orderedLectureIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));
    const lockedSet = computeLockedLectureIds(
      orderedLectureIds,
      completedSet,
      accessCourse.sequentialLearning,
    );

    const modules = course.modules.map((mod) => ({
      ...mod,
      lectures: mod.lectures.map((lec) => ({
        ...lec,
        completed: completedSet.has(lec.id),
        locked:    lockedSet.has(lec.id),
      })),
      completedCount: mod.lectures.filter((l) => completedSet.has(l.id)).length,
    }));

    return successResponse({
      courseId:           course.id,
      courseTitle:        course.title,
      courseSlug:         course.slug,
      sequentialLearning: accessCourse.sequentialLearning,
      modules,
      totalLectures,
      totalCompleted,
      percent: totalLectures > 0
        ? Math.round((totalCompleted / totalLectures) * 100)
        : 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

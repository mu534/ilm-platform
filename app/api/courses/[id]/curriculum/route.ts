import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/auth.types";

/**
 * GET /api/courses/[id]/curriculum
 *
 * Returns the full curriculum for a course with per-lecture completion
 * status for the authenticated user. Used by the learning sidebar.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: courseId } = await params;
    const session = await getServerSession(authOptions);
    const user    = session?.user as SessionUser | undefined;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true, title: true, slug: true,
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

    if (!course) return errorResponse("Course not found", 404);

    // Build a set of completed lecture IDs for this user
    let completedSet = new Set<string>();
    let totalCompleted = 0;
    const totalLectures = course.modules.reduce((s, m) => s + m.lectures.length, 0);

    if (user) {
      const allIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));
      if (allIds.length > 0) {
        const progress = await prisma.lectureProgress.findMany({
          where:  { userId: user.id, lectureId: { in: allIds }, completed: true },
          select: { lectureId: true },
        });
        completedSet  = new Set(progress.map((p) => p.lectureId));
        totalCompleted = progress.length;
      }
    }

    // Annotate each lecture with completion status
    const modules = course.modules.map((mod) => ({
      ...mod,
      lectures: mod.lectures.map((lec) => ({
        ...lec,
        completed: completedSet.has(lec.id),
      })),
      completedCount: mod.lectures.filter((l) => completedSet.has(l.id)).length,
    }));

    return successResponse({
      courseId:       course.id,
      courseTitle:    course.title,
      courseSlug:     course.slug,
      modules,
      totalLectures,
      totalCompleted,
      percent:        totalLectures > 0
        ? Math.round((totalCompleted / totalLectures) * 100)
        : 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

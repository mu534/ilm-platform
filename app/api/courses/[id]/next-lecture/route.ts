import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/auth.types";

/**
 * GET /api/courses/[id]/next-lecture
 * Returns the slug of the first incomplete lecture for the current user.
 * Falls back to the first lecture in the first module if no progress exists.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user    = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id: courseId } = await params;

    // Get ordered lectures with progress
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        modules: {
          orderBy: { order: "asc" },
          select: {
            lectures: {
              orderBy: { order: "asc" },
              where:   { published: true },
              select:  { id: true, slug: true },
            },
          },
        },
      },
    });

    if (!course) return errorResponse("Course not found", 404);

    const lectures = course.modules.flatMap((m) => m.lectures);
    if (lectures.length === 0) return errorResponse("No lectures in this course", 404);

    // Find completed lecture IDs for this user
    const completed = await prisma.lectureProgress.findMany({
      where: {
        userId:    user.id,
        lectureId: { in: lectures.map((l) => l.id) },
        completed: true,
      },
      select: { lectureId: true },
    });
    const completedSet = new Set(completed.map((p) => p.lectureId));

    // First lecture not yet completed
    const next = lectures.find((l) => !completedSet.has(l.id)) ?? lectures[0];

    return successResponse({ slug: next.slug, lectureId: next.id });
  } catch (error) {
    return handleApiError(error);
  }
}

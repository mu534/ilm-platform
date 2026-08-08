import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh, getOptionalUser } from "../../../../lib/authorization";
import { isPublicCourse } from "../../../../lib/courseAccess";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import { z } from "zod";

const addPrerequisiteSchema = z.object({
  prerequisiteCourseId: z.string().min(1),
});

/**
 * Detect circular dependencies using iterative BFS.
 *
 * We're about to add: prerequisiteCourseId → dependentCourseId
 * (meaning: to enroll in dependentCourseId you must complete prerequisiteCourseId)
 *
 * A cycle exists if dependentCourseId is already an ancestor (prerequisite, direct
 * or transitive) of prerequisiteCourseId. Walk UPWARD from prerequisiteCourseId
 * through the prerequisite graph and check if we reach dependentCourseId.
 */
async function wouldCreateCycle(
  prerequisiteCourseId: string,
  dependentCourseId: string,
): Promise<boolean> {
  const visited = new Set<string>();
  const queue   = [prerequisiteCourseId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    // Get the prerequisites OF current (courses that current depends on)
    const prereqsOfCurrent = await prisma.coursePrerequisite.findMany({
      where:  { dependentCourseId: current },
      select: { prerequisiteCourseId: true },
    });

    for (const p of prereqsOfCurrent) {
      if (p.prerequisiteCourseId === dependentCourseId) return true;
      queue.push(p.prerequisiteCourseId);
    }
  }

  return false;
}

/**
 * GET /api/courses/[id]/prerequisites
 * Public read for published courses; owner or admin for non-published.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dependentCourseId } = await params;

    const course = await prisma.course.findUnique({
      where:  { id: dependentCourseId },
      select: { id: true, authorId: true, published: true, status: true, approvalStatus: true },
    });
    if (!course) return errorResponse("Course not found", 404);

    const user    = await getOptionalUser();
    const isAdmin = user?.role === "ADMIN";
    const isOwner = user?.id === course.authorId;

    if (!isPublicCourse(course) && !isAdmin && !isOwner) {
      return errorResponse("Course not found", 404);
    }

    const prereqs = await prisma.coursePrerequisite.findMany({
      where:   { dependentCourseId },
      include: {
        prerequisiteCourse: {
          select: {
            id: true, title: true, slug: true, thumbnailUrl: true,
            difficulty: true,
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return successResponse(prereqs.map((p) => p.prerequisiteCourse));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/courses/[id]/prerequisites
 * Scholar (owner) or Admin: add a prerequisite course.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: dependentCourseId } = await params;

    const course = await prisma.course.findUnique({
      where:  { id: dependentCourseId },
      select: { id: true, authorId: true },
    });
    if (!course) return errorResponse("Course not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const { prerequisiteCourseId } = addPrerequisiteSchema.parse(body);

    // Self-prerequisite prevention
    if (prerequisiteCourseId === dependentCourseId) {
      return errorResponse("A course cannot be its own prerequisite", 400);
    }

    // Verify the prerequisite course exists
    const prereqCourse = await prisma.course.findUnique({
      where:  { id: prerequisiteCourseId },
      select: { id: true, title: true },
    });
    if (!prereqCourse) return errorResponse("Prerequisite course not found", 404);

    // Check for circular dependency
    if (await wouldCreateCycle(prerequisiteCourseId, dependentCourseId)) {
      return errorResponse(
        "Adding this prerequisite would create a circular dependency",
        400,
      );
    }

    // Check for duplicate
    const existing = await prisma.coursePrerequisite.findUnique({
      where: {
        prerequisiteCourseId_dependentCourseId: { prerequisiteCourseId, dependentCourseId },
      },
    });
    if (existing) return errorResponse("This prerequisite already exists", 409);

    const created = await prisma.coursePrerequisite.create({
      data: { prerequisiteCourseId, dependentCourseId },
      include: {
        prerequisiteCourse: {
          select: { id: true, title: true, slug: true, thumbnailUrl: true },
        },
      },
    });

    return successResponse(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/courses/[id]/prerequisites?prerequisiteCourseId=xxx
 * Scholar (owner) or Admin: remove a prerequisite.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: dependentCourseId } = await params;

    const course = await prisma.course.findUnique({
      where:  { id: dependentCourseId },
      select: { id: true, authorId: true },
    });
    if (!course) return errorResponse("Course not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const prerequisiteCourseId = new URL(req.url).searchParams.get("prerequisiteCourseId");
    if (!prerequisiteCourseId) return errorResponse("prerequisiteCourseId is required", 400);

    const existing = await prisma.coursePrerequisite.findUnique({
      where: {
        prerequisiteCourseId_dependentCourseId: { prerequisiteCourseId, dependentCourseId },
      },
    });
    if (!existing) return errorResponse("Prerequisite not found", 404);

    await prisma.coursePrerequisite.delete({
      where: {
        prerequisiteCourseId_dependentCourseId: { prerequisiteCourseId, dependentCourseId },
      },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

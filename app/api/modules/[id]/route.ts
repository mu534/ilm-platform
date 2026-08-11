import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { moduleSchema, pickProvided } from "../../../lib/validations";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import { isPublicCourse } from "../../../lib/courseAccess";
import { requireUserFresh, getOptionalUser } from "../../../lib/authorization";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const courseModule = await prisma.module.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true, authorId: true,
            published: true, status: true, approvalStatus: true,
          },
        },
        lectures: {
          orderBy: { order: "asc" },
          select: {
            id: true, title: true, slug: true,
            type: true, duration: true, published: true,
            thumbnailUrl: true, views: true,
            _count: { select: { comments: true } },
          },
        },
        quizzes: {
          select: {
            id: true, title: true, passingScore: true, timeLimit: true,
            _count: { select: { questions: true, attempts: true } },
          },
        },
        _count: { select: { lectures: true, quizzes: true } },
      },
    });

    if (!courseModule) return errorResponse("Module not found", 404);

    const user    = await getOptionalUser();
    const isStaff =
      user?.role === "ADMIN" ||
      (user != null && courseModule.course.authorId === user.id);

    if (!isStaff) {
      if (!isPublicCourse(courseModule.course)) {
        return errorResponse("Module not found", 404);
      }
      return successResponse({
        ...courseModule,
        lectures: courseModule.lectures.filter((l) => l.published),
      });
    }

    return successResponse(courseModule);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();

    const { id } = await params;
    const courseModule = await prisma.module.findUnique({
      where: { id },
      include: { course: { select: { authorId: true } } },
    });
    if (!courseModule) return errorResponse("Module not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = courseModule.course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const data = pickProvided(body, moduleSchema.partial().parse(body));
    // A module cannot be reassigned to another course, which would move content
    // into a course the actor may not own.
    delete (data as Record<string, unknown>).courseId;

    const updated = await prisma.module.update({
      where: { id },
      data,
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();

    const { id } = await params;
    const courseModule = await prisma.module.findUnique({
      where: { id },
      include: { course: { select: { authorId: true } } },
    });
    if (!courseModule) return errorResponse("Module not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = courseModule.course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    await prisma.module.delete({ where: { id } });
    return successResponse({ message: "Module deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

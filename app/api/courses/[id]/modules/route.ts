import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { moduleSchema } from "../../../../lib/validations";
import { requireAdminOrInstructor, getOptionalUser } from "../../../../lib/authorization";
import { isPublicCourse } from "../../../../lib/courseAccess";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";

// GET /api/courses/[id]/modules
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true, authorId: true,
        published: true, status: true, approvalStatus: true,
      },
    });
    if (!course) return errorResponse("Course not found", 404);

    const user    = await getOptionalUser();
    const isStaff = user?.role === "ADMIN" || (user != null && course.authorId === user.id);

    if (!isStaff && !isPublicCourse(course)) {
      return errorResponse("Course not found", 404);
    }

    const modules = await prisma.module.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      include: {
        lectures: {
          orderBy: { order: "asc" },
          select: {
            id: true, title: true, slug: true,
            type: true, duration: true, published: true,
            thumbnailUrl: true, views: true,
            _count: { select: { comments: true } },
          },
        },
        _count: { select: { lectures: true, quizzes: true } },
      },
    });

    if (!isStaff) {
      return successResponse(
        modules.map((m) => ({
          ...m,
          lectures: m.lectures.filter((l) => l.published),
        })),
      );
    }

    return successResponse(modules);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/courses/[id]/modules
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdminOrInstructor();
    const { id: courseId } = await params;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return errorResponse("Course not found", 404);
    if (user.role !== "ADMIN" && course.authorId !== user.id) {
      return errorResponse("Forbidden", 403);
    }

    const body = (await req.json()) as unknown;
    const data = moduleSchema.parse(body);

    const created = await prisma.module.create({
      data: { ...data, courseId },
      include: {
        _count: { select: { lectures: true, quizzes: true } },
      },
    });

    return successResponse(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

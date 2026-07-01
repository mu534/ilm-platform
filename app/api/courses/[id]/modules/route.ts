import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { moduleSchema } from "../../../../lib/validations";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/auth.types";

// GET /api/courses/[id]/modules
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: courseId } = await params;

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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);
    if (!["ADMIN", "SCHOLAR"].includes(user.role)) return errorResponse("Forbidden", 403);

    const { id: courseId } = await params;

    // Verify the course belongs to this user (or user is admin)
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return errorResponse("Course not found", 404);
    if (user.role !== "ADMIN" && course.authorId !== user.id) {
      return errorResponse("Forbidden", 403);
    }

    const body = (await req.json()) as unknown;
    const data = moduleSchema.parse(body);

    const module = await prisma.module.create({
      data: { ...data, courseId },
      include: {
        _count: { select: { lectures: true, quizzes: true } },
      },
    });

    return successResponse(module, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

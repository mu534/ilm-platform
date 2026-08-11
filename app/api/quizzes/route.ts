import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { quizSchema } from "../../lib/validations";
import { requireUserFresh, requireAdminOrInstructor } from "../../lib/authorization";
import { requireCourseLearnAccess, isPublicCourse } from "../../lib/courseAccess";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";

// GET /api/quizzes?moduleId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId");
    if (!moduleId) return errorResponse("moduleId is required", 400);

    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        courseId: true,
        course: {
          select: {
            id: true, authorId: true,
            published: true, status: true, approvalStatus: true,
          },
        },
      },
    });
    if (!courseModule) return errorResponse("Module not found", 404);

    try {
      const user = await requireUserFresh();
      await requireCourseLearnAccess(user, courseModule.courseId);
    } catch {
      if (!isPublicCourse(courseModule.course)) {
        return errorResponse("Module not found", 404);
      }
    }

    const quizzes = await prisma.quiz.findMany({
      where: { moduleId },
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
    });
    return successResponse(quizzes);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/quizzes
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdminOrInstructor();

    const body = (await req.json()) as unknown;
    const data = quizSchema.parse(body);

    if (user.role !== "ADMIN") {
      const courseModule = await prisma.module.findUnique({
        where: { id: data.moduleId },
        include: { course: { select: { authorId: true } } },
      });
      if (!courseModule) return errorResponse("Module not found", 404);
      if (courseModule.course.authorId !== user.id) return errorResponse("Forbidden", 403);
    }

    const quiz = await prisma.quiz.create({
      data,
      include: { _count: { select: { questions: true, attempts: true } } },
    });

    return successResponse(quiz, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

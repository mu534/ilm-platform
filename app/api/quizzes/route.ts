import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { quizSchema } from "../../lib/validations";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";

// GET /api/quizzes?moduleId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId");
    if (!moduleId) return errorResponse("moduleId is required", 400);

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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);
    if (!["ADMIN", "SCHOLAR"].includes(user.role)) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const data = quizSchema.parse(body);

    // Verify module belongs to user's course (unless admin)
    if (user.role !== "ADMIN") {
      const module = await prisma.module.findUnique({
        where: { id: data.moduleId },
        include: { course: { select: { authorId: true } } },
      });
      if (!module) return errorResponse("Module not found", 404);
      if (module.course.authorId !== user.id) return errorResponse("Forbidden", 403);
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

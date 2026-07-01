import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { quizQuestionSchema } from "../../../../lib/validations";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/auth.types";

// POST /api/quizzes/[id]/questions — add question to quiz
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);
    if (!["ADMIN", "SCHOLAR"].includes(user.role)) return errorResponse("Forbidden", 403);

    const { id: quizId } = await params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { module: { include: { course: { select: { authorId: true } } } } },
    });
    if (!quiz) return errorResponse("Quiz not found", 404);

    if (user.role !== "ADMIN" && quiz.module.course.authorId !== user.id) {
      return errorResponse("Forbidden", 403);
    }

    const body = (await req.json()) as unknown;
    const data = quizQuestionSchema.parse(body);

    const question = await prisma.quizQuestion.create({
      data: { ...data, quizId },
    });
    return successResponse(question, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

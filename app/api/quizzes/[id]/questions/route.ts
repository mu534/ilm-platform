import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { quizQuestionSchema } from "../../../../lib/validations";
import { requireUserFresh } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";

// POST /api/quizzes/[id]/questions — add question to quiz
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
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

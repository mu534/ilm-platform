import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { quizQuestionSchema, pickProvided } from "../../../lib/validations";
import { requireUserFresh } from "../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";

// PATCH /api/quiz-questions/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();

    const { id } = await params;
    const question = await prisma.quizQuestion.findUnique({
      where: { id },
      include: { quiz: { include: { module: { include: { course: { select: { authorId: true } } } } } } },
    });
    if (!question) return errorResponse("Question not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = question.quiz.module.course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const data = pickProvided(body, quizQuestionSchema.partial().parse(body));
    const updated = await prisma.quizQuestion.update({ where: { id }, data });
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/quiz-questions/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();

    const { id } = await params;
    const question = await prisma.quizQuestion.findUnique({
      where: { id },
      include: { quiz: { include: { module: { include: { course: { select: { authorId: true } } } } } } },
    });
    if (!question) return errorResponse("Question not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = question.quiz.module.course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    await prisma.quizQuestion.delete({ where: { id } });
    return successResponse({ message: "Question deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

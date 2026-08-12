import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { quizSchema, pickProvided } from "../../../lib/validations";
import { requireUserFresh, getOptionalUser } from "../../../lib/authorization";
import { requireQuizLearningAccess } from "../../../lib/courseAccess";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";

// GET /api/quizzes/[id] — full quiz with questions (answers hidden for students)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOptionalUser();
    const { id } = await params;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            question: true,
            type: true,
            options: true,
            order: true,
            points: true,
            explanation: true,
            correctAnswer: true,
          },
        },
        module: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, title: true, slug: true, authorId: true } },
          },
        },
        _count: { select: { questions: true, attempts: true } },
      },
    });

    if (!quiz?.module?.course) return errorResponse("Quiz not found", 404);

    const course = quiz.module.course;
    let canSeeAnswers = false;

    if (user) {
      const fresh = await requireUserFresh();
      canSeeAnswers =
        fresh.role === "ADMIN" || course.authorId === fresh.id;

      if (!canSeeAnswers) {
        // Students must be enrolled (and pass sequential gates) to view the quiz
        await requireQuizLearningAccess({
          userId: fresh.id,
          role: fresh.role,
          quizId: id,
        });
      }
    } else {
      return errorResponse("Unauthorized", 401);
    }

    const questions = quiz.questions.map((q) => {
      if (canSeeAnswers) return q;
      const { correctAnswer, explanation, ...safe } = q;
      void correctAnswer;
      void explanation;
      return safe;
    });

    return successResponse({ ...quiz, questions });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/quizzes/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id } = await params;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { module: { include: { course: { select: { authorId: true } } } } },
    });
    if (!quiz) return errorResponse("Quiz not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = quiz.module.course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const data = pickProvided(body, quizSchema.partial().parse(body));
    const updated = await prisma.quiz.update({ where: { id }, data });
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/quizzes/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id } = await params;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { module: { include: { course: { select: { authorId: true } } } } },
    });
    if (!quiz) return errorResponse("Quiz not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = quiz.module.course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    await prisma.quiz.delete({ where: { id } });
    return successResponse({ message: "Quiz deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

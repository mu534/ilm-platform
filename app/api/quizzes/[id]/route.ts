import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { quizSchema, quizQuestionSchema } from "../../../lib/validations";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import type { SessionUser } from "../../../types/auth.types";

// GET /api/quizzes/[id] — full quiz with questions (answers hidden for students)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    const { id } = await params;

    const isInstructor = user?.role === "ADMIN" || user?.role === "SCHOLAR";

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
            // Only expose correct answer to instructors
            ...(isInstructor ? { correctAnswer: true } : {}),
          },
        },
        module: {
          select: {
            id: true, title: true,
            course: { select: { id: true, title: true, slug: true } },
          },
        },
        _count: { select: { questions: true, attempts: true } },
      },
    });

    if (!quiz) return errorResponse("Quiz not found", 404);
    return successResponse(quiz);
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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

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
    const data = quizSchema.partial().parse(body);
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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

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

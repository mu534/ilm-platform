import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { requireQuizLearningAccess } from "../../../../lib/courseAccess";
import { issueCompletionCertificate } from "../../../../lib/certificates";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import { HttpError } from "../../../../lib/httpError";
import { z } from "zod";

const attemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      answer:     z.string().min(1).max(2000),
    }),
  ).min(1).max(200),
  timeTaken: z.number().int().min(0).max(86_400).optional(),
});

// POST /api/quizzes/[id]/attempt — submit quiz attempt
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: quizId } = await params;

    const access = await requireQuizLearningAccess({
      userId: user.id,
      role: user.role,
      quizId,
    });

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          select: { id: true, correctAnswer: true, points: true },
        },
      },
    });
    if (!quiz) return errorResponse("Quiz not found", 404);

    const body = (await req.json()) as unknown;
    const { answers, timeTaken } = attemptSchema.parse(body);

    // Reject duplicate question IDs — never let repeats inflate score
    const seen = new Set<string>();
    for (const a of answers) {
      if (seen.has(a.questionId)) {
        throw new HttpError("Duplicate question submissions are not allowed", 400);
      }
      seen.add(a.questionId);
    }

    const questionById = new Map(quiz.questions.map((q) => [q.id, q]));

    // Every submitted question must belong to this quiz
    for (const a of answers) {
      if (!questionById.has(a.questionId)) {
        throw new HttpError("One or more answers reference invalid questions", 400);
      }
    }

    // All questions must be answered — prevent partial submissions to manipulate score
    if (answers.length !== quiz.questions.length) {
      throw new HttpError(
        `All ${quiz.questions.length} question(s) must be answered`,
        400,
      );
    }

    // Grade exclusively from DB points / correct answers
    let earnedPoints = 0;
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

    const gradedAnswers = answers.map(({ questionId, answer }) => {
      const question = questionById.get(questionId)!;
      const isCorrect =
        answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      if (isCorrect) earnedPoints += question.points;
      return { questionId, answer, isCorrect };
    });

    const score  = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= access.passingScore;

    const attempt = await prisma.$transaction(async (tx) => {
      const created = await tx.quizAttempt.create({
        data: {
          userId:    user.id,
          quizId,
          score,
          passed,
          timeTaken,
          answers: {
            create: gradedAnswers,
          },
        },
        include: {
          answers:  { include: { question: { select: { question: true, explanation: true, correctAnswer: true } } } },
          quiz:     { select: { title: true, passingScore: true } },
        },
      });

      if (passed) {
        await issueCompletionCertificate(tx, user.id, access.courseId);
      }

      return created;
    });

    await prisma.notification.create({
      data: {
        userId:  user.id,
        type:    "QUIZ_RESULT",
        title:   passed ? "Quiz Passed!" : "Quiz Result",
        message: `You scored ${score.toFixed(0)}% on "${quiz.title}". ${passed ? "Congratulations!" : `Passing score: ${quiz.passingScore}%`}`,
      },
    });

    // Never echo client-supplied score fields — only server-calculated values
    return successResponse({
      attempt,
      score,
      passed,
      earnedPoints,
      totalPoints,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/quizzes/[id]/attempt — get user's attempts for this quiz
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: quizId } = await params;

    await requireQuizLearningAccess({
      userId: user.id,
      role: user.role,
      quizId,
    });

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: user.id, quizId },
      orderBy: { completedAt: "desc" },
      include: {
        quiz: { select: { title: true, passingScore: true } },
      },
    });

    return successResponse(attempts);
  } catch (error) {
    return handleApiError(error);
  }
}

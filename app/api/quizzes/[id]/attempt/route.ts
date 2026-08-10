import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { requireQuizLearningAccess } from "../../../../lib/courseAccess";
import { QuizService } from "../../../../lib/services/quizService";
import { quizSubmissionSchema } from "../../../../lib/validations";
import { successResponse, handleApiError } from "../../../../utils/api";

// POST /api/quizzes/[id]/attempt — submit quiz attempt
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: quizId } = await params;

    const body = (await req.json()) as unknown;
    const { answers, timeTaken } = quizSubmissionSchema.parse(body);

    const result = await QuizService.submitQuizAttempt(user, quizId, answers, timeTaken);
    return successResponse(result);
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

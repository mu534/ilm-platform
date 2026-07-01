import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/auth.types";
import { z } from "zod";

const attemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      answer:     z.string().min(1),
    }),
  ).min(1),
  timeTaken: z.number().int().optional(),
});

// POST /api/quizzes/[id]/attempt — submit quiz attempt
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id: quizId } = await params;

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

    // Grade answers
    let earnedPoints = 0;
    let totalPoints  = 0;

    const gradedAnswers = answers.map(({ questionId, answer }) => {
      const question = quiz.questions.find((q) => q.id === questionId);
      if (!question) return { questionId, answer, isCorrect: false };

      totalPoints += question.points;
      const isCorrect = answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      if (isCorrect) earnedPoints += question.points;

      return { questionId, answer, isCorrect };
    });

    // Also count unanswered questions
    quiz.questions.forEach((q) => {
      if (!answers.find((a) => a.questionId === q.id)) {
        totalPoints += q.points;
      }
    });

    const score  = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.passingScore;

    // Save attempt in transaction
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

      // If passed, check if course is fully complete → issue certificate
      if (passed) {
        const module = await tx.module.findUnique({
          where: { id: quiz.moduleId },
          select: { courseId: true },
        });
        if (module?.courseId) {
          await issueCompletionCertificate(tx, user.id, module.courseId);
        }
      }

      return created;
    });

    // Notify via notification
    await prisma.notification.create({
      data: {
        userId:  user.id,
        type:    "QUIZ_RESULT",
        title:   passed ? "Quiz Passed! 🎉" : "Quiz Result",
        message: `You scored ${score.toFixed(0)}% on "${quiz.title}". ${passed ? "Congratulations!" : `Passing score: ${quiz.passingScore}%`}`,
      },
    });

    return successResponse({ attempt, score, passed, earnedPoints, totalPoints });
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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id: quizId } = await params;
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

// Check enrollment progress and issue certificate if course complete
async function issueCompletionCertificate(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  courseId: string,
) {
  try {
    const enrollment = await tx.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment || enrollment.status === "COMPLETED") return;

    const course = await tx.course.findUnique({
      where: { id: courseId },
      select: {
        title: true,
        modules: { select: { lectures: { select: { id: true } } } },
      },
    });
    if (!course) return;

    const allLectureIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));
    const completedCount = await tx.lectureProgress.count({
      where: { userId, lectureId: { in: allLectureIds }, completed: true },
    });

    if (completedCount >= allLectureIds.length) {
      // Issue certificate if not already issued
      const existing = await tx.certificate.findFirst({
        where: { userId, courseId },
      });
      if (!existing) {
        await tx.certificate.create({
          data: {
            userId,
            courseId,
            title: `Certificate of Completion — ${course.title}`,
          },
        });
        await tx.notification.create({
          data: {
            userId,
            type:    "CERTIFICATE_ISSUED",
            title:   "Certificate Issued! 🏆",
            message: `You have earned a certificate for completing "${course.title}".`,
            link:    "/dashboard",
          },
        });
      }
    }
  } catch {
    // Non-critical
  }
}

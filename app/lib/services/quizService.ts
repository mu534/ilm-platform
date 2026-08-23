import { prisma } from "../prism";
import { HttpError } from "../httpError";
import { requireQuizLearningAccess } from "../courseAccess";
import { recalculateCourseProgress } from "../courseProgress";
import type { SessionUser } from "../../types/auth.types";

export interface SubmitAnswerInput {
  questionId: string;
  answer: string;
}

export class QuizService {
  /**
   * Authoritatively grade a quiz attempt.
   * Calculates score on server side and enforces one answer per question per attempt.
   */
  static async submitQuizAttempt(
    user: SessionUser,
    quizId: string,
    answersInput: SubmitAnswerInput[],
    timeTakenSeconds?: number,
  ) {
    const access = await requireQuizLearningAccess({
      userId: user.id,
      role: user.role,
      quizId,
    });

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!quiz || quiz.questions.length === 0) {
      throw new HttpError("Quiz or questions not found", 404);
    }

    // Server-authoritative answer grading
    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));
    let totalPointsEarned = 0;
    let totalPossiblePoints = 0;

    const processedAnswers: { questionId: string; answer: string; isCorrect: boolean }[] = [];
    const seenQuestionIds = new Set<string>();

    for (const item of answersInput) {
      if (seenQuestionIds.has(item.questionId)) continue; // enforce unique per question
      seenQuestionIds.add(item.questionId);

      const question = questionMap.get(item.questionId);
      if (!question) continue;

      totalPossiblePoints += question.points;
      const isCorrect = item.answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      if (isCorrect) {
        totalPointsEarned += question.points;
      }

      processedAnswers.push({
        questionId: question.id,
        answer: item.answer,
        isCorrect,
      });
    }

    // Ensure all questions are scored
    for (const question of quiz.questions) {
      if (!seenQuestionIds.has(question.id)) {
        totalPossiblePoints += question.points;
      }
    }

    const scorePercentage = totalPossiblePoints > 0
      ? Math.round((totalPointsEarned / totalPossiblePoints) * 100)
      : 0;

    const passed = scorePercentage >= quiz.passingScore;

    const attempt = await prisma.$transaction(async (tx) => {
      const createdAttempt = await tx.quizAttempt.create({
        data: {
          userId: user.id,
          quizId,
          score: scorePercentage,
          passed,
          timeTaken: timeTakenSeconds ?? null,
        },
      });

      if (processedAnswers.length > 0) {
        await tx.quizAnswer.createMany({
          data: processedAnswers.map((pa) => ({
            attemptId: createdAttempt.id,
            questionId: pa.questionId,
            answer: pa.answer,
            isCorrect: pa.isCorrect,
          })),
          skipDuplicates: true,
        });
      }

      // Certificate is NOT auto-issued on quiz pass — the student must visit
      // the completion page and explicitly verify their name before generating.

      return createdAttempt;
    });

    // Recalculate progress, enrollment status, and certificate issuance
    if (access.courseId) {
      await recalculateCourseProgress(user.id, access.courseId);
    }

    return {
      attemptId: attempt.id,
      score: scorePercentage,
      passed,
      passingScore: quiz.passingScore,
      earnedPoints: totalPointsEarned,
      totalPoints: totalPossiblePoints,
      totalQuestions: quiz.questions.length,
      correctCount: processedAnswers.filter((a) => a.isCorrect).length,
    };
  }
}

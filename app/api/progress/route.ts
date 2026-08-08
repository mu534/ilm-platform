import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireUserFresh } from "../../lib/authorization";
import { requireEnrollment, requireLectureLearningAccess } from "../../lib/courseAccess";
import { issueCompletionCertificate } from "../../lib/certificates";
import { successResponse, handleApiError } from "../../utils/api";
import { z } from "zod";

const progressSchema = z.object({
  lectureId:      z.string().min(1),
  completed:      z.boolean().optional(),
  watchedSeconds: z.number().int().min(0).max(86_400).optional(),
});

// GET /api/progress?courseId=xxx — get user progress for a course
export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFresh();

    const { searchParams } = new URL(req.url);
    const courseId  = searchParams.get("courseId");
    const lectureId = searchParams.get("lectureId");

    if (lectureId) {
      await requireLectureLearningAccess({
        userId: user.id,
        role: user.role,
        lectureId,
      });
      const progress = await prisma.lectureProgress.findUnique({
        where: { userId_lectureId: { userId: user.id, lectureId } },
      });
      return successResponse(progress ?? null);
    }

    if (courseId) {
      await requireEnrollment(user.id, courseId);

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          modules: {
            select: {
              lectures: { where: { published: true }, select: { id: true } },
              quizzes:  { select: { id: true, passingScore: true } },
            },
          },
        },
      });
      if (!course) return successResponse({ lectureIds: [], progress: [], completedCount: 0, totalCount: 0, percent: 0, quizzes: [] });

      const lectureIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));
      const allQuizIds = course.modules.flatMap((m) => m.quizzes.map((q) => q.id));

      const [progressRecords, passedAttempts, certificate] = await Promise.all([
        prisma.lectureProgress.findMany({
          where: { userId: user.id, lectureId: { in: lectureIds } },
        }),
        allQuizIds.length > 0
          ? prisma.quizAttempt.findMany({
              where:    { userId: user.id, quizId: { in: allQuizIds }, passed: true },
              select:   { quizId: true },
              distinct: ["quizId"],
            })
          : Promise.resolve([]),
        prisma.certificate.findUnique({
          where: { userId_courseId: { userId: user.id, courseId } },
          select: { id: true, issuedAt: true },
        }),
      ]);

      const completed  = progressRecords.filter((p) => p.completed).length;
      const total      = lectureIds.length;
      const percent    = total > 0 ? Math.round((completed / total) * 100) : 0;

      const passedQuizIds = new Set(passedAttempts.map((a) => a.quizId));
      const quizSummary   = course.modules.flatMap((m) =>
        m.quizzes.map((q) => ({
          quizId:  q.id,
          passed:  passedQuizIds.has(q.id),
          required: true,
        })),
      );

      const quizzesRemaining  = quizSummary.filter((q) => !q.passed).length;
      const certificateReady  = percent >= 100 && quizzesRemaining === 0;

      return successResponse({
        lectureIds,
        progress:          progressRecords,
        completedCount:    completed,
        totalCount:        total,
        percent,
        // Quiz completion — separate from lecture progress so UI can clearly
        // distinguish "all lectures done" from "course fully complete"
        quizzes:           quizSummary,
        quizzesRemaining,
        // Server-authoritative certificate eligibility flag
        certificateReady,
        certificate:       certificate ?? null,
      });
    }

    // Return recent progress for the user (for student dashboard)
    const allProgress = await prisma.lectureProgress.findMany({
      where: { userId: user.id },
      orderBy: { lastViewedAt: "desc" },
      take: 20,
      include: {
        lecture: {
          select: {
            id: true, title: true, slug: true, thumbnailUrl: true, type: true,
            module: {
              select: {
                id: true, title: true,
                course: { select: { id: true, title: true, slug: true } },
              },
            },
          },
        },
      },
    });

    return successResponse(allProgress);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/progress — upsert progress for a lecture
export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFresh();

    const body = (await req.json()) as unknown;
    const { lectureId, completed, watchedSeconds } = progressSchema.parse(body);

    // Enrollment + lecture→course chain + sequential lock (when completing)
    await requireLectureLearningAccess({
      userId: user.id,
      role: user.role,
      lectureId,
      enforceSequential: completed === true,
    });

    const now = new Date();
    const data: {
      lastViewedAt: Date;
      completed?: boolean;
      completedAt?: Date | null;
      watchedSeconds?: number;
    } = { lastViewedAt: now };

    if (completed !== undefined) {
      data.completed = completed;
      data.completedAt = completed ? now : null;
    }
    if (watchedSeconds !== undefined) data.watchedSeconds = watchedSeconds;

    const progress = await prisma.lectureProgress.upsert({
      where: { userId_lectureId: { userId: user.id, lectureId } },
      create: { userId: user.id, lectureId, ...data },
      update: data,
    });

    if (completed) {
      await recalculateCourseProgress(user.id, lectureId);
    }

    return successResponse(progress);
  } catch (error) {
    return handleApiError(error);
  }
}

async function recalculateCourseProgress(userId: string, lectureId: string) {
  try {
    const lecture = await prisma.lecture.findUnique({
      where: { id: lectureId },
      select: { module: { select: { courseId: true } } },
    });
    const courseId = lecture?.module?.courseId;
    if (!courseId) return;

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) return;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { modules: { select: { lectures: { where: { published: true }, select: { id: true } } } } },
    });
    if (!course) return;

    const allLectureIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));
    const completedCount = await prisma.lectureProgress.count({
      where: { userId, lectureId: { in: allLectureIds }, completed: true },
    });

    const percent = allLectureIds.length > 0
      ? Math.round((completedCount / allLectureIds.length) * 100)
      : 0;

    // Progress % is lecture-based; COMPLETED + certificate require all
    // lectures AND quizzes (enforced inside issueCompletionCertificate).
    await prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { progress: percent },
    });

    if (percent >= 100) {
      await prisma.$transaction(async (tx) => {
        await issueCompletionCertificate(tx, userId, courseId);
      });
    }
  } catch {
    // Non-critical — don't throw
  }
}

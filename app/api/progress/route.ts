import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";
import { z } from "zod";

const progressSchema = z.object({
  lectureId:      z.string().min(1),
  completed:      z.boolean().optional(),
  watchedSeconds: z.number().int().min(0).optional(),
});

// GET /api/progress?courseId=xxx — get user progress for a course
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const courseId  = searchParams.get("courseId");
    const lectureId = searchParams.get("lectureId");

    if (lectureId) {
      const progress = await prisma.lectureProgress.findUnique({
        where: { userId_lectureId: { userId: user.id, lectureId } },
      });
      return successResponse(progress ?? null);
    }

    if (courseId) {
      // Get all lecture IDs in this course
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          modules: {
            select: {
              lectures: { select: { id: true } },
            },
          },
        },
      });
      if (!course) return errorResponse("Course not found", 404);

      const lectureIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));

      const progressRecords = await prisma.lectureProgress.findMany({
        where: { userId: user.id, lectureId: { in: lectureIds } },
      });

      const completed = progressRecords.filter((p) => p.completed).length;
      const total     = lectureIds.length;
      const percent   = total > 0 ? Math.round((completed / total) * 100) : 0;

      return successResponse({
        lectureIds,
        progress: progressRecords,
        completedCount: completed,
        totalCount: total,
        percent,
      });
    }

    // Return all progress for the user (for student dashboard)
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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const body = (await req.json()) as unknown;
    const { lectureId, completed, watchedSeconds } = progressSchema.parse(body);

    const now = new Date();
    const data: {
      lastViewedAt: Date;
      completed?: boolean;
      completedAt?: Date;
      watchedSeconds?: number;
    } = { lastViewedAt: now };

    if (completed !== undefined) {
      data.completed = completed;
      if (completed) data.completedAt = now;
    }
    if (watchedSeconds !== undefined) data.watchedSeconds = watchedSeconds;

    const progress = await prisma.lectureProgress.upsert({
      where: { userId_lectureId: { userId: user.id, lectureId } },
      create: { userId: user.id, lectureId, ...data },
      update: data,
    });

    // After marking complete, recalculate course enrollment progress
    if (completed) {
      await recalculateCourseProgress(user.id, lectureId);
    }

    return successResponse(progress);
  } catch (error) {
    return handleApiError(error);
  }
}

// Recalculate and update enrollment.progress percentage
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
      select: { modules: { select: { lectures: { select: { id: true } } } } },
    });
    if (!course) return;

    const allLectureIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));
    const completedCount = await prisma.lectureProgress.count({
      where: { userId, lectureId: { in: allLectureIds }, completed: true },
    });

    const percent = allLectureIds.length > 0
      ? Math.round((completedCount / allLectureIds.length) * 100)
      : 0;

    await prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: {
        progress: percent,
        status: percent >= 100 ? "COMPLETED" : "ACTIVE",
        completedAt: percent >= 100 ? new Date() : null,
      },
    });
  } catch {
    // Non-critical — don't throw
  }
}

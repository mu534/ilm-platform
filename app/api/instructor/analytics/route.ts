import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prism";
import { requireUserFresh } from "@/app/lib/authorization";
import { successResponse, errorResponse, handleApiError } from "@/app/utils/api";

/**
 * GET /api/instructor/analytics
 *
 * Returns analytics for the authenticated instructor's own courses only.
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await requireUserFresh();

    if (user.role !== "INSTRUCTOR" && user.role !== "ADMIN") {
      return errorResponse("Instructor access required", 403);
    }

    const authorId = user.id;

    const courses = await prisma.course.findMany({
      where:   { authorId },
      select:  { id: true, title: true, slug: true, status: true, approvalStatus: true, createdAt: true },
    });
    const courseIds = courses.map((c) => c.id);

    if (courseIds.length === 0) {
      return successResponse({
        totalCourses:      0,
        totalEnrollments:  0,
        activeStudents:    0,
        completedStudents: 0,
        completionRate:    0,
        avgQuizScore:      null,
        avgRating:         null,
        totalRatings:      0,
        courses:           [],
      });
    }

    const [
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      ratingAgg,
      quizScoreAgg,
      coursesWithStats,
    ] = await Promise.all([
      prisma.enrollment.count({ where: { courseId: { in: courseIds } } }),
      prisma.enrollment.count({ where: { courseId: { in: courseIds }, status: "ACTIVE" } }),
      prisma.enrollment.count({ where: { courseId: { in: courseIds }, status: "COMPLETED" } }),
      prisma.courseRating.aggregate({
        where: { courseId: { in: courseIds } },
        _avg:  { rating: true },
        _count: { rating: true },
      }),
      prisma.quizAttempt.aggregate({
        where: {
          quiz: { module: { courseId: { in: courseIds } } },
        },
        _avg: { score: true },
      }),
      prisma.course.findMany({
        where:  { authorId },
        select: {
          id: true, title: true, slug: true,
          status: true, approvalStatus: true,
          _count: { select: { enrollments: true, ratings: true } },
          ratings: { select: { rating: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const completionRate = totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

    const courseBreakdown = coursesWithStats.map((c) => {
      const avg = c.ratings.length > 0
        ? c.ratings.reduce((sum, r) => sum + r.rating, 0) / c.ratings.length
        : null;
      return {
        id:          c.id,
        title:       c.title,
        slug:        c.slug,
        status:      c.status,
        approvalStatus: c.approvalStatus,
        enrollments: c._count.enrollments,
        ratings:     c._count.ratings,
        avgRating:   avg ? Math.round(avg * 10) / 10 : null,
      };
    });

    return successResponse({
      totalCourses:      courseIds.length,
      totalEnrollments,
      activeStudents:    activeEnrollments,
      completedStudents: completedEnrollments,
      completionRate,
      avgQuizScore:      quizScoreAgg._avg.score
        ? Math.round(quizScoreAgg._avg.score * 10) / 10
        : null,
      avgRating:   ratingAgg._avg.rating
        ? Math.round(ratingAgg._avg.rating * 10) / 10
        : null,
      totalRatings: ratingAgg._count.rating,
      courses:      courseBreakdown,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

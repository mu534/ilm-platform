import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import type { SessionUser } from "../../../types/auth.types";

// GET /api/admin/analytics — full platform analytics (admin only)
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (user?.role !== "ADMIN") return errorResponse("Forbidden", 403);

    const now       = new Date();
    const day30Ago  = new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000);
    const day7Ago   = new Date(now.getTime() -  7  * 24 * 60 * 60 * 1000);
    const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      // Totals
      totalUsers,
      totalScholars,
      totalCourses,
      totalLectures,
      totalEnrollments,
      totalComments,
      totalVerifiedScholars,

      // Growth
      newUsersThisMonth,
      newUsersThisWeek,
      newCoursesThisMonth,
      newLecturesThisMonth,
      newEnrollmentsThisMonth,

      // Engagement
      activeUsersToday,
      totalCertificates,
      pendingReports,
      pendingCourseReviews,

      // Top content
      popularCourses,
      popularLectures,
      popularScholars,

      // Category distribution
      coursesByCategory,

      // Enrollment completion rate
      completedEnrollments,

    ] = await Promise.all([
      prisma.user.count(),
      prisma.scholar.count(),
      prisma.course.count({ where: { published: true } }),
      prisma.lecture.count({ where: { published: true } }),
      prisma.enrollment.count(),
      prisma.comment.count(),
      prisma.scholar.count({ where: { verified: true } }),

      prisma.user.count({ where: { createdAt: { gte: day30Ago } } }),
      prisma.user.count({ where: { createdAt: { gte: day7Ago } } }),
      prisma.course.count({ where: { createdAt: { gte: day30Ago } } }),
      prisma.lecture.count({ where: { createdAt: { gte: day30Ago } } }),
      prisma.enrollment.count({ where: { enrolledAt: { gte: day30Ago } } }),

      prisma.lectureProgress.count({ where: { lastViewedAt: { gte: today } } }),
      prisma.certificate.count(),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.course.count({ where: { approvalStatus: "PENDING" } }),

      prisma.course.findMany({
        where: { published: true },
        take: 5,
        orderBy: { enrollments: { _count: "desc" } },
        select: {
          id: true, title: true, slug: true, thumbnailUrl: true,
          _count: { select: { enrollments: true, ratings: true } },
        },
      }),

      prisma.lecture.findMany({
        where: { published: true },
        take: 5,
        orderBy: { views: "desc" },
        select: {
          id: true, title: true, slug: true, views: true, type: true,
          author: { select: { name: true } },
        },
      }),

      prisma.scholar.findMany({
        take: 5,
        orderBy: { followers: { _count: "desc" } },
        select: {
          id: true, verified: true,
          user: { select: { name: true, image: true } },
          _count: { select: { lectures: true, followers: true } },
        },
      }),

      prisma.category.findMany({
        include: {
          _count: { select: { courses: true, lectures: true } },
        },
        orderBy: { order: "asc" },
      }),

      prisma.enrollment.count({ where: { status: "COMPLETED" } }),
    ]);

    const completionRate = totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

    return successResponse({
      totals: {
        users:           totalUsers,
        scholars:        totalScholars,
        verifiedScholars: totalVerifiedScholars,
        courses:         totalCourses,
        lectures:        totalLectures,
        enrollments:     totalEnrollments,
        comments:        totalComments,
        certificates:    totalCertificates,
      },
      growth: {
        newUsersThisMonth,
        newUsersThisWeek,
        newCoursesThisMonth,
        newLecturesThisMonth,
        newEnrollmentsThisMonth,
        activeUsersToday,
      },
      moderation: {
        pendingReports,
        pendingCourseReviews,
      },
      engagement: {
        completionRate,
        completedEnrollments,
      },
      topContent: {
        courses:  popularCourses,
        lectures: popularLectures,
        scholars: popularScholars,
      },
      categories: coursesByCategory,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

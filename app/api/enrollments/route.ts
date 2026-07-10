import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";

/**
 * GET /api/enrollments
 * - Admin: all enrollments with search/filter/pagination
 * - Scholar: enrollments in their courses only
 * - Student: own enrollments (use /api/progress instead for student use)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const page      = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize  = Math.min(50, Number(searchParams.get("pageSize") ?? 20));
    const search    = searchParams.get("search") ?? "";
    const courseId  = searchParams.get("courseId") ?? "";
    const status    = searchParams.get("status") ?? "";

    // Build base filter depending on role
    type WhereClause = {
      courseId?: string;
      status?:  "ACTIVE" | "COMPLETED" | "DROPPED";
      course?:  { scholarId: string };
      OR?:      Array<{
        user?: { OR?: Array<{ name?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" } }> };
        course?: { title?: { contains: string; mode: "insensitive" } };
      }>;
    };

    const where: WhereClause = {};

    // Role gates
    if (user.role === "SCHOLAR") {
      // Scholar can only see enrollments in their own courses
      const scholar = await prisma.scholar.findUnique({ where: { userId: user.id } });
      if (!scholar) return errorResponse("Scholar profile not found", 404);
      where.course = { scholarId: scholar.id };
    } else if (user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }

    if (courseId) where.courseId = courseId;
    if (status === "ACTIVE" || status === "COMPLETED" || status === "DROPPED") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { user:   { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } },
        { course: { title: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, enrollments] = await Promise.all([
      prisma.enrollment.count({ where }),
      prisma.enrollment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { enrolledAt: "desc" },
        include: {
          user:   { select: { id: true, name: true, email: true, image: true } },
          course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
        },
      }),
    ]);

    return successResponse({
      items: enrollments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

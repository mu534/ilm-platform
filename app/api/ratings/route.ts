import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";
import { z } from "zod";

const ratingSchema = z.object({
  courseId: z.string().min(1),
  rating:   z.number().int().min(1).max(5),
  review:   z.string().max(1000).optional(),
});

// POST /api/ratings — upsert course rating
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const body = (await req.json()) as unknown;
    const { courseId, rating, review } = ratingSchema.parse(body);

    // Must be enrolled to rate
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (!enrollment) return errorResponse("You must be enrolled to rate this course", 403);

    const courseRating = await prisma.courseRating.upsert({
      where: { userId_courseId: { userId: user.id, courseId } },
      create: { userId: user.id, courseId, rating, review },
      update: { rating, review },
    });

    // Return updated aggregate
    const agg = await prisma.courseRating.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return successResponse({
      courseRating,
      avgRating:    agg._avg.rating ?? 0,
      totalRatings: agg._count.rating,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/ratings?courseId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    if (!courseId) return errorResponse("courseId is required", 400);

    const [ratings, agg] = await Promise.all([
      prisma.courseRating.findMany({
        where: { courseId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { id: true, name: true, image: true } } },
      }),
      prisma.courseRating.aggregate({
        where: { courseId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return successResponse({
      ratings,
      avgRating:    agg._avg.rating ?? 0,
      totalRatings: agg._count.rating,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

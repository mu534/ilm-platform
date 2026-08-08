import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireUserFresh } from "../../lib/authorization";
import { requireEnrollment } from "../../lib/courseAccess";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import { z } from "zod";

const ratingSchema = z.object({
  courseId: z.string().min(1),
  rating:   z.number().int().min(1).max(5),
  review:   z.string().max(1000).optional(),
});

// POST /api/ratings — upsert course rating
export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFresh();

    const body = (await req.json()) as unknown;
    const { courseId, rating, review } = ratingSchema.parse(body);

    await requireEnrollment(user.id, courseId);

    const courseRating = await prisma.courseRating.upsert({
      where: { userId_courseId: { userId: user.id, courseId } },
      create: { userId: user.id, courseId, rating, review },
      update: { rating, review },
    });

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

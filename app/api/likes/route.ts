import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireUserFresh, getOptionalUser } from "../../lib/authorization";
import { requireLectureLearningAccess } from "../../lib/courseAccess";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import { z } from "zod";

const likeSchema = z.object({
  lectureId: z.string().min(1),
});

// POST /api/likes — toggle like on a lecture
export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFresh();

    const body = (await req.json()) as unknown;
    const { lectureId } = likeSchema.parse(body);

    await requireLectureLearningAccess({
      userId: user.id,
      role: user.role,
      lectureId,
    });

    const existing = await prisma.like.findUnique({
      where: { userId_lectureId: { userId: user.id, lectureId } },
    });

    if (existing) {
      await prisma.like.delete({
        where: { userId_lectureId: { userId: user.id, lectureId } },
      });
      const count = await prisma.like.count({ where: { lectureId } });
      return successResponse({ liked: false, count });
    }

    await prisma.like.create({ data: { userId: user.id, lectureId } });
    const count = await prisma.like.count({ where: { lectureId } });
    return successResponse({ liked: true, count }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/likes?lectureId=xxx
export async function GET(req: NextRequest) {
  try {
    const user = await getOptionalUser();

    const { searchParams } = new URL(req.url);
    const lectureId = searchParams.get("lectureId");
    if (!lectureId) return errorResponse("lectureId is required", 400);

    const [count, userLiked] = await Promise.all([
      prisma.like.count({ where: { lectureId } }),
      user
        ? prisma.like.findUnique({
            where: { userId_lectureId: { userId: user.id, lectureId } },
          })
        : null,
    ]);

    return successResponse({ count, liked: !!userLiked });
  } catch (error) {
    return handleApiError(error);
  }
}

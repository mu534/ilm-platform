import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh, getOptionalUser } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";

// POST /api/scholars/[id]/follow — toggle follow
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();

    const { id: scholarId } = await params;

    const scholar = await prisma.scholar.findUnique({ where: { id: scholarId } });
    if (!scholar) return errorResponse("Scholar not found", 404);

    // Prevent following own profile
    if (scholar.userId === user.id) {
      return errorResponse("Cannot follow your own profile", 400);
    }

    const existing = await prisma.scholarFollow.findUnique({
      where: { userId_scholarId: { userId: user.id, scholarId } },
    });

    if (existing) {
      await prisma.scholarFollow.delete({
        where: { userId_scholarId: { userId: user.id, scholarId } },
      });
      const count = await prisma.scholarFollow.count({ where: { scholarId } });
      return successResponse({ following: false, followerCount: count });
    }

    await prisma.scholarFollow.create({ data: { userId: user.id, scholarId } });

    // Notify the scholar
    await prisma.notification.create({
      data: {
        userId:  scholar.userId,
        type:    "NEW_FOLLOWER",
        title:   "New Follower",
        message: `${user.name ?? "Someone"} started following you.`,
        link:    `/scholars/${scholarId}`,
      },
    });

    const count = await prisma.scholarFollow.count({ where: { scholarId } });
    return successResponse({ following: true, followerCount: count }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/scholars/[id]/follow — check follow status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOptionalUser();

    const { id: scholarId } = await params;

    const [followerCount, isFollowing] = await Promise.all([
      prisma.scholarFollow.count({ where: { scholarId } }),
      user
        ? prisma.scholarFollow.findUnique({
            where: { userId_scholarId: { userId: user.id, scholarId } },
          })
        : null,
    ]);

    return successResponse({ following: !!isFollowing, followerCount });
  } catch (error) {
    return handleApiError(error);
  }
}

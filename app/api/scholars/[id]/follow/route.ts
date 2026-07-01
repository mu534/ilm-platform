import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/auth.types";

// POST /api/scholars/[id]/follow — toggle follow
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;

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

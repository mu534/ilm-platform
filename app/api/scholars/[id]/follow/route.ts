import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh, getOptionalUser } from "../../../../lib/authorization";
import { ScholarService } from "../../../../lib/services/scholarService";
import { successResponse, handleApiError } from "../../../../utils/api";

// POST /api/scholars/[id]/follow — toggle follow
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: scholarId } = await params;

    const result = await ScholarService.followScholar(user.id, scholarId);
    return successResponse(result);
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

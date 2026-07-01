import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";

// GET /api/certificates — get current user's certificates
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const certificates = await prisma.certificate.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: "desc" },
      include: {
        course: {
          select: {
            id: true, title: true, slug: true, thumbnailUrl: true,
            scholar: { select: { user: { select: { name: true } } } },
          },
        },
      },
    });

    return successResponse(certificates);
  } catch (error) {
    return handleApiError(error);
  }
}

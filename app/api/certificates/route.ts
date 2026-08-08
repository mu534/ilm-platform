import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireUserFresh } from "../../lib/authorization";
import { successResponse, handleApiError } from "../../utils/api";

// GET /api/certificates — get the authenticated user's own certificates only
export async function GET(_req: NextRequest) {
  try {
    const user = await requireUserFresh();

    // Always scoped to the authenticated user — never trust a client-supplied userId
    const certificates = await prisma.certificate.findMany({
      where:   { userId: user.id },
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

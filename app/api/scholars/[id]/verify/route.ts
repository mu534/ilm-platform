import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireAdmin } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";

// PATCH /api/scholars/[id]/verify — admin only, toggles verified status
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const scholar = await prisma.scholar.findUnique({ where: { id } });
    if (!scholar) return errorResponse("Scholar not found", 404);

    const updated = await prisma.scholar.update({
      where: { id },
      data: {
        verified:   !scholar.verified,
        verifiedAt: !scholar.verified ? new Date() : null,
      },
      select: { id: true, verified: true, verifiedAt: true },
    });

    // Notify the scholar
    await prisma.notification.create({
      data: {
        userId:  scholar.userId,
        type:    "ANNOUNCEMENT",
        title:   updated.verified ? "You are now a Verified Scholar!" : "Verification removed",
        message: updated.verified
          ? "Congratulations! Your scholar profile has been verified by the admin."
          : "Your scholar verification has been removed.",
        link: `/scholars/${id}`,
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

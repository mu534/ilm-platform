import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireUserFresh } from "../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";

// DELETE /api/bookmarks/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id } = await params;

    const bookmark = await prisma.bookmark.findUnique({ where: { id } });
    if (!bookmark) return errorResponse("Bookmark not found", 404);
    // IDOR: only the bookmark owner can delete their own bookmark
    if (bookmark.userId !== user.id && user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }

    await prisma.bookmark.delete({ where: { id } });
    return successResponse({ message: "Bookmark removed" });
  } catch (error) {
    return handleApiError(error);
  }
}

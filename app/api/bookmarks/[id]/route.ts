import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import type { SessionUser } from "../../../types/auth.types";

// DELETE /api/bookmarks/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    const bookmark = await prisma.bookmark.findUnique({ where: { id } });
    if (!bookmark) return errorResponse("Bookmark not found", 404);
    if (bookmark.userId !== user.id) return errorResponse("Forbidden", 403);

    await prisma.bookmark.delete({ where: { id } });
    return successResponse({ message: "Bookmark removed" });
  } catch (error) {
    return handleApiError(error);
  }
}

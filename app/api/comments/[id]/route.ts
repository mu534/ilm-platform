import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "../../../utils/api";
import type { SessionUser } from "../../../types/next-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id: userId, role: userRole } = session.user as SessionUser;
    const { id } = await params;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });
    if (!comment) return errorResponse("Comment not found", 404);

    const isAdmin = userRole === "ADMIN";
    const isOwner = comment.authorId === userId;

    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    await prisma.comment.delete({ where: { id } });
    return successResponse({ message: "Comment deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { role: userRole } = session.user as SessionUser;
    if (userRole !== "ADMIN") return errorResponse("Forbidden", 403);

    const body = (await req.json()) as { approved: boolean };
    const { id } = await params;

    const comment = await prisma.comment.update({
      where: { id },
      data: { approved: body.approved },
    });

    return successResponse(comment);
  } catch (error) {
    return handleApiError(error);
  }
}

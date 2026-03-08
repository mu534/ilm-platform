// src/app/api/comments/[id]/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, handleApiError } from "@/utils/api";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const comment = await prisma.comment.findUnique({
      where: { id: params.id },
    });
    if (!comment) return errorResponse("Comment not found", 404);

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    const isAdmin = userRole === "ADMIN";
    const isOwner = comment.authorId === userId;

    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    await prisma.comment.delete({ where: { id: params.id } });
    return successResponse({ message: "Comment deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN") return errorResponse("Forbidden", 403);

    const body = await req.json();
    const comment = await prisma.comment.update({
      where: { id: params.id },
      data: { approved: body.approved },
    });
    return successResponse(comment);
  } catch (error) {
    return handleApiError(error);
  }
}

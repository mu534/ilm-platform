import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireAdmin, requireUserFresh } from "../../../lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "../../../utils/api";
import { z } from "zod";

const approveSchema = z.object({
  approved: z.boolean(),
});

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id } = await params;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });
    if (!comment) return errorResponse("Comment not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = comment.authorId === user.id;

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
    await requireAdmin();

    const body = (await req.json()) as unknown;
    const { approved } = approveSchema.parse(body);
    const { id } = await params;

    const comment = await prisma.comment.update({
      where: { id },
      data: { approved },
    });

    return successResponse(comment);
  } catch (error) {
    return handleApiError(error);
  }
}

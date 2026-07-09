import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/auth.types";
import { z } from "zod";

const acceptSchema = z.object({ replyId: z.string().min(1) });

// PATCH /api/forum/[id]/accept — mark reply as accepted answer
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id: questionId } = await params;
    const question = await prisma.forumQuestion.findUnique({ where: { id: questionId } });
    if (!question) return errorResponse("Question not found", 404);

    if (question.authorId !== user.id && user.role !== "ADMIN") {
      return errorResponse("Only the question author can accept an answer", 403);
    }

    const { replyId } = acceptSchema.parse(await req.json());

    // Unaccept all other replies, then accept this one
    await prisma.forumReply.updateMany({
      where: { questionId },
      data:  { isAccepted: false },
    });

    await prisma.forumReply.update({
      where: { id: replyId },
      data:  { isAccepted: true },
    });

    await prisma.forumQuestion.update({
      where: { id: questionId },
      data:  { resolved: true },
    });

    return successResponse({ accepted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import { z } from "zod";

const acceptSchema = z.object({ replyId: z.string().min(1) });

// PATCH /api/forum/[id]/accept — mark reply as accepted answer
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: questionId } = await params;

    const question = await prisma.forumQuestion.findUnique({ where: { id: questionId } });
    if (!question) return errorResponse("Question not found", 404);

    if (question.authorId !== user.id && user.role !== "ADMIN") {
      return errorResponse("Only the question author can accept an answer", 403);
    }

    const { replyId } = acceptSchema.parse(await req.json());

    // IDOR: verify reply belongs to this question
    const reply = await prisma.forumReply.findFirst({
      where: { id: replyId, questionId },
      select: { id: true },
    });
    if (!reply) return errorResponse("Reply not found in this question", 404);

    await prisma.forumReply.updateMany({ where: { questionId }, data: { isAccepted: false } });
    await prisma.forumReply.update({ where: { id: replyId }, data: { isAccepted: true } });
    await prisma.forumQuestion.update({ where: { id: questionId }, data: { resolved: true } });

    return successResponse({ accepted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

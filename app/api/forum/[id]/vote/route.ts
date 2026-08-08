import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import { z } from "zod";

const voteSchema = z.object({
  value:   z.union([z.literal(1), z.literal(-1)]),
  replyId: z.string().optional(),
});

// POST /api/forum/[id]/vote — upvote/downvote question or reply
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: questionId } = await params;
    const body = (await req.json()) as unknown;
    const { value, replyId } = voteSchema.parse(body);

    if (replyId) {
      // Verify reply belongs to this question (IDOR prevention)
      const reply = await prisma.forumReply.findFirst({
        where: { id: replyId, questionId },
        select: { id: true },
      });
      if (!reply) return errorResponse("Reply not found", 404);

      const existing = await prisma.forumVote.findUnique({
        where: { userId_replyId: { userId: user.id, replyId } },
      });
      if (existing) {
        if (existing.value === value) {
          await prisma.forumVote.delete({ where: { userId_replyId: { userId: user.id, replyId } } });
          return successResponse({ removed: true });
        }
        await prisma.forumVote.update({
          where: { userId_replyId: { userId: user.id, replyId } },
          data:  { value },
        });
      } else {
        await prisma.forumVote.create({ data: { userId: user.id, replyId, value } });
      }
    } else {
      // Vote on question — verify question exists
      const question = await prisma.forumQuestion.findUnique({
        where:  { id: questionId },
        select: { id: true },
      });
      if (!question) return errorResponse("Question not found", 404);

      const existing = await prisma.forumVote.findUnique({
        where: { userId_questionId: { userId: user.id, questionId } },
      });
      if (existing) {
        if (existing.value === value) {
          await prisma.forumVote.delete({ where: { userId_questionId: { userId: user.id, questionId } } });
          return successResponse({ removed: true });
        }
        await prisma.forumVote.update({
          where: { userId_questionId: { userId: user.id, questionId } },
          data:  { value },
        });
      } else {
        await prisma.forumVote.create({ data: { userId: user.id, questionId, value } });
      }
    }

    return successResponse({ voted: true, value });
  } catch (error) {
    return handleApiError(error);
  }
}

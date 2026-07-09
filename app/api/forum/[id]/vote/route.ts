import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/auth.types";
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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id: questionId } = await params;
    const body = (await req.json()) as unknown;
    const { value, replyId } = voteSchema.parse(body);

    if (replyId) {
      // Vote on reply
      const existing = await prisma.forumVote.findUnique({
        where: { userId_replyId: { userId: user.id, replyId } },
      });
      if (existing) {
        if (existing.value === value) {
          await prisma.forumVote.delete({ where: { userId_replyId: { userId: user.id, replyId } } });
          return successResponse({ removed: true });
        }
        await prisma.forumVote.update({ where: { userId_replyId: { userId: user.id, replyId } }, data: { value } });
      } else {
        await prisma.forumVote.create({ data: { userId: user.id, replyId, value } });
      }
    } else {
      // Vote on question
      const existing = await prisma.forumVote.findUnique({
        where: { userId_questionId: { userId: user.id, questionId } },
      });
      if (existing) {
        if (existing.value === value) {
          await prisma.forumVote.delete({ where: { userId_questionId: { userId: user.id, questionId } } });
          return successResponse({ removed: true });
        }
        await prisma.forumVote.update({ where: { userId_questionId: { userId: user.id, questionId } }, data: { value } });
      } else {
        await prisma.forumVote.create({ data: { userId: user.id, questionId, value } });
      }
    }

    return successResponse({ voted: true, value });
  } catch (error) {
    return handleApiError(error);
  }
}

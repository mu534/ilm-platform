import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import type { SessionUser } from "../../../types/auth.types";
import { z } from "zod";

const replySchema = z.object({
  body: z.string().min(2).max(3000),
});

// GET /api/forum/[id] — full question with replies
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.forumQuestion.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    const question = await prisma.forumQuestion.findUnique({
      where: { id },
      include: {
        author:  { select: { id: true, name: true, image: true } },
        replies: {
          orderBy: [{ isAccepted: "desc" }, { createdAt: "asc" }],
          include: {
            author: { select: { id: true, name: true, image: true } },
            votes:  { select: { userId: true, value: true } },
            _count: { select: { votes: true } },
          },
        },
        votes:  { select: { userId: true, value: true } },
        _count: { select: { replies: true, votes: true } },
      },
    });

    if (!question) return errorResponse("Question not found", 404);
    return successResponse(question);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/forum/[id] — add reply
export async function POST(
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

    const body = (await req.json()) as unknown;
    const { body: replyBody } = replySchema.parse(body);

    const reply = await prisma.forumReply.create({
      data: { body: replyBody, questionId, authorId: user.id },
      include: { author: { select: { id: true, name: true, image: true } } },
    });

    // Notify question author
    if (question.authorId !== user.id) {
      await prisma.notification.create({
        data: {
          userId:  question.authorId,
          type:    "COMMENT_REPLY",
          title:   "New reply to your question",
          message: `${user.name ?? "Someone"} replied: "${replyBody.slice(0, 80)}…"`,
          link:    `/forum/${questionId}`,
        },
      });
    }

    return successResponse(reply, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/forum/[id] — delete question (owner or admin)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    const question = await prisma.forumQuestion.findUnique({ where: { id } });
    if (!question) return errorResponse("Question not found", 404);

    if (question.authorId !== user.id && user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }

    await prisma.forumQuestion.delete({ where: { id } });
    return successResponse({ message: "Question deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

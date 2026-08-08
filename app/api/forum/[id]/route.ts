import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireUserFresh } from "../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
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
      data:  { views: { increment: 1 } },
    }).catch(() => {/* question may not exist — handled below */});

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
    const user = await requireUserFresh();
    const { id: questionId } = await params;

    const question = await prisma.forumQuestion.findUnique({ where: { id: questionId } });
    if (!question) return errorResponse("Question not found", 404);

    const body = (await req.json()) as unknown;
    const { body: replyBody } = replySchema.parse(body);

    const reply = await prisma.forumReply.create({
      data:    { body: replyBody, questionId, authorId: user.id },
      include: { author: { select: { id: true, name: true, image: true } } },
    });

    // Notify question author about new reply
    if (question.authorId !== user.id) {
      await prisma.notification.create({
        data: {
          userId:  question.authorId,
          type:    "COMMENT_REPLY",
          title:   "New reply to your question",
          message: `${user.name ?? "Someone"} replied: "${replyBody.slice(0, 100)}${replyBody.length > 100 ? "…" : ""}"`,
          link:    `/forum/${questionId}`,
        },
      }).catch(() => {/* non-critical */});
    }

    return successResponse(reply, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/forum/[id] — update question (owner only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id } = await params;

    const question = await prisma.forumQuestion.findUnique({ where: { id } });
    if (!question) return errorResponse("Question not found", 404);

    // Only the author can edit their own question; admins can also edit
    if (question.authorId !== user.id && user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }

    const body = (await req.json()) as Record<string, unknown>;
    // Only allow editing title, body, resolved — never courseId or authorId
    const updateData: { title?: string; body?: string; resolved?: boolean } = {};
    if (typeof body.title    === "string") updateData.title    = body.title.slice(0, 300);
    if (typeof body.body     === "string") updateData.body     = body.body.slice(0, 5000);
    if (typeof body.resolved === "boolean") updateData.resolved = body.resolved;

    const updated = await prisma.forumQuestion.update({ where: { id }, data: updateData });
    return successResponse(updated);
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
    const user = await requireUserFresh();
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

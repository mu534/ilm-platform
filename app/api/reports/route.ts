import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireUserFresh } from "../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import { ReportReason } from "../../../generated/prisma/enums";
import { z } from "zod";

const reportSchema = z.object({
  reason:      z.nativeEnum(ReportReason),
  description: z.string().max(500).optional(),
  // Exactly one target must be provided — validated below
  commentId:       z.string().optional(),
  forumQuestionId: z.string().optional(),
  forumReplyId:    z.string().optional(),
  courseId:        z.string().optional(),
});

// POST /api/reports — submit a report
export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFresh();

    const body = (await req.json()) as unknown;
    const data = reportSchema.parse(body);

    const { commentId, forumQuestionId, forumReplyId, courseId } = data;
    const targets = [commentId, forumQuestionId, forumReplyId, courseId].filter(Boolean);

    if (targets.length === 0) {
      return errorResponse(
        "A report target is required (commentId, forumQuestionId, forumReplyId, or courseId)",
        400,
      );
    }
    if (targets.length > 1) {
      return errorResponse("Only one report target may be provided per report", 400);
    }

    // Verify the target exists to prevent reporting phantom IDs
    if (commentId) {
      const exists = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true } });
      if (!exists) return errorResponse("Comment not found", 404);
    } else if (forumQuestionId) {
      const exists = await prisma.forumQuestion.findUnique({ where: { id: forumQuestionId }, select: { id: true } });
      if (!exists) return errorResponse("Forum question not found", 404);
    } else if (forumReplyId) {
      const exists = await prisma.forumReply.findUnique({ where: { id: forumReplyId }, select: { id: true } });
      if (!exists) return errorResponse("Forum reply not found", 404);
    } else if (courseId) {
      const exists = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
      if (!exists) return errorResponse("Course not found", 404);
    }

    const report = await prisma.report.create({
      data: {
        reportedById:    user.id,
        reason:          data.reason,
        description:     data.description,
        commentId:       commentId ?? null,
        forumQuestionId: forumQuestionId ?? null,
        forumReplyId:    forumReplyId ?? null,
        courseId:        courseId ?? null,
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where:  { role: "ADMIN" },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId:  admin.id,
        type:    "ANNOUNCEMENT" as const,
        title:   "New Content Report",
        message: `A ${data.reason.toLowerCase().replace(/_/g, " ")} report has been submitted.`,
        link:    `/admin/reports`,
      })),
      skipDuplicates: true,
    });

    return successResponse(report, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/reports — admin only, list all reports
export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFresh();
    if (user.role !== "ADMIN") return errorResponse("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const status   = searchParams.get("status") ?? "";
    const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = 20;

    const where = status
      ? { status: status as "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED" }
      : {};

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          reportedBy: { select: { id: true, name: true, email: true } },
          resolvedBy: { select: { id: true, name: true } },
          comment: {
            select: {
              id: true, body: true,
              author:  { select: { name: true } },
              lecture: { select: { title: true, slug: true } },
            },
          },
          forumQuestion: {
            select: { id: true, title: true, body: true, author: { select: { name: true } } },
          },
          forumReply: {
            select: {
              id: true, body: true,
              author:   { select: { name: true } },
              question: { select: { id: true, title: true } },
            },
          },
          course: {
            select: { id: true, title: true, slug: true, author: { select: { name: true } } },
          },
        },
      }),
    ]);

    return successResponse({ reports, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}

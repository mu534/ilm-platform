import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireUserFresh } from "../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import { z } from "zod";

const resolveSchema = z.object({
  status: z.enum(["REVIEWED", "RESOLVED", "DISMISSED"]),
  note:   z.string().max(500).optional(),
});

// PATCH /api/reports/[id] — admin resolves a report
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    if (user.role !== "ADMIN") return errorResponse("Forbidden", 403);

    const { id } = await params;
    const body = (await req.json()) as unknown;
    const { status, note } = resolveSchema.parse(body);

    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) return errorResponse("Report not found", 404);

    const report = await prisma.report.update({
      where: { id },
      data: {
        status,
        resolvedNote: note ?? null,
        resolvedAt:   new Date(),
        resolvedById: user.id,
      },
    });

    // Take appropriate moderation action on RESOLVED for each report type.
    // REVIEWED and DISMISSED are acknowledgement states — no content change.
    if (status === "RESOLVED") {
      // Comment → hide by setting approved = false
      if (report.commentId) {
        await prisma.comment.update({
          where: { id: report.commentId },
          data:  { approved: false },
        }).catch(() => {/* already deleted */});
      }

      // Forum question → delete (cascade removes replies/votes)
      if (report.forumQuestionId) {
        await prisma.forumQuestion.delete({
          where: { id: report.forumQuestionId },
        }).catch(() => {/* already deleted */});
      }

      // Forum reply → delete (cascade removes votes)
      if (report.forumReplyId) {
        await prisma.forumReply.delete({
          where: { id: report.forumReplyId },
        }).catch(() => {/* already deleted */});
      }

      // Course → unpublish and move to REJECTED state via existing workflow
      if (report.courseId) {
        await prisma.course.update({
          where: { id: report.courseId },
          data: {
            published:      false,
            status:         "REJECTED",
            approvalStatus: "REJECTED",
            approvalNote:   note ?? "Removed following a resolved content report.",
            reviewedAt:     new Date(),
          },
        }).catch(() => {/* already deleted */});

        // Notify the course author
        const course = await prisma.course.findUnique({
          where:  { id: report.courseId },
          select: { authorId: true, title: true },
        }).catch(() => null);

        if (course) {
          await prisma.notification.create({
            data: {
              userId:  course.authorId,
              type:    "COURSE_REJECTED",
              title:   "Course Removed",
              message: `Your course has been removed following a content review. ${note ? `Reason: ${note}` : ""}`,
              link:    `/admin/courses`,
            },
          }).catch(() => {/* non-critical */});
        }
      }
    }

    return successResponse(report);
  } catch (error) {
    return handleApiError(error);
  }
}

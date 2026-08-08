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

    // If resolved, take content action based on what was reported
    if (status === "RESOLVED") {
      if (report.commentId) {
        await prisma.comment.update({
          where: { id: report.commentId },
          data:  { approved: false },
        }).catch(() => {/* comment may have been deleted */});
      }
      if (report.forumQuestionId) {
        // Mark forum question as unresolved (soft hide by locking — field doesn't exist,
        // so we just log the action; extending to a "hidden" field is a future migration)
        // For now, the admin can delete directly via admin panel
      }
    }

    return successResponse(report);
  } catch (error) {
    return handleApiError(error);
  }
}

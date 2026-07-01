import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import type { SessionUser } from "../../../types/auth.types";
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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (user?.role !== "ADMIN") return errorResponse("Forbidden", 403);

    const { id } = await params;
    const body = (await req.json()) as unknown;
    const { status, note } = resolveSchema.parse(body);

    const report = await prisma.report.update({
      where: { id },
      data: {
        status,
        resolvedNote: note,
        resolvedAt:   new Date(),
      },
    });

    // If resolved, optionally hide the reported comment
    if (status === "RESOLVED" && report.commentId) {
      await prisma.comment.update({
        where: { id: report.commentId },
        data:  { approved: false },
      });
    }

    return successResponse(report);
  } catch (error) {
    return handleApiError(error);
  }
}

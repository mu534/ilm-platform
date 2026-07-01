import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";
import { ReportReason } from "../../../generated/prisma/enums";
import { z } from "zod";

const reportSchema = z.object({
  commentId:   z.string().optional(),
  reason:      z.nativeEnum(ReportReason),
  description: z.string().max(500).optional(),
});

// POST /api/reports — submit a report
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const body = (await req.json()) as unknown;
    const data = reportSchema.parse(body);

    if (!data.commentId) return errorResponse("A target (commentId) is required", 400);

    const report = await prisma.report.create({
      data: {
        reportedById: user.id,
        reason:       data.reason,
        description:  data.description,
        commentId:    data.commentId,
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId:  admin.id,
        type:    "ANNOUNCEMENT" as const,
        title:   "New Content Report",
        message: `A ${data.reason.toLowerCase().replace("_", " ")} report has been submitted.`,
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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (user?.role !== "ADMIN") return errorResponse("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const status  = searchParams.get("status") ?? "";
    const page    = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = 20;

    const where = status
      ? { status: status as "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED" }
      : {};

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          reportedBy: { select: { id: true, name: true, email: true } },
          comment: {
            select: {
              id: true, body: true,
              author: { select: { name: true } },
              lecture: { select: { title: true, slug: true } },
            },
          },
        },
      }),
    ]);

    return successResponse({ reports, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}

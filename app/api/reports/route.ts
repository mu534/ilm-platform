import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireUserFresh } from "../../lib/authorization";
import { ModerationService } from "../../lib/services/moderationService";
import { createReportSchema } from "../../lib/validations";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";

// POST /api/reports — submit a report
export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFresh();
    const body = (await req.json()) as unknown;
    const input = createReportSchema.parse(body);

    const report = await ModerationService.createReport(user, input);

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "ANNOUNCEMENT" as const,
        title: "New Content Report",
        message: `A ${input.reason.toLowerCase().replace(/_/g, " ")} report has been submitted.`,
        link: `/admin/reports`,
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
    const status = searchParams.get("status") ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
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
          resolvedBy: { select: { id: true, name: true } },
          comment: {
            select: {
              id: true,
              body: true,
              author: { select: { name: true } },
              lecture: { select: { title: true, slug: true } },
            },
          },
          forumQuestion: {
            select: { id: true, title: true, body: true, author: { select: { name: true } } },
          },
          forumReply: {
            select: {
              id: true,
              body: true,
              author: { select: { name: true } },
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

import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireAdmin } from "../../../lib/authorization";
import { successResponse, handleApiError } from "../../../utils/api";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const page     = Math.max(1, Number(searchParams.get("page")     ?? 1));
    const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 30));
    const search   = searchParams.get("search") ?? "";
    const action   = searchParams.get("action") ?? "";

    const where = {
      ...(action ? { action } : {}),
      ...(search ? {
        OR: [
          { user:       { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] } },
          { entityType: { contains: search, mode: "insensitive" as const } },
          { entityId:   { contains: search, mode: "insensitive" as const } },
        ],
      } : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return successResponse({
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

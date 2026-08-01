import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import type { SessionUser } from "../../../types/auth.types";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user    = session?.user as SessionUser | undefined;
    if (user?.role !== "ADMIN") return errorResponse("Forbidden", 403);

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

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    return successResponse({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

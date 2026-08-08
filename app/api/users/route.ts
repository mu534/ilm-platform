import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireAdmin } from "../../lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "../../utils/api";
import type { UserWhereInput } from "../../../generated/prisma/models/User";
import { Role } from "../../../generated/prisma/enums";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 20));
    const search = searchParams.get("search") ?? "";
    const roleParam = searchParams.get("role") ?? "";

    const where: UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Validate role param against the enum before using it
    if (roleParam && roleParam in Role) {
      where.role = Role[roleParam as keyof typeof Role];
    }

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          createdAt: true,
          _count: { select: { lectures: true, comments: true } },
        },
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

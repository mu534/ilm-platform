import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireAdmin } from "../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";

// GET /api/admin/certificates?page=1&search=&filter=all|valid|revoked
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = 20;
    const search   = (searchParams.get("search") ?? "").trim();
    const filter   = searchParams.get("filter") ?? "all";

    type Where = {
      isRevoked?: boolean;
      OR?: Array<Record<string, unknown>>;
    };

    const where: Where = {};
    if (filter === "valid")   where.isRevoked = false;
    if (filter === "revoked") where.isRevoked = true;

    if (search) {
      where.OR = [
        { certificateId: { contains: search, mode: "insensitive" } },
        { studentName:   { contains: search, mode: "insensitive" } },
        { title:         { contains: search, mode: "insensitive" } },
        { user:  { name:  { contains: search, mode: "insensitive" } } },
        { user:  { email: { contains: search, mode: "insensitive" } } },
        { course: { title: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, certificates] = await Promise.all([
      prisma.certificate.count({ where }),
      prisma.certificate.findMany({
        where,
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        orderBy: { issuedAt: "desc" },
        select: {
          id:               true,
          certificateId:    true,
          studentName:      true,
          title:            true,
          instructorName:   true,
          issuedAt:         true,
          completionDate:   true,
          isRevoked:        true,
          revokedAt:        true,
          revocationReason: true,
          user:   { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true, slug: true } },
        },
      }),
    ]);

    return successResponse({ certificates, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireAdmin } from "../../../lib/authorization";
import { successResponse, handleApiError } from "../../../utils/api";

// GET /api/admin/certificates - List all certificates for administrative management
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();
    const status = searchParams.get("status"); // "all" | "active" | "revoked"

    const where: Record<string, unknown> = {};

    if (status === "active") {
      where.isRevoked = false;
    } else if (status === "revoked") {
      where.isRevoked = true;
    }

    if (query) {
      where.OR = [
        { certificateId: { contains: query, mode: "insensitive" } },
        { studentName: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
      ];
    }

    const certificates = await prisma.certificate.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true, slug: true } },
        revokedBy: { select: { name: true } },
        audits: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    return successResponse(certificates);
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "../../../../../lib/prism";
import { requireAdmin } from "../../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../../utils/api";
import { z } from "zod";

const revokeSchema = z.object({
  action: z.enum(["revoke", "reinstate"]),
  reason: z.string().trim().min(3, "A detailed reason is required").max(500),
});

// POST /api/admin/certificates/[id]/revoke - Revoke or reinstate a certificate
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const cert = await prisma.certificate.findUnique({
      where: { id },
    });

    if (!cert) return errorResponse("Certificate not found", 404);

    const body = await req.json();
    const { action, reason } = revokeSchema.parse(body);

    if (action === "revoke") {
      if (cert.isRevoked) {
        return errorResponse("Certificate is already revoked", 400);
      }

      const updated = await prisma.certificate.update({
        where: { id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedById: admin.id,
          revocationReason: reason,
        },
      });

      await prisma.certificateAudit.create({
        data: {
          certificateId: id,
          action: "REVOKED",
          performedById: admin.id,
          reason,
          metadata: {
            revokedAt: updated.revokedAt,
            revokedBy: admin.name,
          },
        },
      });

      return successResponse({
        message: "Certificate has been revoked successfully",
        certificate: updated,
      });
    }

    if (action === "reinstate") {
      if (!cert.isRevoked) {
        return errorResponse("Certificate is not revoked", 400);
      }

      const updated = await prisma.certificate.update({
        where: { id },
        data: {
          isRevoked: false,
          revokedAt: null,
          revokedById: null,
          revocationReason: null,
        },
      });

      await prisma.certificateAudit.create({
        data: {
          certificateId: id,
          action: "REINSTATED",
          performedById: admin.id,
          reason,
          metadata: {
            reinstatedAt: new Date(),
            reinstatedBy: admin.name,
          },
        },
      });

      return successResponse({
        message: "Certificate has been reinstated successfully",
        certificate: updated,
      });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    return handleApiError(error);
  }
}

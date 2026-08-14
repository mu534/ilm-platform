import { NextRequest } from "next/server";
import { prisma } from "../../../../../lib/prism";
import { requireAdmin } from "../../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../../utils/api";

// POST /api/admin/certificates/[id]/reinstate
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const cert = await prisma.certificate.findUnique({
      where:  { id },
      select: { id: true, isRevoked: true, userId: true, certificateId: true },
    });
    if (!cert) return errorResponse("Certificate not found", 404);
    if (!cert.isRevoked) return errorResponse("Certificate is not revoked", 409);

    await prisma.$transaction(async (tx) => {
      await tx.certificate.update({
        where: { id },
        data: {
          isRevoked:        false,
          revokedAt:        null,
          revokedById:      null,
          revocationReason: null,
        },
      });

      await tx.certificateAudit.create({
        data: {
          certificateId: id,
          action:        "REINSTATED",
          performedById: admin.id,
          reason:        "Reinstated by administrator",
          metadata: { certificateId: cert.certificateId },
        },
      });

      await tx.notification.create({
        data: {
          userId:  cert.userId,
          type:    "ANNOUNCEMENT" as const,
          title:   "Certificate Reinstated",
          message: "Your certificate has been reinstated and is now valid.",
          link:    "/dashboard/certificates",
        },
      });
    });

    return successResponse({ message: "Certificate reinstated" });
  } catch (error) {
    return handleApiError(error);
  }
}

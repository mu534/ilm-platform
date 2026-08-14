import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireAdmin } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";

// GET /api/admin/certificates/[id] — full certificate detail with audit trail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const cert = await prisma.certificate.findUnique({
      where: { id },
      select: {
        id:               true,
        certificateId:    true,
        studentName:      true,
        title:            true,
        instructorName:   true,
        issuedAt:         true,
        completionDate:   true,
        courseDuration:   true,
        isRevoked:        true,
        revokedAt:        true,
        revocationReason: true,
        verificationUrl:  true,
        certificateTemplateVersion: true,
        user:       { select: { id: true, name: true, email: true, image: true } },
        course:     { select: { id: true, title: true, slug: true, difficulty: true } },
        revokedBy:  { select: { name: true } },
        audits: {
          orderBy: { createdAt: "desc" },
          select: {
            id:          true,
            action:      true,
            reason:      true,
            createdAt:   true,
            performedBy: { select: { name: true } },
          },
        },
      },
    });

    if (!cert) return errorResponse("Certificate not found", 404);
    return successResponse(cert);
  } catch (error) {
    return handleApiError(error);
  }
}

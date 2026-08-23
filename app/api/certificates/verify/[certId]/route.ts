import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";

// GET /api/certificates/verify/[certId]
// Public endpoint — no auth required for certificate verification
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ certId: string }> },
) {
  try {
    const { certId } = await params;

    const cert = await prisma.certificate.findFirst({
      where: { certificateId: certId },
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
        signaturesSnapshot: true,
        course: { select: { title: true, slug: true } },
        user:   { select: { name: true } },
      },
    });

    if (!cert) return errorResponse("Certificate not found", 404);

    return successResponse(cert);
  } catch (error) {
    return handleApiError(error);
  }
}

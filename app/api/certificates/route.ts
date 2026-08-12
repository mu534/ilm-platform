import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireUserFresh } from "../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import {
  issueCertificate,
  CertificateEligibilityError,
  StudentNameValidationError,
} from "../../lib/certificate";

// GET /api/certificates — get the authenticated user's own certificates only
export async function GET(_req: NextRequest) {
  try {
    const user = await requireUserFresh();

    // Always scoped to the authenticated user — never trust a client-supplied userId
    const certificates = await prisma.certificate.findMany({
      where:   { userId: user.id },
      orderBy: { issuedAt: "desc" },
      include: {
        course: {
          select: {
            id: true, title: true, slug: true, thumbnailUrl: true,
            scholar: { select: { user: { select: { name: true } } } },
          },
        },
      },
    });

    return successResponse(certificates);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/certificates — issue a certificate for a completed course
export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFresh();
    const body = await req.json();
    const { courseId } = body;

    if (!courseId) {
      return errorResponse("Course ID is required", 400);
    }

    const certificate = await issueCertificate(user.id, courseId);

    return successResponse(certificate, 201);
  } catch (error) {
    // Handle certificate-specific errors with user-friendly messages
    if (error instanceof CertificateEligibilityError) {
      return errorResponse(error.message, 400);
    }
    if (error instanceof StudentNameValidationError) {
      return errorResponse(error.message, 400);
    }
    return handleApiError(error);
  }
}

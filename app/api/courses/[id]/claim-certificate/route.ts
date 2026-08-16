import { NextRequest } from "next/server";
import { requireUserFresh } from "../../../../lib/authorization";
import { issueCertificate } from "../../../../lib/certificate";
import { prisma } from "../../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import {
  CertificateEligibilityError,
  StudentNameValidationError,
} from "../../../../lib/certificate";
import { HttpError } from "../../../../lib/httpError";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/courses/[id]/claim-certificate
 * Student claims their certificate after completing the course.
 * All eligibility rules are enforced server-side inside issueCertificate().
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: courseId } = await params;
    const user = await requireUserFresh();

    // Resolve courseId — accept slug or id
    const course = await prisma.course.findFirst({
      where: { OR: [{ id: courseId }, { slug: courseId }] },
      select: { id: true },
    });
    if (!course) return errorResponse("Course not found", 404);

    const certificate = await issueCertificate(user.id, course.id);

    return successResponse({
      id: certificate.id,
      certificateId: certificate.certificateId,
    });
  } catch (error) {
    if (error instanceof CertificateEligibilityError) {
      return errorResponse(error.message, 422);
    }
    if (error instanceof StudentNameValidationError) {
      return errorResponse(error.message, 422);
    }
    if (error instanceof HttpError) {
      return errorResponse(error.message, error.statusCode);
    }
    return handleApiError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prism";

/**
 * GET /api/certificates/verify/[certId]
 *
 * Public endpoint — no auth required.
 * Returns verification status for a public certificate ID (ILM-CERT-XXXXXXXX).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ certId: string }> },
) {
  const { certId } = await params;

  if (!certId || !/^ILM-CERT-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(certId)) {
    return NextResponse.json({ valid: false, error: "Invalid certificate ID format" }, { status: 400 });
  }

  const cert = await prisma.certificate.findUnique({
    where: { certificateId: certId },
    select: {
      id:              true,
      certificateId:   true,
      studentName:     true,
      title:           true,
      instructorName:  true,
      completionDate:  true,
      issuedAt:        true,
      isRevoked:       true,
      revokedAt:       true,
      revocationReason: true,
      course: {
        select: {
          id:    true,
          title: true,
          slug:  true,
          author: { select: { name: true } },
        },
      },
    },
  });

  if (!cert) {
    return NextResponse.json({ valid: false, error: "Certificate not found" }, { status: 404 });
  }

  if (cert.isRevoked) {
    return NextResponse.json({
      valid:    false,
      revoked:  true,
      revokedAt: cert.revokedAt,
      reason:   cert.revocationReason ?? "This certificate has been revoked.",
      certificateId: cert.certificateId,
    });
  }

  return NextResponse.json({
    valid:          true,
    certificateId:  cert.certificateId,
    studentName:    cert.studentName,
    courseTitle:    cert.title,
    instructor:     cert.instructorName,
    completionDate: cert.completionDate,
    issuedAt:       cert.issuedAt,
    courseSlug:     cert.course?.slug ?? null,
  });
}

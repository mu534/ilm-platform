/**
 * /api/courses/[id]/certificate
 *
 * PATCH — Instructor/Scholar: request certificate for their course
 *          Admin: approve, reject, enable, disable certificate
 *
 * Security:
 *   - Instructor can ONLY submit a request (certificateApprovalStatus → PENDING)
 *   - Admin controls all other state transitions
 *   - certificateEnabled is only ever set true by an admin
 *   - No client-supplied value can bypass this
 */

import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["request", "approve", "reject", "enable", "disable"]),
  note:   z.string().max(500).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id } = await params;

    const course = await prisma.course.findUnique({
      where:  { id },
      select: {
        id: true, authorId: true,
        certificateEnabled: true,
        certificateApprovalStatus: true,
        certificateRequestedAt: true,
        certificateReviewedAt: true,
        certificateReviewNote: true,
      },
    });
    if (!course) return errorResponse("Course not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    return successResponse(course);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id } = await params;

    const course = await prisma.course.findUnique({
      where:  { id },
      select: {
        id: true, authorId: true, title: true,
        certificateEnabled: true,
        certificateApprovalStatus: true,
      },
    });
    if (!course) return errorResponse("Course not found", 404);

    const body = (await req.json()) as unknown;
    const { action, note } = schema.parse(body);

    const isAdmin = user.role === "ADMIN";
    const isOwner = course.authorId === user.id;

    // ── Instructor: request certificate ─────────────────────────────────────
    if (action === "request") {
      if (!isOwner && !isAdmin) return errorResponse("Forbidden", 403);

      if (!["DRAFT", "REJECTED"].includes(course.certificateApprovalStatus)) {
        return errorResponse(
          "A certificate request can only be submitted when the current status is Draft or Rejected",
          409,
        );
      }

      await prisma.course.update({
        where: { id },
        data: {
          certificateApprovalStatus: "PENDING",
          certificateRequestedAt:    new Date(),
          certificateEnabled:        false, // never auto-enable — admin must approve
        },
      });

      // Notify all admins
      const admins = await prisma.user.findMany({
        where:  { role: "ADMIN" },
        select: { id: true },
      });
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId:  a.id,
          type:    "ANNOUNCEMENT" as const,
          title:   "Certificate Request",
          message: `"${course.title}" has requested certificate approval.`,
          link:    `/admin/courses/${id}/review`,
        })),
        skipDuplicates: true,
      });

      return successResponse({ message: "Certificate request submitted for admin review" });
    }

    // ── Admin-only actions below ────────────────────────────────────────────
    if (!isAdmin) return errorResponse("Only admins can perform this action", 403);

    if (action === "approve") {
      if (course.certificateApprovalStatus !== "PENDING") {
        return errorResponse("Only pending certificate requests can be approved", 409);
      }

      await prisma.course.update({
        where: { id },
        data: {
          certificateApprovalStatus: "APPROVED",
          certificateEnabled:        true,
          certificateReviewedAt:     new Date(),
          certificateReviewNote:     note ?? null,
        },
      });

      await prisma.notification.create({
        data: {
          userId:  course.authorId,
          type:    "ANNOUNCEMENT" as const,
          title:   "Certificate Approved ✅",
          message: `Certificates for "${course.title}" have been approved. Students who complete the course will receive certificates.`,
          link:    `/admin/courses/${id}/review`,
        },
      });

      return successResponse({ message: "Certificate approved. Students who complete this course will receive certificates." });
    }

    if (action === "reject") {
      await prisma.course.update({
        where: { id },
        data: {
          certificateApprovalStatus: "REJECTED",
          certificateEnabled:        false,
          certificateReviewedAt:     new Date(),
          certificateReviewNote:     note ?? null,
        },
      });

      await prisma.notification.create({
        data: {
          userId:  course.authorId,
          type:    "ANNOUNCEMENT" as const,
          title:   "Certificate Request Rejected",
          message: `The certificate request for "${course.title}" was not approved.${note ? ` Reason: ${note}` : ""}`,
          link:    `/admin/courses/${id}/review`,
        },
      });

      return successResponse({ message: "Certificate request rejected" });
    }

    if (action === "enable") {
      // Admin can enable directly (e.g. for already-approved courses)
      await prisma.course.update({
        where: { id },
        data: {
          certificateEnabled:        true,
          certificateApprovalStatus: "APPROVED",
          certificateReviewedAt:     new Date(),
          certificateReviewNote:     note ?? null,
        },
      });
      return successResponse({ message: "Certificates enabled for this course" });
    }

    if (action === "disable") {
      await prisma.course.update({
        where: { id },
        data: {
          certificateEnabled:        false,
          certificateApprovalStatus: "DRAFT",
          certificateReviewedAt:     new Date(),
          certificateReviewNote:     note ?? null,
        },
      });
      return successResponse({ message: "Certificates disabled for this course" });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    return handleApiError(error);
  }
}

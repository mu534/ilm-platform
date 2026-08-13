/**
 * /api/courses/[id]/certificate
 *
 * PATCH — Instructor/Scholar: request certificate for their course
 *          Admin: approve, reject, enable, disable certificate
 *
 * Security & Integrity Rules:
 *   - Instructor can ONLY submit a request (certificateApprovalStatus → PENDING_REVIEW)
 *   - Admin controls all state transitions (NOT_REQUESTED, PENDING_REVIEW, APPROVED, REJECTED, DISABLED)
 *   - Contradictory states (e.g. enabling a REJECTED request directly) are rejected server-side
 *   - certificateEnabled is only ever set to true when status is APPROVED
 */

import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["request", "approve", "reject", "enable", "disable"]),
  note: z.string().max(500).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
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
      where: { id },
      select: {
        id: true,
        authorId: true,
        title: true,
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

      const status = course.certificateApprovalStatus as string;
      if (status !== "NOT_REQUESTED" && status !== "REJECTED" && status !== "DRAFT") {
        return errorResponse(
          "A certificate request can only be submitted when current status is Not Requested or Rejected",
          409
        );
      }

      await prisma.course.update({
        where: { id },
        data: {
          certificateApprovalStatus: "PENDING_REVIEW",
          certificateRequestedAt: new Date(),
          certificateEnabled: false,
        },
      });

      // Notify admins
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "ANNOUNCEMENT" as const,
          title: "Certificate Request",
          message: `"${course.title}" has requested certificate approval.`,
          link: `/admin/courses/${id}/review`,
        })),
        skipDuplicates: true,
      });

      return successResponse({ message: "Certificate request submitted for admin review" });
    }

    // ── Admin-only actions ──────────────────────────────────────────────────
    if (!isAdmin) return errorResponse("Only admins can perform this action", 403);

    const currentStatus = course.certificateApprovalStatus as string;

    if (action === "approve") {
      if (currentStatus !== "PENDING_REVIEW" && currentStatus !== "PENDING" && currentStatus !== "NOT_REQUESTED" && currentStatus !== "DRAFT") {
        return errorResponse("This course certificate request cannot be approved in its current state", 409);
      }

      await prisma.course.update({
        where: { id },
        data: {
          certificateApprovalStatus: "APPROVED",
          certificateEnabled: true,
          certificateReviewedAt: new Date(),
          certificateReviewNote: note ?? null,
        },
      });

      await prisma.notification.create({
        data: {
          userId: course.authorId,
          type: "ANNOUNCEMENT" as const,
          title: "Certificate Approved ✅",
          message: `Certificates for "${course.title}" have been approved. Students who complete required content will receive certificates.`,
          link: `/admin/courses/${id}/review`,
        },
      });

      return successResponse({
        message: "Certificate approved. Students who complete this course will receive certificates.",
      });
    }

    if (action === "reject") {
      await prisma.course.update({
        where: { id },
        data: {
          certificateApprovalStatus: "REJECTED",
          certificateEnabled: false,
          certificateReviewedAt: new Date(),
          certificateReviewNote: note ?? null,
        },
      });

      await prisma.notification.create({
        data: {
          userId: course.authorId,
          type: "ANNOUNCEMENT" as const,
          title: "Certificate Request Rejected",
          message: `The certificate request for "${course.title}" was not approved.${
            note ? ` Reason: ${note}` : ""
          }`,
          link: `/admin/courses/${id}/review`,
        },
      });

      return successResponse({ message: "Certificate request rejected" });
    }

    if (action === "enable") {
      if (currentStatus === "REJECTED") {
        return errorResponse(
          "Cannot enable a rejected certificate request directly. Approve the certificate request instead.",
          400
        );
      }

      await prisma.course.update({
        where: { id },
        data: {
          certificateApprovalStatus: "APPROVED",
          certificateEnabled: true,
          certificateReviewedAt: new Date(),
          certificateReviewNote: note ?? null,
        },
      });
      return successResponse({ message: "Certificates enabled for this course" });
    }

    if (action === "disable") {
      await prisma.course.update({
        where: { id },
        data: {
          certificateApprovalStatus: "DISABLED",
          certificateEnabled: false,
          certificateReviewedAt: new Date(),
          certificateReviewNote: note ?? null,
        },
      });
      return successResponse({ message: "Certificates disabled for this course" });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    return handleApiError(error);
  }
}

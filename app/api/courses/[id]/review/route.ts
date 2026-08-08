import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireAdmin, requireUserFresh } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import { checkCoursePublishable } from "../../../../lib/courseValidation";
import { z } from "zod";

const reviewSchema = z.object({
  action: z.enum(["submit", "approve", "reject"]),
  note:   z.string().max(1000).optional(),
});

/**
 * PATCH /api/courses/[id]/review
 *
 * Scholar: action=submit  → DRAFT → PENDING_REVIEW
 * Admin:   action=approve → any   → PUBLISHED
 * Admin:   action=reject  → any   → REJECTED  (note required)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return errorResponse("Course not found", 404);

    const body = (await req.json()) as unknown;
    const { action, note } = reviewSchema.parse(body);

    if (action === "submit") {
      const user = await requireUserFresh();
      const isAdmin = user.role === "ADMIN";
      const isOwner = course.authorId === user.id;
      if (!isOwner && !isAdmin) return errorResponse("Forbidden", 403);

      const submittableStates = ["DRAFT", "REJECTED"];
      if (!submittableStates.includes(course.approvalStatus)) {
        return errorResponse(
          "Only draft or rejected courses can be submitted for review",
          400,
        );
      }
      await prisma.course.update({
        where: { id },
        data: { approvalStatus: "PENDING", status: "PENDING_REVIEW" },
      });

      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId:  admin.id,
          type:    "ANNOUNCEMENT" as const,
          title:   "Course Submitted for Review",
          message: `"${course.title}" has been submitted for review.`,
          link:    `/admin/courses`,
        })),
        skipDuplicates: true,
      });

      return successResponse({ message: "Course submitted for review" });
    }

    if (action === "approve") {
      await requireAdmin();

      const check = await checkCoursePublishable(id);
      if (!check.valid) {
        return errorResponse(
          `Course cannot be published: ${check.errors.join("; ")}`,
          422,
        );
      }

      await prisma.course.update({
        where: { id },
        data: {
          approvalStatus: "APPROVED",
          status:         "PUBLISHED",
          published:      true,
          reviewedAt:     new Date(),
          approvalNote:   note ?? null,
        },
      });
      await prisma.notification.create({
        data: {
          userId:  course.authorId,
          type:    "COURSE_APPROVED",
          title:   "Course Approved! ✅",
          message: `Your course "${course.title}" has been approved and is now live.`,
          link:    `/courses/${course.slug}`,
        },
      });
      return successResponse({ message: "Course approved and published" });
    }

    if (action === "reject") {
      await requireAdmin();
      if (!note) return errorResponse("A rejection note is required", 400);
      await prisma.course.update({
        where: { id },
        data: {
          approvalStatus: "REJECTED",
          status:         "REJECTED",
          published:      false,
          reviewedAt:     new Date(),
          approvalNote:   note,
        },
      });
      await prisma.notification.create({
        data: {
          userId:  course.authorId,
          type:    "COURSE_REJECTED",
          title:   "Course Needs Revision",
          message: `Your course "${course.title}" was not approved. Feedback: ${note}`,
          link:    `/admin/courses`,
        },
      });
      return successResponse({ message: "Course rejected" });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    return handleApiError(error);
  }
}

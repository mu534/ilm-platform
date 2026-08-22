import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireAdmin, requireUserFresh } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import { checkCoursePublishable } from "../../../../lib/courseValidation";
import { z } from "zod";

const reviewSchema = z.object({ action: z.enum(["submit", "approve", "reject", "request_changes"]), note: z.string().trim().max(1000).optional(), internalNotes: z.string().trim().max(3000).optional() }).superRefine((data, ctx) => { if (["reject", "request_changes"].includes(data.action) && !data.note) ctx.addIssue({ code: "custom", path: ["note"], message: "An applicant-visible note is required" }); });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return errorResponse("Course not found", 404);
    const { action, note, internalNotes } = reviewSchema.parse(await req.json());
    if (action === "submit") {
      const user = await requireUserFresh();
      if (user.role !== "ADMIN" && course.authorId !== user.id) return errorResponse("Forbidden", 403);
      if (!["DRAFT", "REJECTED"].includes(course.approvalStatus)) return errorResponse("Only draft or rejected courses can be submitted for review", 409);
      await prisma.$transaction(async (tx) => { await tx.course.update({ where: { id }, data: { approvalStatus: "PENDING", status: "PENDING_REVIEW", published: false } }); await tx.auditLog.create({ data: { userId: user.id, action: "COURSE_SUBMITTED", entityType: "Course", entityId: id } }); });
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      await prisma.notification.createMany({ data: admins.map((admin) => ({ userId: admin.id, type: "ANNOUNCEMENT", title: "Course Submitted for Review", message: `"${course.title}" has been submitted for review.`, link: "/admin/courses" })), skipDuplicates: true });
      await prisma.notification.create({ data: { userId: user.id, type: "ANNOUNCEMENT", title: "Course submitted", message: `Your course "${course.title}" is now under review.`, link: "/admin/courses" } });
      return successResponse({ message: "Course submitted for review" });
    }
    const admin = await requireAdmin();
    if (course.approvalStatus === "APPROVED") return errorResponse("This course is already approved", 409);
    if (!["PENDING", "DRAFT", "REJECTED"].includes(course.approvalStatus)) return errorResponse("Only courses under review can be reviewed", 409);
    if (action === "approve") {
      const check = await checkCoursePublishable(id); if (!check.valid) return errorResponse(`Course cannot be published: ${check.errors.join("; ")}`, 422);
      await prisma.$transaction(async (tx) => { await tx.course.update({ where: { id }, data: { approvalStatus: "APPROVED", status: "PUBLISHED", published: true, reviewedAt: new Date(), approvalNote: note || null } }); await tx.courseReview.create({ data: { courseId: id, reviewerId: admin.id, status: "APPROVED", applicantNote: note || null, internalNotes: internalNotes || null } }); await tx.auditLog.createMany({ data: [{ userId: admin.id, action: "COURSE_REVIEWED", entityType: "Course", entityId: id }, { userId: admin.id, action: "COURSE_APPROVED", entityType: "Course", entityId: id }, { userId: admin.id, action: "COURSE_PUBLISHED", entityType: "Course", entityId: id }] }); });
      await prisma.notification.create({ data: { userId: course.authorId, type: "COURSE_APPROVED", title: "Course Approved", message: `Your course "${course.title}" has been approved and is now live.`, link: `/courses/${course.slug}` } });
      return successResponse({ message: "Course approved and published" });
    }
    await prisma.$transaction(async (tx) => { await tx.course.update({ where: { id }, data: { approvalStatus: "REJECTED", status: "REJECTED", published: false, reviewedAt: new Date(), approvalNote: note } }); await tx.courseReview.create({ data: { courseId: id, reviewerId: admin.id, status: "REJECTED", applicantNote: note || null, internalNotes: internalNotes || null } }); await tx.auditLog.createMany({ data: [{ userId: admin.id, action: "COURSE_REVIEWED", entityType: "Course", entityId: id }, { userId: admin.id, action: "COURSE_REJECTED", entityType: "Course", entityId: id }] }); });
    await prisma.notification.create({ data: { userId: course.authorId, type: "COURSE_REJECTED", title: action === "request_changes" ? "Changes requested" : "Course needs revision", message: `Feedback for "${course.title}": ${note}`, link: "/admin/courses" } });
    return successResponse({ message: action === "request_changes" ? "Changes requested" : "Course rejected" });
  } catch (error) { return handleApiError(error); }
}

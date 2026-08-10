import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { requireEnrollment } from "../../../../lib/courseAccess";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import { notify } from "../../../../lib/notifications";
import { z } from "zod";

const createSchema = z.object({
  title:     z.string().min(1).max(200),
  body:      z.string().min(1).max(10_000),
  published: z.boolean().optional().default(true),
});

/**
 * GET /api/courses/[id]/announcements
 *
 * - Scholar (owner) or Admin: all announcements (published + unpublished)
 * - Enrolled student: published announcements only
 * - Unauthenticated or non-enrolled: 403
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: courseId } = await params;

    const course = await prisma.course.findUnique({
      where:  { id: courseId },
      select: { id: true, authorId: true },
    });
    if (!course) return errorResponse("Course not found", 404);

    const freshUser = await requireUserFresh();
    const isAdmin   = freshUser.role === "ADMIN";
    const isOwner   = course.authorId === freshUser.id;
    const isStaff   = isAdmin || isOwner;

    if (!isStaff) {
      // Students must be enrolled
      await requireEnrollment(freshUser.id, courseId);
    }

    const announcements = await prisma.courseAnnouncement.findMany({
      where: {
        courseId,
        ...(isStaff ? {} : { published: true }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return successResponse(announcements);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/courses/[id]/announcements
 *
 * - Scholar (owner) or Admin only
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: courseId } = await params;

    if (user.role !== "ADMIN" && user.role !== "INSTRUCTOR") {
      return errorResponse("Forbidden", 403);
    }

    const course = await prisma.course.findUnique({
      where:  { id: courseId },
      select: { id: true, authorId: true, title: true },
    });
    if (!course) return errorResponse("Course not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = course.authorId === user.id;
    if (!isAdmin && !isOwner) {
      return errorResponse("You do not have permission to manage announcements for this course", 403);
    }

    const body = (await req.json()) as unknown;
    const data = createSchema.parse(body);

    const announcement = await prisma.courseAnnouncement.create({
      data: {
        courseId,
        authorId:  user.id,
        title:     data.title,
        body:      data.body,
        published: data.published,
      },
      include: { author: { select: { id: true, name: true, image: true } } },
    });

    // Notify enrolled students if announcement is published
    if (data.published) {
      const enrollments = await prisma.enrollment.findMany({
        where:  { courseId, status: { in: ["ACTIVE", "COMPLETED"] } },
        select: { userId: true },
      });

      for (const enrollment of enrollments) {
        if (enrollment.userId === user.id) continue; // don't notify the author
        await notify({
          userId:  enrollment.userId,
          type:    "COURSE_ANNOUNCEMENT",
          title:   `New announcement in "${course.title}"`,
          message: data.title,
          link:    `/courses/${courseId}/announcements`,
        }).catch(() => {/* non-critical */});
      }
    }

    return successResponse(announcement, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

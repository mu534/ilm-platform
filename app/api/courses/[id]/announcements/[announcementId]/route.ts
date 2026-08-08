import { NextRequest } from "next/server";
import { prisma } from "../../../../../lib/prism";
import { requireUserFresh } from "../../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../../utils/api";
import { z } from "zod";

const updateSchema = z.object({
  title:     z.string().min(1).max(200).optional(),
  body:      z.string().min(1).max(10_000).optional(),
  published: z.boolean().optional(),
});

async function resolveAnnouncement(announcementId: string, courseId: string) {
  return prisma.courseAnnouncement.findFirst({
    where: { id: announcementId, courseId },
    include: {
      course: { select: { authorId: true, title: true } },
    },
  });
}

/**
 * PATCH /api/courses/[id]/announcements/[announcementId]
 * Scholar (owner) or Admin can edit.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: courseId, announcementId } = await params;

    const announcement = await resolveAnnouncement(announcementId, courseId);
    if (!announcement) return errorResponse("Announcement not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = announcement.course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const data = updateSchema.parse(body);

    const updated = await prisma.courseAnnouncement.update({
      where: { id: announcementId },
      data,
      include: { author: { select: { id: true, name: true, image: true } } },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/courses/[id]/announcements/[announcementId]
 * Scholar (owner) or Admin can delete.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: courseId, announcementId } = await params;

    const announcement = await resolveAnnouncement(announcementId, courseId);
    if (!announcement) return errorResponse("Announcement not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = announcement.course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    await prisma.courseAnnouncement.delete({ where: { id: announcementId } });
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { lectureSchema } from "../../../lib/validations";
import { requireUserFresh } from "../../../lib/authorization";
import {
  isPublicCourse,
  requireLectureLearningAccess,
} from "../../../lib/courseAccess";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "../../../utils/api";
import { getOptionalUser } from "../../../lib/authorization";

const lecturePublicSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  type: true,
  thumbnailUrl: true,
  tags: true,
  published: true,
  featured: true,
  views: true,
  approvalStatus: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, image: true } },
  scholar: {
    select: {
      id: true,
      bio: true,
      photo: true,
      topics: true,
      qualifications: true,
      user: { select: { name: true, image: true } },
    },
  },
  module: {
    select: {
      id: true,
      courseId: true,
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          authorId: true,
          published: true,
          status: true,
          approvalStatus: true,
        },
      },
    },
  },
  _count: { select: { comments: true } },
} as const;

const lectureFullSelect = {
  ...lecturePublicSelect,
  content: true,
  mediaUrl: true,
} as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const isEditFetch = new URL(req.url).searchParams.get("edit") === "1";

    const lecture = await prisma.lecture.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: lectureFullSelect,
    });
    if (!lecture) return errorResponse("Lecture not found", 404);

    const user = await getOptionalUser();
    const course = lecture.module?.course ?? null;

    // Edit fetch: only owner/admin
    if (isEditFetch) {
      if (!user) return errorResponse("Unauthorized", 401);
      const fresh = await requireUserFresh();
      const isStaff =
        fresh.role === "ADMIN" || lecture.author.id === fresh.id;
      if (!isStaff) return errorResponse("Forbidden", 403);
      return successResponse(lecture);
    }

    // Course-linked lectures: protected content requires enrollment/staff.
    // Metadata-only response for public course catalog browsing without enrollment.
    if (course) {
      const staff =
        user &&
        (user.role === "ADMIN" || course.authorId === user.id);

      if (staff) {
        // fresh role for staff content access
        const fresh = await requireUserFresh();
        if (fresh.role !== "ADMIN" && course.authorId !== fresh.id) {
          return errorResponse("Forbidden", 403);
        }
      } else if (user) {
        try {
          await requireLectureLearningAccess({
            userId: user.id,
            role: user.role,
            lectureId: lecture.id,
            enforceSequential: true,
          });
        } catch {
          // Not enrolled — only return public metadata if course and lecture are public+approved
          if (!isPublicCourse(course) || !lecture.published || lecture.approvalStatus !== "APPROVED") {
            return errorResponse("Lecture not found", 404);
          }
          const { content, mediaUrl, ...meta } = lecture;
          return successResponse({ ...meta, content: null, mediaUrl: null });
        }
      } else {
        if (!isPublicCourse(course) || !lecture.published) {
          return errorResponse("Lecture not found", 404);
        }
        // Lecture must also be approved for unauthenticated public access
        if (lecture.approvalStatus !== "APPROVED") {
          return errorResponse("Lecture not found", 404);
        }
        const { content, mediaUrl, ...meta } = lecture;
        return successResponse({ ...meta, content: null, mediaUrl: null });
      }
    } else {
      // Standalone lecture (not attached to a course module)
      const isOwner = user && lecture.author.id === user.id;
      const isAdmin = user?.role === "ADMIN";
      if (!lecture.published && !isOwner && !isAdmin) {
        return errorResponse("Lecture not found", 404);
      }
      // Lecture must also be approved for non-staff public access
      if (!isOwner && !isAdmin && lecture.approvalStatus !== "APPROVED") {
        return errorResponse("Lecture not found", 404);
      }
    }

    if (!isEditFetch) {
      await prisma.lecture.update({
        where: { id: lecture.id },
        data: { views: { increment: 1 } },
      });
    }

    return successResponse(lecture);
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

    const lecture = await prisma.lecture.findUnique({ where: { id } });
    if (!lecture) return errorResponse("Lecture not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = lecture.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const data = lectureSchema.partial().parse(body);

    // Featured is admin-only
    if (!isAdmin) {
      delete (data as Record<string, unknown>).featured;
    }

    const updated = await prisma.lecture.update({
      where: { id },
      data,
      select: lectureFullSelect,
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id } = await params;

    const lecture = await prisma.lecture.findUnique({ where: { id } });
    if (!lecture) return errorResponse("Lecture not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = lecture.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    await prisma.lecture.delete({ where: { id } });
    return successResponse({ message: "Lecture deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

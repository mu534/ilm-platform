import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireUserFresh } from "../../lib/authorization";
import { isPublicCourse, requireLectureLearningAccess } from "../../lib/courseAccess";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import { z } from "zod";

const bookmarkSchema = z.object({
  lectureId: z.string().optional(),
  courseId:  z.string().optional(),
}).refine((d) => d.lectureId ?? d.courseId, {
  message: "Either lectureId or courseId is required",
});

// GET /api/bookmarks — get user's bookmarks
export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFresh();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "all"; // "lectures" | "courses" | "all"

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: user.id,
        ...(type === "lectures" ? { lectureId: { not: null } } : {}),
        ...(type === "courses"  ? { courseId:  { not: null } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        lecture: {
          select: {
            id: true, title: true, slug: true,
            type: true, thumbnailUrl: true, views: true,
            author: { select: { name: true } },
          },
        },
        course: {
          select: {
            id: true, title: true, slug: true,
            thumbnailUrl: true, difficulty: true,
            _count: { select: { modules: true, enrollments: true } },
          },
        },
      },
    });

    return successResponse(bookmarks);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/bookmarks — toggle bookmark
export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFresh();

    const body = (await req.json()) as unknown;
    const { lectureId, courseId } = bookmarkSchema.parse(body);

    if (lectureId) {
      await requireLectureLearningAccess({
        userId: user.id,
        role: user.role,
        lectureId,
      });
    }

    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          id: true, authorId: true,
          published: true, status: true, approvalStatus: true,
        },
      });
      if (!course) return errorResponse("Course not found", 404);

      const isStaff = user.role === "ADMIN" || course.authorId === user.id;
      if (!isStaff && !isPublicCourse(course)) {
        return errorResponse("Course not found", 404);
      }
    }

    const existing = await prisma.bookmark.findFirst({
      where: {
        userId: user.id,
        ...(lectureId ? { lectureId } : {}),
        ...(courseId  ? { courseId  } : {}),
      },
    });

    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      return successResponse({ bookmarked: false });
    }

    const bookmark = await prisma.bookmark.create({
      data: { userId: user.id, lectureId, courseId },
    });

    return successResponse({ bookmarked: true, bookmark }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

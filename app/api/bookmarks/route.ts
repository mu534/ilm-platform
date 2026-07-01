import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";
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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const body = (await req.json()) as unknown;
    const { lectureId, courseId } = bookmarkSchema.parse(body);

    // Check for existing bookmark
    const existing = await prisma.bookmark.findFirst({
      where: {
        userId: user.id,
        ...(lectureId ? { lectureId } : {}),
        ...(courseId  ? { courseId  } : {}),
      },
    });

    if (existing) {
      // Toggle off — remove bookmark
      await prisma.bookmark.delete({ where: { id: existing.id } });
      return successResponse({ bookmarked: false });
    }

    // Toggle on — add bookmark
    const bookmark = await prisma.bookmark.create({
      data: { userId: user.id, lectureId, courseId },
    });

    return successResponse({ bookmarked: true, bookmark }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

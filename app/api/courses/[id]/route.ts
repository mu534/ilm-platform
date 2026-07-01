import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { courseSchema } from "../../../lib/validations";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import type { SessionUser } from "../../../types/auth.types";

// Full course detail select
const courseDetailSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  thumbnailUrl: true,
  bannerUrl: true,
  objectives: true,
  prerequisites: true,
  difficulty: true,
  estimatedDuration: true,
  status: true,
  published: true,
  featured: true,
  approvalStatus: true,
  approvalNote: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
  author: { select: { id: true, name: true, image: true } },
  scholar: {
    select: {
      id: true,
      bio: true,
      photo: true,
      topics: true,
      qualifications: true,
      verified: true,
      user: { select: { name: true, image: true } },
    },
  },
  modules: {
    orderBy: { order: "asc" as const },
    select: {
      id: true,
      title: true,
      description: true,
      order: true,
      lectures: {
        orderBy: { order: "asc" as const },
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          duration: true,
          published: true,
          thumbnailUrl: true,
          views: true,
          _count: { select: { comments: true } },
        },
      },
      _count: { select: { lectures: true, quizzes: true } },
    },
  },
  _count: {
    select: { modules: true, enrollments: true, ratings: true },
  },
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: courseDetailSelect,
    });

    if (!course) return errorResponse("Course not found", 404);

    // Attach average rating
    const ratingAgg = await prisma.courseRating.aggregate({
      where: { courseId: course.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return successResponse({
      ...course,
      avgRating: ratingAgg._avg.rating ?? 0,
      totalRatings: ratingAgg._count.rating,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return errorResponse("Course not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const data = courseSchema.partial().parse(body);

    // Admin-only: handle approval fields
    const adminFields: Record<string, unknown> = {};
    if (isAdmin) {
      const raw = body as Record<string, unknown>;
      if (raw.approvalStatus !== undefined) adminFields.approvalStatus = raw.approvalStatus;
      if (raw.approvalNote !== undefined)   adminFields.approvalNote   = raw.approvalNote;
      if (raw.status !== undefined)         adminFields.status         = raw.status;
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { ...data, ...adminFields },
      select: courseDetailSelect,
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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return errorResponse("Course not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    await prisma.course.delete({ where: { id } });
    return successResponse({ message: "Course deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

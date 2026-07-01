import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/auth.types";

// POST /api/courses/[id]/enroll — enroll current user
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id: courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId, published: true },
    });
    if (!course) return errorResponse("Course not found or not published", 404);

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (existing) return errorResponse("Already enrolled in this course", 409);

    const enrollment = await prisma.enrollment.create({
      data: { userId: user.id, courseId },
      include: {
        course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
      },
    });

    return successResponse(enrollment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/courses/[id]/enroll — unenroll
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id: courseId } = await params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (!enrollment) return errorResponse("Not enrolled in this course", 404);

    await prisma.enrollment.delete({
      where: { userId_courseId: { userId: user.id, courseId } },
    });

    return successResponse({ message: "Unenrolled successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

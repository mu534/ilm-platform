import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/auth.types";

// POST /api/courses/[id]/enroll
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Sign in required to enroll in this course", 401);

    const { id: courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId, published: true },
      include: {
        modules: {
          select: {
            lectures: { where: { published: true }, select: { id: true } },
          },
        },
      },
    });
    if (!course) return errorResponse("Course not found or not published", 404);

    // Prevent duplicate enrollment
    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (existing) return errorResponse("You are already enrolled in this course", 409);

    // Create enrollment + initialise progress records in one transaction
    const allLectureIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));

    const [enrollment] = await prisma.$transaction([
      // 1. Create enrollment
      prisma.enrollment.create({
        data: { userId: user.id, courseId },
        include: {
          course: {
            select: { id: true, title: true, slug: true, thumbnailUrl: true },
          },
        },
      }),
      // 2. Pre-create LectureProgress rows so progress % is always accurate
      prisma.lectureProgress.createMany({
        data: allLectureIds.map((lectureId) => ({
          userId:    user.id,
          lectureId,
          completed: false,
        })),
        skipDuplicates: true,
      }),
    ]);

    return successResponse(enrollment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/courses/[id]/enroll — student unenrolls themselves
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

// GET /api/courses/[id]/enroll — check if current user is enrolled
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return successResponse({ enrolled: false });

    const { id: courseId } = await params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { id: true, status: true, progress: true, enrolledAt: true, completedAt: true },
    });

    return successResponse({ enrolled: !!enrollment, enrollment });
  } catch (error) {
    return handleApiError(error);
  }
}

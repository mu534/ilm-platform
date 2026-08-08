import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { createEnrollment, AlreadyEnrolledError } from "../../../../lib/enrollment";
import { isPublicCourse } from "../../../../lib/courseAccess";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";

// POST /api/courses/[id]/enroll
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: courseId } = await params;

    const course = await prisma.course.findUnique({
      where:  { id: courseId },
      select: {
        id: true, enrollmentType: true, price: true,
        published: true, status: true, approvalStatus: true,
      },
    });
    if (!course || !isPublicCourse(course)) {
      return errorResponse("Course not found or not published", 404);
    }

    // Paid courses go through /checkout instead — this endpoint only
    // grants access directly for free courses.
    if (course.enrollmentType === "PAID" && course.price > 0) {
      return errorResponse("This is a paid course — use the checkout flow to enroll", 402);
    }

    try {
      const enrollment = await createEnrollment(user.id, courseId);
      return successResponse(enrollment, 201);
    } catch (err) {
      if (err instanceof AlreadyEnrolledError) {
        return errorResponse("You are already enrolled in this course", 409);
      }
      throw err;
    }
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
    const user = await requireUserFresh();
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
    const { id: courseId } = await params;

    let userId: string | null = null;
    try {
      const user = await requireUserFresh();
      userId = user.id;
    } catch {
      return successResponse({ enrolled: false });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, status: true, progress: true, enrolledAt: true, completedAt: true },
    });

    return successResponse({ enrolled: !!enrollment, enrollment });
  } catch (error) {
    return handleApiError(error);
  }
}

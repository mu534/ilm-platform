import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import type { SessionUser } from "../../../types/auth.types";

// DELETE /api/enrollments/[id] — admin removes an enrollment
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (user?.role !== "ADMIN") return errorResponse("Forbidden", 403);

    const { id } = await params;
    const enrollment = await prisma.enrollment.findUnique({ where: { id } });
    if (!enrollment) return errorResponse("Enrollment not found", 404);

    await prisma.enrollment.delete({ where: { id } });
    return successResponse({ message: "Enrollment removed" });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/enrollments/[id] — admin updates enrollment status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (user?.role !== "ADMIN") return errorResponse("Forbidden", 403);

    const { id } = await params;
    const body = (await req.json()) as { status?: "ACTIVE" | "COMPLETED" | "DROPPED" };

    const enrollment = await prisma.enrollment.update({
      where: { id },
      data: { status: body.status },
      include: {
        user:   { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });

    return successResponse(enrollment);
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireAdmin } from "../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import { z } from "zod";

const enrollmentStatusSchema = z.object({
  status: z.enum(["ACTIVE", "COMPLETED", "DROPPED"]),
});

// DELETE /api/enrollments/[id] — admin removes an enrollment
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

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
    await requireAdmin();

    const { id } = await params;
    const body = (await req.json()) as unknown;
    const { status } = enrollmentStatusSchema.parse(body);

    const enrollment = await prisma.enrollment.update({
      where: { id },
      data: { status },
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

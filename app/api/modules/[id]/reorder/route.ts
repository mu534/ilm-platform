import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import { z } from "zod";

const schema = z.object({
  order: z.array(z.string()).min(1), // lecture IDs in new order
});

// PATCH /api/modules/[id]/reorder — bulk-update lecture order
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: moduleId } = await params;

    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: { select: { authorId: true } } },
    });
    if (!courseModule) return errorResponse("Module not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = courseModule.course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const { order } = schema.parse(body);

    // Bulk update all lecture orders in one transaction
    await prisma.$transaction(
      order.map((lectureId, idx) =>
        prisma.lecture.update({
          where: { id: lectureId },
          data: { order: idx },
        }),
      ),
    );

    return successResponse({ message: "Reordered successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/auth.types";
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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id: moduleId } = await params;

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: { select: { authorId: true } } },
    });
    if (!module) return errorResponse("Module not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = module.course.authorId === user.id;
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

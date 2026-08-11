import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireAdminOrInstructor } from "../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import { z } from "zod";

const bulkSchema = z.object({
  ids:    z.array(z.string().min(1)).min(1, "Select at least one course").max(100),
  action: z.enum(["publish", "unpublish", "feature", "unfeature", "delete"]),
});

/**
 * POST /api/courses/bulk
 *
 * Same business rules as single-course endpoints:
 * - Admins can publish / feature / delete any course
 * - Scholars can only act on courses they authored
 * - Scholars cannot publish unless the course is already APPROVED
 * - Feature / unfeature is admin-only
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdminOrInstructor();
    const { ids, action } = bulkSchema.parse(await req.json());
    const isAdmin = user.role === "ADMIN";

    if (!isAdmin && (action === "feature" || action === "unfeature")) {
      return errorResponse("Only admins can feature or unfeature courses", 403);
    }

    const courses = await prisma.course.findMany({
      where:  { id: { in: ids } },
      select: { id: true, authorId: true, approvalStatus: true },
    });

    const owned = courses.filter((c) => isAdmin || c.authorId === user.id);
    if (owned.length === 0) {
      return errorResponse("You don't have permission to modify any of the selected courses", 403);
    }

    let allowed = owned;
    let skippedCount = ids.length - owned.length;

    // Scholars may only publish courses an admin has already approved.
    if (!isAdmin && action === "publish") {
      const eligible = owned.filter((c) => c.approvalStatus === "APPROVED");
      skippedCount += owned.length - eligible.length;
      allowed = eligible;
      if (allowed.length === 0) {
        return errorResponse(
          "Only admin-approved courses can be published. Submit courses for review first.",
          403,
        );
      }
    }

    const allowedIds = allowed.map((c) => c.id);
    let count = 0;

    if (action === "delete") {
      const result = await prisma.course.deleteMany({ where: { id: { in: allowedIds } } });
      count = result.count;
    } else if (action === "publish") {
      const data = isAdmin
        ? { published: true, status: "PUBLISHED" as const, approvalStatus: "APPROVED" as const }
        : { published: true, status: "PUBLISHED" as const };
      const result = await prisma.course.updateMany({ where: { id: { in: allowedIds } }, data });
      count = result.count;
    } else if (action === "unpublish") {
      const result = await prisma.course.updateMany({
        where: { id: { in: allowedIds } },
        data:  { published: false },
      });
      count = result.count;
    } else {
      const data = action === "feature" ? { featured: true } : { featured: false };
      const result = await prisma.course.updateMany({ where: { id: { in: allowedIds } }, data });
      count = result.count;
    }

    return successResponse({ action, affected: count, skipped: skippedCount });
  } catch (error) {
    return handleApiError(error);
  }
}

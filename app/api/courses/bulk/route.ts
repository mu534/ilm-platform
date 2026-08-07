import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import type { SessionUser } from "../../../types/auth.types";
import { z } from "zod";

const bulkSchema = z.object({
  ids:    z.array(z.string().min(1)).min(1, "Select at least one course").max(100),
  action: z.enum(["publish", "unpublish", "feature", "unfeature", "delete"]),
});

/**
 * POST /api/courses/bulk
 * Applies one action to many courses at once.
 *
 * Same authorization as the single-course endpoints: admins can act on any
 * course, scholars only on courses they authored. Any ids outside that set
 * are silently skipped (reported back in `skipped`) rather than failing the
 * whole batch — an instructor selecting a mixed set they don't fully own
 * still gets the ones they do own actioned.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user     = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);
    if (!["ADMIN", "SCHOLAR"].includes(user.role)) return errorResponse("Forbidden", 403);

    const { ids, action } = bulkSchema.parse(await req.json());
    const isAdmin = user.role === "ADMIN";

    // Figure out which of the requested ids this user is actually allowed to touch
    const courses = await prisma.course.findMany({
      where:  { id: { in: ids } },
      select: { id: true, authorId: true },
    });
    const allowedIds  = courses.filter((c) => isAdmin || c.authorId === user.id).map((c) => c.id);
    const skippedCount = ids.length - allowedIds.length;

    if (allowedIds.length === 0) {
      return errorResponse("You don't have permission to modify any of the selected courses", 403);
    }

    let count = 0;
    if (action === "delete") {
      const result = await prisma.course.deleteMany({ where: { id: { in: allowedIds } } });
      count = result.count;
    } else {
      const data =
        action === "publish"    ? { published: true }  :
        action === "unpublish"  ? { published: false } :
        action === "feature"    ? { featured: true }   :
        /* unfeature */           { featured: false };

      const result = await prisma.course.updateMany({ where: { id: { in: allowedIds } }, data });
      count = result.count;
    }

    return successResponse({ action, affected: count, skipped: skippedCount });
  } catch (error) {
    return handleApiError(error);
  }
}

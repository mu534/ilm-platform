import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireUserFresh } from "../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";

// GET /api/notifications — get current user's notifications only
export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFresh();

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const page       = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize   = Math.min(50, Number(searchParams.get("pageSize") ?? 20));

    // Always scoped to authenticated user — never trust client-supplied userId
    const where = {
      userId: user.id,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [total, notifications, unreadCount] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);

    return successResponse({ notifications, total, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/notifications — mark notifications as read (own only)
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUserFresh();

    const body = (await req.json()) as { ids?: string[]; all?: boolean };

    if (body.all) {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data:  { read: true },
      });
      return successResponse({ message: "All notifications marked as read" });
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      // Scope to user.id to prevent IDOR — can't mark other users' notifications
      await prisma.notification.updateMany({
        where: { userId: user.id, id: { in: body.ids } },
        data:  { read: true },
      });
      return successResponse({ message: "Notifications marked as read" });
    }

    return errorResponse("Provide ids or all:true", 400);
  } catch (error) {
    return handleApiError(error);
  }
}

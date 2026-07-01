import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";

// GET /api/notifications — get current user's notifications
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const page       = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize   = Math.min(50, Number(searchParams.get("pageSize") ?? 20));

    const where = {
      userId: user.id,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });

    return successResponse({ notifications, total, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const body = (await req.json()) as { ids?: string[]; all?: boolean };

    if (body.all) {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data:  { read: true },
      });
      return successResponse({ message: "All notifications marked as read" });
    }

    if (body.ids?.length) {
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

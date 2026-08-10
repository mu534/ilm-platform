import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { updateUserSchema } from "../../../lib/validations";
import { requireAdmin, requireUserFresh } from "../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import { getClientIp } from "../../../lib/rateLimit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUserFresh();
    const { id } = await params;

    if (actor.role !== "ADMIN" && actor.id !== id) {
      return errorResponse("Forbidden", 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true,
        image: true, bio: true, country: true, certificateName: true, createdAt: true,
        scholar: {
          select: { id: true, bio: true, topics: true, photo: true, featured: true },
        },
        _count: { select: { lectures: true, comments: true } },
      },
    });

    if (!user) return errorResponse("User not found", 404);
    return successResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUserFresh();
    const { id } = await params;

    if (actor.role !== "ADMIN" && actor.id !== id) {
      return errorResponse("Forbidden", 403);
    }

    const body = (await req.json()) as Record<string, unknown>;

    // Role changes require a fresh ADMIN check against the database
    if (body.role !== undefined) {
      await requireAdmin();
    } else if (actor.role !== "ADMIN") {
      delete body.role;
    }

    const data = updateUserSchema.parse(body);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, image: true, bio: true, country: true, certificateName: true },
    });

    if (data.role === "INSTRUCTOR") {
      const existing = await prisma.scholar.findUnique({ where: { userId: id } });
      if (!existing) {
        await prisma.scholar.create({
          data: {
            userId: id,
            bio: "Scholar profile awaiting completion.",
            topics: [], qualifications: [],
            photo: null, featured: false,
          },
        });
      }
    }

    if (actor.role === "ADMIN" && data.role) {
      await prisma.auditLog.create({
        data: {
          userId:     actor.id,
          action:     "CHANGE_ROLE",
          entityType: "User",
          entityId:   id,
          metadata:   JSON.stringify({ newRole: data.role }),
          ipAddress:  getClientIp(req),
        },
      }).catch(() => {});
    }

    return successResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    if (id === admin.id) return errorResponse("Cannot delete your own account", 400);

    const target = await prisma.user.findUnique({
      where: { id },
      select: { name: true, email: true },
    });

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId:     admin.id,
        action:     "DELETE_USER",
        entityType: "User",
        entityId:   id,
        metadata:   JSON.stringify({ deletedEmail: target?.email }),
        ipAddress:  getClientIp(req),
      },
    }).catch(() => {});

    return successResponse({ message: "User deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

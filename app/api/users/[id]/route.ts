import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { updateUserSchema } from "../../../lib/validations";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "../../../utils/api";
import type { SessionUser } from "../../../types/next-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id: userId, role: userRole } = session.user as SessionUser;
    const isAdmin = userRole === "ADMIN";
    const { id } = await params;

    if (!isAdmin && userId !== id) {
      return errorResponse("Forbidden", 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        bio: true,
        createdAt: true,
        scholar: {
          select: {
            id: true,
            bio: true,
            topics: true,
            photo: true,
            featured: true,
          },
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
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id: userId, role: userRole } = session.user as SessionUser;
    const isAdmin = userRole === "ADMIN";
    const { id } = await params;

    if (!isAdmin && userId !== id) {
      return errorResponse("Forbidden", 403);
    }

    const body = (await req.json()) as Record<string, unknown>;

    // Only admins can change roles
    if (!isAdmin) {
      delete body.role;
    }

    const data = updateUserSchema.parse(body);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        bio: true,
      },
    });

    return successResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { role: userRole } = session.user as SessionUser;
    if (userRole !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }
    const { id } = await params;

    await prisma.user.delete({ where: { id } });
    return successResponse({ message: "User deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

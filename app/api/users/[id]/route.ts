// src/app/api/users/[id]/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validations";
import { successResponse, errorResponse, handleApiError } from "@/utils/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const userId = (session.user as any).id;
    const isAdmin = (session.user as any).role === "ADMIN";

    if (!isAdmin && userId !== params.id)
      return errorResponse("Forbidden", 403);

    const user = await prisma.user.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const userId = (session.user as any).id;
    const isAdmin = (session.user as any).role === "ADMIN";

    if (!isAdmin && userId !== params.id)
      return errorResponse("Forbidden", 403);

    const body = await req.json();

    // Only admins can change roles
    if (!isAdmin && body.role) delete body.role;

    const data = updateUserSchema.parse(body);

    const user = await prisma.user.update({
      where: { id: params.id },
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
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }

    await prisma.user.delete({ where: { id: params.id } });
    return successResponse({ message: "User deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

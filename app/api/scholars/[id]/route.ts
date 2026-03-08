// src/app/api/scholars/[id]/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scholarSchema } from "@/lib/validations";
import { successResponse, errorResponse, handleApiError } from "@/utils/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const scholar = await prisma.scholar.findFirst({
      where: { OR: [{ id: params.id }, { userId: params.id }] },
      include: {
        user: { select: { name: true, email: true, image: true } },
        lectures: {
          where: { published: true },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            type: true,
            thumbnailUrl: true,
            tags: true,
            views: true,
            createdAt: true,
            _count: { select: { comments: true } },
          },
        },
        _count: { select: { lectures: true } },
      },
    });
    if (!scholar) return errorResponse("Scholar not found", 404);
    return successResponse(scholar);
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

    const scholar = await prisma.scholar.findUnique({
      where: { id: params.id },
    });
    if (!scholar) return errorResponse("Scholar not found", 404);

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    const isAdmin = userRole === "ADMIN";
    const isOwner = scholar.userId === userId;

    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = await req.json();
    const data = scholarSchema.partial().parse(body);

    const updated = await prisma.scholar.update({
      where: { id: params.id },
      data,
      include: { user: { select: { name: true, image: true } } },
    });

    return successResponse(updated);
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
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN") return errorResponse("Forbidden", 403);

    await prisma.scholar.delete({ where: { id: params.id } });
    return successResponse({ message: "Scholar profile deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

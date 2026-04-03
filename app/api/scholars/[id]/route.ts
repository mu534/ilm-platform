import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { scholarSchema } from "../../../lib/validations";
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
    const { id } = await params;
    const scholar = await prisma.scholar.findFirst({
      where: { OR: [{ id }, { userId: id }] },
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id: userId, role: userRole } = session.user as SessionUser;
    const { id } = await params;

    const scholar = await prisma.scholar.findUnique({
      where: { id },
    });
    if (!scholar) return errorResponse("Scholar not found", 404);

    const isAdmin = userRole === "ADMIN";
    const isOwner = scholar.userId === userId;

    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const data = scholarSchema.partial().parse(body);

    const updated = await prisma.scholar.update({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { role: userRole } = session.user as SessionUser;
    if (userRole !== "ADMIN") return errorResponse("Forbidden", 403);
    const { id } = await params;

    await prisma.scholar.delete({ where: { id } });
    return successResponse({ message: "Scholar profile deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireUserFresh, requireAdmin } from "../../../lib/authorization";
import { scholarSchema, pickProvided } from "../../../lib/validations";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "../../../utils/api";

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
    const user = await requireUserFresh();
    const { id } = await params;

    const scholar = await prisma.scholar.findUnique({ where: { id } });
    if (!scholar) return errorResponse("Scholar not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = scholar.userId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const data = pickProvided(body, scholarSchema.partial().parse(body));
    // Featuring a scholar is an editorial decision — scholars cannot feature themselves.
    if (!isAdmin) delete (data as Record<string, unknown>).featured;

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
    await requireAdmin();
    const { id } = await params;

    await prisma.scholar.delete({ where: { id } });
    return successResponse({ message: "Scholar profile deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

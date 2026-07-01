import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { moduleSchema } from "../../../lib/validations";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import type { SessionUser } from "../../../types/auth.types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        lectures: {
          orderBy: { order: "asc" },
          select: {
            id: true, title: true, slug: true,
            type: true, duration: true, published: true,
            thumbnailUrl: true, views: true,
            _count: { select: { comments: true } },
          },
        },
        quizzes: {
          select: {
            id: true, title: true, passingScore: true, timeLimit: true,
            _count: { select: { questions: true, attempts: true } },
          },
        },
        _count: { select: { lectures: true, quizzes: true } },
      },
    });

    if (!module) return errorResponse("Module not found", 404);
    return successResponse(module);
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
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    const module = await prisma.module.findUnique({
      where: { id },
      include: { course: { select: { authorId: true } } },
    });
    if (!module) return errorResponse("Module not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = module.course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const data = moduleSchema.partial().parse(body);

    const updated = await prisma.module.update({
      where: { id },
      data,
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
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    const module = await prisma.module.findUnique({
      where: { id },
      include: { course: { select: { authorId: true } } },
    });
    if (!module) return errorResponse("Module not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = module.course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    await prisma.module.delete({ where: { id } });
    return successResponse({ message: "Module deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

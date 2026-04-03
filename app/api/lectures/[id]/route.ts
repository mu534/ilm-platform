import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { lectureSchema } from "../../../lib/validations";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "../../../utils/api";
import type { SessionUser } from "../../../types/next-auth";

const lectureSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  content: true,
  type: true,
  mediaUrl: true,
  thumbnailUrl: true,
  tags: true,
  published: true,
  featured: true,
  views: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, image: true } },
  scholar: {
    select: {
      id: true,
      bio: true,
      photo: true,
      topics: true,
      qualifications: true,
      user: { select: { name: true, image: true } },
    },
  },
  _count: { select: { comments: true } },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const lecture = await prisma.lecture.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: lectureSelect,
    });
    if (!lecture) return errorResponse("Lecture not found", 404);

    await prisma.lecture.update({
      where: { id: lecture.id },
      data: { views: { increment: 1 } },
    });

    return successResponse(lecture);
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

    const lecture = await prisma.lecture.findUnique({
      where: { id },
    });
    if (!lecture) return errorResponse("Lecture not found", 404);

    const isAdmin = userRole === "ADMIN";
    const isOwner = lecture.authorId === userId;

    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const data = lectureSchema.partial().parse(body);

    const updated = await prisma.lecture.update({
      where: { id },
      data,
      select: lectureSelect,
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

    const { id: userId, role: userRole } = session.user as SessionUser;
    const { id } = await params;

    const lecture = await prisma.lecture.findUnique({
      where: { id },
    });
    if (!lecture) return errorResponse("Lecture not found", 404);

    const isAdmin = userRole === "ADMIN";
    const isOwner = lecture.authorId === userId;

    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    await prisma.lecture.delete({ where: { id } });
    return successResponse({ message: "Lecture deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

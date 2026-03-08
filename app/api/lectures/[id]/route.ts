// src/app/api/lectures/[id]/route.ts
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
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const lecture = await prisma.lecture.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: lectureSelect,
    });
    if (!lecture) return errorResponse("Lecture not found", 404);

    // Increment views
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
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const lecture = await prisma.lecture.findUnique({
      where: { id: params.id },
    });
    if (!lecture) return errorResponse("Lecture not found", 404);

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    const isOwner = lecture.authorId === userId;
    const isAdmin = userRole === "ADMIN";

    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const body = await req.json();
    const data = lectureSchema.partial().parse(body);

    const updated = await prisma.lecture.update({
      where: { id: params.id },
      data,
      select: lectureSelect,
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const lecture = await prisma.lecture.findUnique({
      where: { id: params.id },
    });
    if (!lecture) return errorResponse("Lecture not found", 404);

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    const isAdmin = userRole === "ADMIN";
    const isOwner = lecture.authorId === userId;

    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    await prisma.lecture.delete({ where: { id: params.id } });
    return successResponse({ message: "Lecture deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

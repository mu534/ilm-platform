import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { commentSchema } from "../../lib/validations";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "../../utils/api";
import { checkRateLimit } from "../../lib/rateLimit";
import type { SessionUser } from "../../types/auth.types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lectureId = searchParams.get("lectureId");
    if (!lectureId) return errorResponse("lectureId is required", 400);

    const comments = await prisma.comment.findMany({
      where: { lectureId, approved: true },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return successResponse(comments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return errorResponse("You must be logged in to comment", 401);
    }

    const { id: authorId } = session.user as SessionUser;

    // Rate limit: 10 comments per user per minute
    const rl = checkRateLimit(`comment:${authorId}`, { limit: 10, window: 60 });
    if (!rl.success) return errorResponse("Too many comments. Please slow down.", 429);

    const body = (await req.json()) as unknown;
    const data = commentSchema.parse(body);

    const lecture = await prisma.lecture.findUnique({
      where: { id: data.lectureId },
    });
    if (!lecture) return errorResponse("Lecture not found", 404);

    const comment = await prisma.comment.create({
      data: {
        body: data.body,
        lectureId: data.lectureId,
        authorId,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return successResponse(comment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

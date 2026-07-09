import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";
import { z } from "zod";

const questionSchema = z.object({
  title:    z.string().min(5).max(300),
  body:     z.string().min(10).max(5000),
  courseId: z.string().optional(),
});

// GET /api/forum?courseId=xxx&page=1
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId") ?? "";
    const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = 20;

    const where = courseId ? { courseId } : {};

    const [total, questions] = await Promise.all([
      prisma.forumQuestion.count({ where }),
      prisma.forumQuestion.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          author:  { select: { id: true, name: true, image: true } },
          _count:  { select: { replies: true, votes: true } },
        },
      }),
    ]);

    return successResponse({ questions, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/forum — create question
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const body = (await req.json()) as unknown;
    const data = questionSchema.parse(body);

    const question = await prisma.forumQuestion.create({
      data: {
        title:    data.title,
        body:     data.body,
        courseId: data.courseId,
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { replies: true, votes: true } },
      },
    });

    return successResponse(question, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

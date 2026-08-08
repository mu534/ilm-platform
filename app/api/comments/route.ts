import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { commentSchema } from "../../lib/validations";
import { requireUserFresh } from "../../lib/authorization";
import { requireLectureLearningAccess } from "../../lib/courseAccess";
import { notify } from "../../lib/notifications";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "../../utils/api";
import { checkRateLimit } from "../../lib/rateLimit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lectureId = searchParams.get("lectureId");
    if (!lectureId) return errorResponse("lectureId is required", 400);

    // Comments are only readable when the caller can access the lecture.
    // Unauthenticated users may read comments on published standalone lectures
    // that belong to a public course — enforce via learning access when logged in;
    // for anonymous, require the lecture+course to be publicly published.
    const lecture = await prisma.lecture.findUnique({
      where: { id: lectureId },
      select: {
        id: true,
        published: true,
        module: {
          select: {
            course: {
              select: { published: true, status: true, approvalStatus: true },
            },
          },
        },
      },
    });
    if (!lecture) return errorResponse("Lecture not found", 404);

    const course = lecture.module?.course;
    if (course) {
      const isPublic =
        lecture.published &&
        course.published &&
        course.status === "PUBLISHED" &&
        course.approvalStatus === "APPROVED";
      if (!isPublic) {
        // Allow enrolled/staff via requireLectureLearningAccess
        const user = await requireUserFresh();
        await requireLectureLearningAccess({
          userId: user.id,
          role: user.role,
          lectureId,
        });
      }
    } else if (!lecture.published) {
      return errorResponse("Lecture not found", 404);
    }

    const comments = await prisma.comment.findMany({
      where: { lectureId, approved: true },
      orderBy: { createdAt: "asc" },
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
    const user = await requireUserFresh();

    const rl = await checkRateLimit(`comment:${user.id}`, { limit: 10, window: 60 });
    if (!rl.success) return errorResponse("Too many comments. Please slow down.", 429);

    const body = (await req.json()) as unknown;
    const data = commentSchema.parse(body);

    await requireLectureLearningAccess({
      userId: user.id,
      role: user.role,
      lectureId: data.lectureId,
    });

    if (data.parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: data.parentId, lectureId: data.lectureId },
        select: { id: true },
      });
      if (!parent) return errorResponse("Parent comment not found", 404);
    }

    const comment = await prisma.comment.create({
      data: {
        body:      data.body,
        lectureId: data.lectureId,
        authorId:  user.id,
        parentId:  data.parentId ?? null,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    // Notify the parent comment's author about the reply (if this is a reply)
    if (data.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where:  { id: data.parentId },
        select: { authorId: true, lecture: { select: { slug: true } } },
      });
      if (parentComment && parentComment.authorId !== user.id) {
        await notify({
          userId:  parentComment.authorId,
          type:    "COMMENT_REPLY",
          title:   "New reply to your comment",
          message: `${user.name ?? "Someone"} replied: "${data.body.slice(0, 100)}${data.body.length > 100 ? "…" : ""}"`,
          link:    `/lectures/${parentComment.lecture?.slug ?? data.lectureId}`,
        }).catch(() => {/* non-critical */});
      }
    }

    return successResponse(comment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

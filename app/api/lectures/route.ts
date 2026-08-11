import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { lectureSchema } from "../../lib/validations";
import {
  requireUserFresh,
  getOptionalUser,
  requireModuleOwner,
  requireScholarAttribution,
} from "../../lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
  slugify,
} from "../../utils/api";
import { notifyScholarFollowers } from "../../lib/notifications";
import { ContentApprovalStatus } from "../../../generated/prisma/enums";

type LectureType = "TEXT" | "VIDEO";

interface LectureWhereInput {
  published?:      boolean;
  approvalStatus?: ContentApprovalStatus;
  featured?:       boolean;
  scholarId?:      string;
  type?:           LectureType;
  tags?:           { has: string };
  OR?: Array<{
    title?: { contains: string; mode: "insensitive" };
    description?: { contains: string; mode: "insensitive" };
  }>;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      50,
      Math.max(1, Number(searchParams.get("pageSize") ?? 12)),
    );
    const search = searchParams.get("search") ?? "";
    const tag = searchParams.get("tag") ?? "";
    const type = searchParams.get("type") ?? "";
    const featured = searchParams.get("featured") === "true";
    const scholarId = searchParams.get("scholarId") ?? "";
    const published = searchParams.get("published");

    const user     = await getOptionalUser();
    const isAdmin  = user?.role === "ADMIN";

    const where: LectureWhereInput = {};

    if (!isAdmin) {
      where.published       = true;
      where.approvalStatus  = "APPROVED";
    } else if (published !== null) {
      where.published = published === "true";
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tag) where.tags = { has: tag };
    if (type) where.type = type as LectureType;
    if (featured) where.featured = true;
    if (scholarId) where.scholarId = scholarId;

    const [total, items] = await Promise.all([
      prisma.lecture.count({ where }),
      prisma.lecture.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          type: true,
          thumbnailUrl: true,
          tags: true,
          published: true,
          featured: true,
          views: true,
          createdAt: true,
          author: { select: { id: true, name: true, image: true } },
          scholar: {
            select: {
              id: true,
              bio: true,
              photo: true,
              topics: true,
              user: { select: { name: true } },
            },
          },
          _count: { select: { comments: true } },
        },
      }),
    ]);

    return successResponse({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFresh();

    if (!["ADMIN", "INSTRUCTOR"].includes(user.role)) {
      return errorResponse("Forbidden: Only Admins and Instructors can create lectures", 403);
    }

    const body = (await req.json()) as unknown;
    const data = lectureSchema.parse(body);

    // Ownership of the target module and scholar attribution are verified
    // server-side — a crafted moduleId/scholarId cannot reach another author's course.
    if (data.moduleId) await requireModuleOwner(data.moduleId, user);
    if (data.scholarId) await requireScholarAttribution(data.scholarId, user);
    if (user.role !== "ADMIN") {
      delete (data as Record<string, unknown>).featured;
    }

    const slug = slugify(data.title);

    const lecture = await prisma.lecture.create({
      data: {
        ...data,
        slug,
        authorId: user.id,
      },
    });

    // Notify scholar's followers when published
    if (data.published) {
      const scholar = await prisma.scholar.findUnique({ where: { userId: user.id } });
      if (scholar) {
        void notifyScholarFollowers(
          scholar.id,
          "NEW_LECTURE",
          "New Lecture Published",
          `${lecture.title} is now available.`,
          `/lectures/${lecture.slug}`,
        );
      }
    }

    return successResponse(lecture, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

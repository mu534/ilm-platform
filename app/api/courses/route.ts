import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { courseSchema } from "../../lib/validations";
import { successResponse, errorResponse, handleApiError, slugify } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";
import type { CourseWhereInput } from "../../../generated/prisma/models/Course";
import { CourseStatus } from "../../../generated/prisma/enums";

// Shared select for course lists
const courseListSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  thumbnailUrl: true,
  difficulty: true,
  estimatedDuration: true,
  status: true,
  published: true,
  featured: true,
  approvalStatus: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
  author: { select: { id: true, name: true, image: true } },
  scholar: {
    select: {
      id: true,
      photo: true,
      verified: true,
      user: { select: { name: true } },
    },
  },
  _count: {
    select: { modules: true, enrollments: true, ratings: true },
  },
} as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    const isAdmin = user?.role === "ADMIN";

    const { searchParams } = new URL(req.url);
    const page       = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize   = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? 12)));
    const search     = searchParams.get("search") ?? "";
    const categoryId = searchParams.get("categoryId") ?? "";
    const difficulty = searchParams.get("difficulty") ?? "";
    const featured   = searchParams.get("featured") === "true";
    const scholarId  = searchParams.get("scholarId") ?? "";
    const published  = searchParams.get("published");
    const myContent  = searchParams.get("myContent") === "true";

    const where: CourseWhereInput = {};

    // Non-admins only see published+approved courses unless viewing own content
    if (!isAdmin && !myContent) {
      where.published = true;
      where.status    = CourseStatus.PUBLISHED;
    } else if (isAdmin && published !== null) {
      where.published = published === "true";
    } else if (myContent && user?.id) {
      where.authorId = user.id;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (scholarId)  where.scholarId  = scholarId;
    if (featured)   where.featured   = true;
    if (difficulty === "BEGINNER" || difficulty === "INTERMEDIATE" || difficulty === "ADVANCED") {
      where.difficulty = difficulty;
    }

    const [total, items] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: courseListSelect,
      }),
    ]);

    // Attach average rating to each course
    const courseIds = items.map((c) => c.id);
    const ratings = await prisma.courseRating.groupBy({
      by: ["courseId"],
      where: { courseId: { in: courseIds } },
      _avg: { rating: true },
    });
    const ratingMap = new Map(ratings.map((r) => [r.courseId, r._avg.rating ?? 0]));

    const enriched = items.map((course) => ({
      ...course,
      avgRating: ratingMap.get(course.id) ?? 0,
    }));

    return successResponse({
      items: enriched,
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
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);
    if (!["ADMIN", "SCHOLAR"].includes(user.role)) {
      return errorResponse("Forbidden: Only Admins and Scholars can create courses", 403);
    }

    const body  = (await req.json()) as unknown;
    const data  = courseSchema.parse(body);
    const slug  = slugify(data.title);

    const course = await prisma.course.create({
      data: {
        ...data,
        slug,
        authorId: user.id,
        status: user.role === "ADMIN" ? CourseStatus.PUBLISHED : CourseStatus.DRAFT,
        approvalStatus: user.role === "ADMIN" ? "APPROVED" : "DRAFT",
      },
      select: courseListSelect,
    });

    return successResponse(course, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { courseSchema } from "../../lib/validations";
import { successResponse, errorResponse, handleApiError, slugify } from "../../utils/api";
import { checkRateLimit, getClientIp } from "../../lib/rateLimit";
import type { SessionUser } from "../../types/auth.types";
import type { CourseWhereInput } from "../../../generated/prisma/models/Course";
import { CourseStatus, DifficultyLevel } from "../../../generated/prisma/enums";

// ── Shared selects ────────────────────────────────────────────────────────────

const courseListSelect = {
  id: true,
  title: true,
  subtitle: true,
  slug: true,
  description: true,
  thumbnailUrl: true,
  difficulty: true,
  language: true,
  estimatedDuration: true,
  tags: true,
  status: true,
  published: true,
  featured: true,
  approvalStatus: true,
  enrollmentType: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
  author:   { select: { id: true, name: true, image: true } },
  scholar: {
    select: {
      id: true, photo: true, verified: true,
      user: { select: { name: true } },
    },
  },
  _count: { select: { modules: true, enrollments: true, ratings: true } },
} as const;

// ── Unique slug helper ────────────────────────────────────────────────────────

async function generateUniqueSlug(base: string): Promise<string> {
  const slug = slugify(base);
  const existing = await prisma.course.count({ where: { slug } });
  if (existing === 0) return slug;
  // Append a short timestamp suffix to guarantee uniqueness
  return `${slug}-${Date.now().toString(36)}`;
}

// ── GET /api/courses ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session  = await getServerSession(authOptions);
    const user     = session?.user as SessionUser | undefined;
    const isAdmin  = user?.role === "ADMIN";
    const isScholar = user?.role === "SCHOLAR";

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

    if (myContent && user?.id) {
      // Scholar/Admin viewing their own content — show all statuses
      where.authorId = user.id;
    } else if (isAdmin) {
      // Admin sees everything, but can filter by published state
      if (published !== null) where.published = published === "true";
    } else {
      // Public — only published+approved courses
      where.published      = true;
      where.status         = CourseStatus.PUBLISHED;
      where.approvalStatus = "APPROVED";
    }

    if (search) {
      where.OR = [
        { title:       { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags:        { hasSome: [search] } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (scholarId)  where.scholarId  = scholarId;
    if (featured)   where.featured   = true;

    const validDifficulties = Object.values(DifficultyLevel) as string[];
    if (validDifficulties.includes(difficulty)) {
      where.difficulty = difficulty as DifficultyLevel;
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

    // Batch-fetch average ratings — single query, no N+1
    const courseIds  = items.map((c) => c.id);
    const ratings    = await prisma.courseRating.groupBy({
      by:    ["courseId"],
      where: { courseId: { in: courseIds } },
      _avg:  { rating: true },
      _count: { rating: true },
    });
    const ratingMap  = new Map(ratings.map((r) => [r.courseId, r]));

    const enriched = items.map((course) => {
      const r = ratingMap.get(course.id);
      return {
        ...course,
        avgRating:    r?._avg.rating    ?? 0,
        totalRatings: r?._count.rating  ?? 0,
      };
    });

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

// ── POST /api/courses ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate-limit course creation — 20 per hour per user
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`course-create:${ip}`, { limit: 20, window: 3600 });
  if (!rl.success) return errorResponse("Too many requests. Please try again later.", 429);

  try {
    const session = await getServerSession(authOptions);
    const user    = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    if (!["ADMIN", "SCHOLAR"].includes(user.role)) {
      return errorResponse("Only Admins and Scholars can create courses", 403);
    }

    const body = (await req.json()) as unknown;
    const data = courseSchema.parse(body);

    // Scholars must go through the approval workflow — never auto-publish
    const isAdmin = user.role === "ADMIN";
    const status         = isAdmin ? CourseStatus.PUBLISHED : CourseStatus.DRAFT;
    const approvalStatus = isAdmin ? "APPROVED"             : "DRAFT";

    // Force published=false for scholars regardless of what they send
    const publishedValue = isAdmin ? (data.published ?? false) : false;

    const slug = await generateUniqueSlug(data.title);

    const course = await prisma.course.create({
      data: {
        ...data,
        slug,
        published:       publishedValue,
        authorId:        user.id,
        status,
        approvalStatus,
      },
      select: courseListSelect,
    });

    return successResponse(course, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

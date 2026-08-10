import { prisma } from "../prism";
import { publicCourseWhere, isPublicCourse } from "../courseAccess";
import { HttpError } from "../httpError";
import { slugify } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";
import { CourseStatus, DifficultyLevel, ContentApprovalStatus } from "../../../generated/prisma/enums";

export interface CourseQueryFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  difficulty?: string;
  featured?: boolean;
  scholarId?: string;
  published?: string | null;
  myContent?: boolean;
}

export class CourseService {
  static readonly listSelect = {
    id: true,
    title: true,
    subtitle: true,
    slug: true,
    description: true,
    shortDescription: true,
    thumbnailUrl: true,
    bannerUrl: true,
    difficulty: true,
    language: true,
    estimatedDuration: true,
    tags: true,
    status: true,
    published: true,
    featured: true,
    approvalStatus: true,
    enrollmentType: true,
    price: true,
    currency: true,
    createdAt: true,
    updatedAt: true,
    categoryId: true,
    authorId: true,
    scholarId: true,
    category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
    author: { select: { id: true, name: true, image: true } },
    scholar: {
      select: {
        id: true,
        photo: true,
        verified: true,
        professionalDesignation: true,
        user: { select: { name: true } },
      },
    },
    _count: { select: { modules: true, enrollments: true, ratings: true } },
  } as const;

  static async generateUniqueSlug(base: string, excludeCourseId?: string): Promise<string> {
    const baseSlug = slugify(base);
    const existing = await prisma.course.findFirst({
      where: {
        slug: baseSlug,
        ...(excludeCourseId ? { id: { not: excludeCourseId } } : {}),
      },
    });
    if (!existing) return baseSlug;
    return `${baseSlug}-${Date.now().toString(36)}`;
  }

  /**
   * Helper to find scholar ID associated with a user if available.
   */
  static async resolveScholarIdForUser(userId: string): Promise<string | null> {
    const scholar = await prisma.scholar.findUnique({
      where: { userId },
      select: { id: true },
    });
    return scholar?.id ?? null;
  }

  static async getCourses(filters: CourseQueryFilters, user?: SessionUser | null) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 12));
    const isAdmin = user?.role === "ADMIN";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (filters.myContent && user?.id) {
      where.authorId = user.id;
    } else if (isAdmin) {
      if (filters.published !== null && filters.published !== undefined) {
        where.published = filters.published === "true";
      }
    } else {
      Object.assign(where, publicCourseWhere);
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { shortDescription: { contains: filters.search, mode: "insensitive" } },
        { tags: { hasSome: [filters.search] } },
      ];
    }

    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.scholarId) where.scholarId = filters.scholarId;
    if (filters.featured) where.featured = true;

    if (filters.difficulty && Object.values(DifficultyLevel).includes(filters.difficulty as DifficultyLevel)) {
      where.difficulty = filters.difficulty as DifficultyLevel;
    }

    const [total, items] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: this.listSelect,
      }),
    ]);

    const courseIds = items.map((c) => c.id);
    const ratings = await prisma.courseRating.groupBy({
      by: ["courseId"],
      where: { courseId: { in: courseIds } },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const ratingMap = new Map(ratings.map((r) => [r.courseId, r]));

    const enriched = items.map((course) => {
      const r = ratingMap.get(course.id);
      return {
        ...course,
        avgRating: r?._avg.rating ?? 0,
        totalRatings: r?._count.rating ?? 0,
      };
    });

    return {
      items: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  static async getCourseBySlug(slug: string, user?: SessionUser | null) {
    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        category: true,
        author: { select: { id: true, name: true, image: true, bio: true } },
        scholar: {
          select: {
            id: true,
            photo: true,
            verified: true,
            professionalDesignation: true,
            bio: true,
            topics: true,
            qualifications: true,
            user: { select: { id: true, name: true } },
          },
        },
        modules: {
          orderBy: { order: "asc" },
          include: {
            lectures: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                slug: true,
                type: true,
                duration: true,
                published: true,
                approvalStatus: true,
                order: true,
              },
            },
            quizzes: {
              select: {
                id: true,
                title: true,
                timeLimit: true,
                passingScore: true,
                _count: { select: { questions: true } },
              },
            },
          },
        },
        prerequisiteCourses: {
          include: {
            prerequisiteCourse: {
              select: { id: true, title: true, slug: true, thumbnailUrl: true },
            },
          },
        },
        _count: { select: { enrollments: true, ratings: true } },
      },
    });

    if (!course) throw new HttpError("Course not found", 404);

    const isAdmin = user?.role === "ADMIN";
    const isAuthor = user?.id === course.authorId;
    if (!isPublicCourse(course) && !isAdmin && !isAuthor) {
      throw new HttpError("Course not found", 404);
    }

    const ratingAggregate = await prisma.courseRating.aggregate({
      where: { courseId: course.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      ...course,
      avgRating: ratingAggregate._avg.rating ?? 0,
      totalRatings: ratingAggregate._count.rating ?? 0,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async createCourse(user: SessionUser, data: any) {
    const isAdmin = user.role === "ADMIN";
    const status = isAdmin ? CourseStatus.PUBLISHED : CourseStatus.DRAFT;
    const approvalStatus = isAdmin ? ContentApprovalStatus.APPROVED : ContentApprovalStatus.DRAFT;
    const publishedValue = isAdmin ? (data.published ?? false) : false;

    // Automatic scholar ID resolution if author has a Scholar record
    let scholarId = data.scholarId;
    if (!scholarId) {
      scholarId = (await this.resolveScholarIdForUser(user.id)) ?? undefined;
    }

    const slug = await this.generateUniqueSlug(data.title);

    const course = await prisma.course.create({
      data: {
        ...data,
        slug,
        published: publishedValue,
        featured: isAdmin ? (data.featured ?? false) : false,
        authorId: user.id,
        scholarId,
        status,
        approvalStatus,
      },
      select: this.listSelect,
    });

    return course;
  }
}

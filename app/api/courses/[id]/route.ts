import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { courseSchema, pickProvided } from "../../../lib/validations";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import { getClientIp } from "../../../lib/rateLimit";
import { isPublicCourse } from "../../../lib/courseAccess";
import {
  requireUserFresh,
  getOptionalUser,
  requireScholarAttribution,
} from "../../../lib/authorization";
import { z } from "zod";

// ── Shared select ─────────────────────────────────────────────────────────────

const courseDetailSelect = {
  id: true,
  title: true,
  subtitle: true,
  slug: true,
  description: true,
  shortDescription: true,
  thumbnailUrl: true,
  bannerUrl: true,
  objectives: true,
  prerequisites: true,
  difficulty: true,
  language: true,
  estimatedDuration: true,
  tags: true,
  seoTitle: true,
  seoDescription: true,
  enrollmentType: true,
  status: true,
  published: true,
  featured: true,
  approvalStatus: true,
  approvalNote: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
  author:   { select: { id: true, name: true, image: true } },
  scholar: {
    select: {
      id: true, bio: true, photo: true, topics: true,
      qualifications: true, verified: true,
      user: { select: { name: true, image: true } },
    },
  },
  modules: {
    orderBy: { order: "asc" as const },
    select: {
      id: true, title: true, description: true, order: true,
      lectures: {
        orderBy: { order: "asc" as const },
        select: {
          id: true, title: true, slug: true, type: true,
          duration: true, published: true, thumbnailUrl: true, views: true,
          _count: { select: { comments: true } },
        },
      },
      _count: { select: { lectures: true, quizzes: true } },
    },
  },
  _count: { select: { modules: true, enrollments: true, ratings: true } },
} as const;

// Admin-only presentation fields. Moderation state is intentionally handled only
// by /api/courses/[id]/review so review validation, notifications, and audit
// history cannot be bypassed through a generic edit request.
const adminUpdateSchema = z.object({
  featured:       z.boolean().optional(),
});

// Publication and feature flags are omitted rather than stripped after parsing:
// zod's `.partial()` keeps `.default(false)`, so an absent `published`/`featured`
// would otherwise be re-injected as `false` and silently unpublish the course.
const courseEditSchema = courseSchema.omit({ published: true, featured: true }).partial();

// ── GET /api/courses/[id] ─────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user   = await getOptionalUser();
    const { id } = await params;

    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: courseDetailSelect,
    });

    if (!course) return errorResponse("Course not found", 404);

    const isAdmin  = user?.role === "ADMIN";
    const isOwner  = user?.id === course.author.id;
    const isPublic = isPublicCourse(course);

    // Gate: non-public courses are only visible to their owner or admins
    if (!isPublic && !isAdmin && !isOwner) {
      return errorResponse("Course not found", 404); // Don't reveal existence
    }

    const ratingAgg = await prisma.courseRating.aggregate({
      where: { courseId: course.id },
      _avg:  { rating: true },
      _count: { rating: true },
    });

    const isStaff = isAdmin || isOwner;

    // For public viewers, strip out unpublished lecture metadata so private
    // curriculum structure is not exposed through the course detail endpoint.
    const visibleModules = isStaff
      ? course.modules
      : course.modules.map((m) => ({
          ...m,
          lectures: m.lectures.filter((l) => l.published),
        }));

    return successResponse({
      ...course,
      modules:      visibleModules,
      avgRating:    ratingAgg._avg.rating    ?? 0,
      totalRatings: ratingAgg._count.rating,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ── PATCH /api/courses/[id] ───────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();

    const { id } = await params;
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return errorResponse("Course not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    const raw  = (await req.json()) as unknown;

    if (typeof raw === "object" && raw !== null && ("approvalStatus" in raw || "approvalNote" in raw || "status" in raw || "published" in raw)) {
      return errorResponse("Course moderation and publication changes must use the review workflow", 409);
    }

    const courseData = pickProvided(raw, courseEditSchema.parse(raw));
    if (courseData.scholarId && courseData.scholarId !== course.scholarId) {
      await requireScholarAttribution(courseData.scholarId, user);
    }

    // Admin-only fields validated separately through strict schema — no injection possible
    const adminData  = isAdmin ? adminUpdateSchema.parse(raw) : {};

    // Scholars editing a PUBLISHED course triggers re-review
    const needsRereview =
      !isAdmin &&
      course.approvalStatus === "APPROVED" &&
      course.status === "PUBLISHED" &&
      Object.keys(courseData).length > 0;

    const reReviewFields = needsRereview
      ? { approvalStatus: "PENDING" as const, status: "PENDING_REVIEW" as const, published: false }
      : {};

    // Stripe Price objects are immutable — if the price or currency changed,
    // drop the cached stripePriceId so /checkout creates a fresh one instead
    // of charging the old amount.
    const priceChanged =
      (courseData.price !== undefined && courseData.price !== course.price) ||
      (courseData.currency !== undefined && courseData.currency !== course.currency);
    const priceInvalidation = priceChanged ? { stripePriceId: null } : {};

    const updated = await prisma.course.update({
      where: { id },
      data:  { ...courseData, ...adminData, ...reReviewFields, ...priceInvalidation },
      select: courseDetailSelect,
    });

    // Log admin actions
    if (isAdmin && Object.keys(adminData).length > 0) {
      await prisma.auditLog.create({
        data: {
          userId:     user.id,
          action:     "COURSE_UPDATED",
          entityType: "Course",
          entityId:   id,
          metadata:   JSON.stringify({ adminFields: Object.keys(adminData) }),
          ipAddress:  getClientIp(req),
        },
      }).catch(() => {});
    }

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// ── DELETE /api/courses/[id] ──────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();

    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
      select: {
        id: true, authorId: true, title: true,
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) return errorResponse("Course not found", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = course.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    // Warn if there are active enrollments (admin only can force-delete)
    if (!isAdmin && course._count.enrollments > 0) {
      return errorResponse(
        `Cannot delete a course with ${course._count.enrollments} enrolled student(s). Please contact an admin.`,
        409,
      );
    }

    await prisma.course.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId:     user.id,
        action:     "DELETE_COURSE",
        entityType: "Course",
        entityId:   id,
        metadata:   JSON.stringify({ title: course.title, enrollments: course._count.enrollments }),
        ipAddress:  getClientIp(req),
      },
    }).catch(() => {});

    return successResponse({ message: "Course deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

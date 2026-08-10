import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError, slugify } from "../../../../utils/api";

/**
 * POST /api/courses/[id]/duplicate
 * Creates a full copy of the course (modules + lectures) as a DRAFT
 * owned by the current user. Does not copy enrollments or ratings.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    if (!["ADMIN", "INSTRUCTOR"].includes(user.role)) {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await params;

    // Fetch the full course with modules and lectures
    const source = await prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lectures: { orderBy: { order: "asc" } },
          },
        },
      },
    });

    if (!source) return errorResponse("Course not found", 404);

    // Only the owner or admin can duplicate
    const isAdmin = user.role === "ADMIN";
    const isOwner = source.authorId === user.id;
    if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

    // Generate a unique slug for the copy
    const baseSlug = slugify(`${source.title} copy`);
    const existingCount = await prisma.course.count({
      where: { slug: { startsWith: baseSlug } },
    });
    const slug = existingCount > 0
      ? `${baseSlug}-${Date.now().toString(36)}`
      : baseSlug;

    // Create copy in a transaction
    const copy = await prisma.$transaction(async (tx) => {
      // 1. Create the course copy as DRAFT
      const newCourse = await tx.course.create({
        data: {
          title:             `${source.title} (Copy)`,
          slug,
          description:       source.description,
          thumbnailUrl:      source.thumbnailUrl,
          bannerUrl:         source.bannerUrl,
          objectives:        source.objectives,
          prerequisites:     source.prerequisites,
          difficulty:        source.difficulty,
          estimatedDuration: source.estimatedDuration,
          tags:              source.tags,
          categoryId:        source.categoryId,
          scholarId:         source.scholarId,
          authorId:          user.id,
          status:            "DRAFT",
          approvalStatus:    "DRAFT",
          published:         false,
          featured:          false,
        },
      });

      // 2. Copy modules and lectures
      for (const module of source.modules) {
        const newModule = await tx.module.create({
          data: {
            title:       module.title,
            description: module.description,
            order:       module.order,
            courseId:    newCourse.id,
          },
        });

        for (const lecture of module.lectures) {
          await tx.lecture.create({
            data: {
              title:         lecture.title,
              slug:          `${lecture.slug}-copy-${Date.now().toString(36)}`,
              description:   lecture.description,
              content:       lecture.content,
              type:          lecture.type,
              mediaUrl:      lecture.mediaUrl,
              thumbnailUrl:  lecture.thumbnailUrl,
              tags:          lecture.tags,
              published:     false, // copies start unpublished
              featured:      false,
              order:         lecture.order,
              duration:      lecture.duration,
              authorId:      user.id,
              scholarId:     lecture.scholarId,
              moduleId:      newModule.id,
              categoryId:    lecture.categoryId,
              approvalStatus: "DRAFT",
            },
          });
        }
      }

      return newCourse;
    });

    return successResponse({
      id:   copy.id,
      slug: copy.slug,
      message: "Course duplicated successfully. It is saved as a draft.",
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

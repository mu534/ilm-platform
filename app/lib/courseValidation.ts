/**
 * Course publishing checklist.
 * Called before any state transition to PUBLISHED.
 * Returns a list of unmet requirements.
 */

import { prisma } from "./prism";

export interface PublishCheck {
  valid:  boolean;
  errors: string[];
}

export async function checkCoursePublishable(courseId: string): Promise<PublishCheck> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      title:       true,
      description: true,
      thumbnailUrl: true,
      categoryId:  true,
      objectives:  true,
      modules: {
        select: {
          id: true,
          lectures: {
            where:  { published: true },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!course) return { valid: false, errors: ["Course not found"] };

  const errors: string[] = [];

  if (!course.title || course.title.trim().length < 5) {
    errors.push("Title must be at least 5 characters");
  }
  if (!course.description || course.description.trim().length < 50) {
    errors.push("Description must be at least 50 characters");
  }
  if (!course.thumbnailUrl) {
    errors.push("A thumbnail image is required");
  }
  if (!course.categoryId) {
    errors.push("A category must be selected");
  }
  if (!course.objectives || course.objectives.filter(Boolean).length < 2) {
    errors.push("At least 2 learning objectives are required");
  }
  if (course.modules.length === 0) {
    errors.push("At least one module is required");
  }
  const totalPublishedLectures = course.modules.reduce(
    (sum, m) => sum + m.lectures.length,
    0,
  );
  if (totalPublishedLectures === 0) {
    errors.push("At least one published lecture is required");
  }

  return { valid: errors.length === 0, errors };
}

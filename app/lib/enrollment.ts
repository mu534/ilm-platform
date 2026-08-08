import { prisma } from "./prism";
import { isPublicCourse } from "./courseAccess";

export class AlreadyEnrolledError extends Error {
  constructor() { super("User is already enrolled in this course"); }
}

export class CourseNotAvailableError extends Error {
  constructor() { super("Course is not available for enrollment"); }
}

/**
 * Check whether a user has satisfied all prerequisites for a course.
 * All prerequisite courses must have a COMPLETED enrollment.
 * Returns { satisfied: true } or { satisfied: false, missing: [...] }.
 */
export async function checkPrerequisites(
  userId: string,
  courseId: string,
): Promise<{ satisfied: true } | { satisfied: false; missing: { id: string; title: string; slug: string }[] }> {
  const prereqs = await prisma.coursePrerequisite.findMany({
    where:   { dependentCourseId: courseId },
    include: { prerequisiteCourse: { select: { id: true, title: true, slug: true } } },
  });

  if (prereqs.length === 0) return { satisfied: true };

  const prereqCourseIds = prereqs.map((p) => p.prerequisiteCourseId);

  const completedEnrollments = await prisma.enrollment.findMany({
    where:  { userId, courseId: { in: prereqCourseIds }, status: "COMPLETED" },
    select: { courseId: true },
  });
  const completedIds = new Set(completedEnrollments.map((e) => e.courseId));

  const missing = prereqs
    .filter((p) => !completedIds.has(p.prerequisiteCourseId))
    .map((p) => p.prerequisiteCourse);

  if (missing.length === 0) return { satisfied: true };
  return { satisfied: false, missing };
}

/**
 * Creates an enrollment and pre-seeds LectureProgress rows for every
 * published lecture in the course, so progress percentage is accurate
 * from the very first request.
 *
 * This service is the single authoritative enrollment path shared by both
 * the free-enroll endpoint and the Stripe webhook. It validates:
 *   1. Course exists and is publicly available (published + approved)
 *   2. User is not already enrolled
 *   3. Prerequisites are satisfied (all must be COMPLETED)
 *
 * Callers (enroll endpoint, Stripe webhook) may have already performed some
 * of these checks — the service re-validates to be safe so no caller can
 * accidentally bypass a rule by skipping a pre-check.
 *
 * Exception: the Stripe webhook passes `skipPublicCheck: true` because a
 * paid course payment was already accepted; the course may theoretically
 * have been de-published between checkout and webhook delivery. We still
 * validate prerequisites in all paths.
 */
export async function createEnrollment(
  userId: string,
  courseId: string,
  opts: { skipPublicCheck?: boolean } = {},
) {
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) throw new AlreadyEnrolledError();

  const course = await prisma.course.findUnique({
    where:   { id: courseId },
    select: {
      id:             true,
      published:      true,
      status:         true,
      approvalStatus: true,
      enrollmentType: true,
      price:          true,
      modules: {
        select: {
          lectures: { where: { published: true }, select: { id: true } },
        },
      },
    },
  });
  if (!course) throw new Error("Course not found");

  // Validate the course is still publicly enrollable unless the caller
  // explicitly skips this check (paid-course Stripe webhook path).
  if (!opts.skipPublicCheck && !isPublicCourse(course)) {
    throw new CourseNotAvailableError();
  }

  const allLectureIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));

  return prisma.$transaction(async (tx) => {
    // Clean up any orphan progress rows from before enrollment enforcement
    if (allLectureIds.length > 0) {
      await tx.lectureProgress.deleteMany({
        where: { userId, lectureId: { in: allLectureIds } },
      });
    }

    const created = await tx.enrollment.create({
      data:    { userId, courseId },
      include: { course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } } },
    });

    if (allLectureIds.length > 0) {
      await tx.lectureProgress.createMany({
        data: allLectureIds.map((lectureId) => ({ userId, lectureId, completed: false })),
        skipDuplicates: true,
      });
    }

    return created;
  });
}

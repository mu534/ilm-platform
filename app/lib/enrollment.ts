import { prisma } from "./prism";

export class AlreadyEnrolledError extends Error {
  constructor() { super("User is already enrolled in this course"); }
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
 * Used by both the free-course enroll endpoint and the Stripe webhook that
 * grants access after a successful paid checkout — keeping this in one
 * place means the two paths can never quietly drift apart.
 *
 * Pre-enrollment progress abuse: if orphan LectureProgress rows exist for
 * this course's lectures (created before enrollment was enforced), they are
 * deleted before seeding so illegitimate completions cannot carry over.
 * Re-enrollment after a prior enrollment is blocked by AlreadyEnrolledError
 * while a row still exists; if the student unenrolled (row deleted), wiping
 * orphans is the correct reset.
 */
export async function createEnrollment(userId: string, courseId: string) {
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) throw new AlreadyEnrolledError();

  const course = await prisma.course.findUnique({
    where:   { id: courseId },
    include: {
      modules: {
        select: {
          lectures: { where: { published: true }, select: { id: true } },
        },
      },
    },
  });
  if (!course) throw new Error("Course not found");

  const allLectureIds = course.modules.flatMap((m) => m.lectures.map((l) => l.id));

  return prisma.$transaction(async (tx) => {
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

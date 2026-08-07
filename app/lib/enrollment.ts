import { prisma } from "./prism";

export class AlreadyEnrolledError extends Error {
  constructor() { super("User is already enrolled in this course"); }
}

/**
 * Creates an enrollment and pre-seeds LectureProgress rows for every
 * published lecture in the course, so progress percentage is accurate
 * from the very first request.
 *
 * Used by both the free-course enroll endpoint and the Stripe webhook that
 * grants access after a successful paid checkout — keeping this in one
 * place means the two paths can never quietly drift apart (e.g. one of
 * them forgetting the `published: true` filter, as happened once before).
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

  const [enrollment] = await prisma.$transaction([
    prisma.enrollment.create({
      data:    { userId, courseId },
      include: { course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } } },
    }),
    prisma.lectureProgress.createMany({
      data: allLectureIds.map((lectureId) => ({ userId, lectureId, completed: false })),
      skipDuplicates: true,
    }),
  ]);

  return enrollment;
}

import { prisma } from "./prism";
import { isLectureLocked } from "./sequentialLearning";
import { HttpError } from "./httpError";
import type { SessionUser, UserRole } from "../types/auth.types";
import type { ContentApprovalStatus, CourseStatus } from "../../generated/prisma/enums";

/** Canonical public-course predicate — use everywhere listings/enrollment/checkout decide visibility. */
export function isPublicCourse(course: {
  published: boolean;
  status: CourseStatus | string;
  approvalStatus: ContentApprovalStatus | string;
}): boolean {
  return (
    course.published === true &&
    course.status === "PUBLISHED" &&
    course.approvalStatus === "APPROVED"
  );
}

/** Prisma `where` fragment for publicly listed / purchasable courses. */
export const publicCourseWhere = {
  published: true,
  status: "PUBLISHED" as const,
  approvalStatus: "APPROVED" as const,
};

export function getTrustedAppUrl(): string {
  const url = (process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "").replace(/\/$/, "");
  if (!url) throw new HttpError("Application URL is not configured", 500);
  return url;
}

function isAdminRole(role: UserRole): boolean {
  return role === "ADMIN";
}

function canStaffPreview(role: UserRole, userId: string, authorId: string): boolean {
  return isAdminRole(role) || userId === authorId;
}

export async function requireEnrollment(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) {
    throw new HttpError("You must be enrolled in this course", 403);
  }
  return enrollment;
}

export async function hasCourseLearnAccess(
  user: Pick<SessionUser, "id" | "role">,
  courseId: string,
  authorId: string,
): Promise<boolean> {
  if (canStaffPreview(user.role, user.id, authorId)) return true;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true },
  });
  return !!enrollment;
}

export async function requireCourseLearnAccess(
  user: Pick<SessionUser, "id" | "role">,
  courseId: string,
) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      authorId: true,
      published: true,
      status: true,
      approvalStatus: true,
      sequentialLearning: true,
    },
  });
  if (!course) throw new HttpError("Course not found", 404);

  const allowed = await hasCourseLearnAccess(user, course.id, course.authorId);
  if (!allowed) throw new HttpError("You must be enrolled in this course", 403);
  return course;
}

type LectureLearningArgs = {
  userId: string;
  role: UserRole;
  lectureId: string;
  /** When true, also enforce sequential unlock for students. */
  enforceSequential?: boolean;
};

/**
 * Resolve lecture → module → course and verify learning access.
 * Staff = ADMIN or course author. Students must be enrolled.
 */
export async function requireLectureLearningAccess(args: LectureLearningArgs) {
  const { userId, role, lectureId, enforceSequential = false } = args;

  const lecture = await prisma.lecture.findUnique({
    where: { id: lectureId },
    select: {
      id: true,
      published: true,
      authorId: true,
      moduleId: true,
      module: {
        select: {
          courseId: true,
          course: {
            select: {
              id: true,
              authorId: true,
              published: true,
              status: true,
              approvalStatus: true,
              sequentialLearning: true,
            },
          },
        },
      },
    },
  });

  if (!lecture) throw new HttpError("Lecture not found", 404);

  const course = lecture.module?.course ?? null;

  // Standalone lecture (no course module)
  if (!course) {
    const isStaff = isAdminRole(role) || lecture.authorId === userId;
    if (!lecture.published && !isStaff) throw new HttpError("Lecture not found", 404);
    return {
      lectureId: lecture.id,
      courseId: null as string | null,
      isStaff,
      sequentialLearning: false,
    };
  }

  const isStaff = canStaffPreview(role, userId, course.authorId);

  if (!isStaff) {
    await requireEnrollment(userId, course.id);
    if (!lecture.published) {
      throw new HttpError("This lecture is not available", 403);
    }
  }

  if (enforceSequential && !isStaff && course.sequentialLearning) {
    await assertLectureNotSequentiallyLocked(userId, lectureId, course.id);
  }

  return {
    lectureId: lecture.id,
    courseId: course.id,
    isStaff,
    sequentialLearning: course.sequentialLearning,
    authorId: course.authorId,
  };
}

async function assertLectureNotSequentiallyLocked(
  userId: string,
  lectureId: string,
  courseId: string,
): Promise<void> {
  const modules = await prisma.module.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    select: {
      lectures: {
        where: { published: true },
        orderBy: { order: "asc" },
        select: { id: true },
      },
    },
  });

  const orderedLectureIds = modules.flatMap((m) => m.lectures.map((l) => l.id));
  if (!orderedLectureIds.includes(lectureId)) {
    throw new HttpError("Lecture is not part of this course curriculum", 403);
  }

  const completed = await prisma.lectureProgress.findMany({
    where: {
      userId,
      lectureId: { in: orderedLectureIds },
      completed: true,
    },
    select: { lectureId: true },
  });
  const completedIds = new Set(completed.map((p) => p.lectureId));

  if (isLectureLocked(lectureId, orderedLectureIds, completedIds, true)) {
    throw new HttpError("Complete previous lectures before accessing this one", 403);
  }
}

type QuizLearningArgs = {
  userId: string;
  role: UserRole;
  quizId: string;
};

/**
 * Quiz access mirrors lecture learning access: enrollment (or staff) required.
 * Also enforces sequential learning against the module's lectures when enabled.
 */
export async function requireQuizLearningAccess(args: QuizLearningArgs) {
  const { userId, role, quizId } = args;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      passingScore: true,
      moduleId: true,
      module: {
        select: {
          courseId: true,
          course: {
            select: {
              id: true,
              authorId: true,
              sequentialLearning: true,
            },
          },
          lectures: {
            where: { published: true },
            orderBy: { order: "asc" },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!quiz?.module?.course) throw new HttpError("Quiz not found", 404);

  const course = quiz.module.course;
  const isStaff = canStaffPreview(role, userId, course.authorId);

  if (!isStaff) {
    await requireEnrollment(userId, course.id);

    // When sequential learning is on, require all lectures in this module completed
    // before the quiz is attemptable (mirrors typical LMS quiz gating).
    if (course.sequentialLearning && quiz.module.lectures.length > 0) {
      const lectureIds = quiz.module.lectures.map((l) => l.id);
      const completedCount = await prisma.lectureProgress.count({
        where: { userId, lectureId: { in: lectureIds }, completed: true },
      });
      if (completedCount < lectureIds.length) {
        throw new HttpError("Complete this module's lectures before taking the quiz", 403);
      }
    }
  }

  return {
    quizId: quiz.id,
    courseId: course.id,
    passingScore: quiz.passingScore,
    isStaff,
  };
}

/** Alias kept for callers that use the shorter name. */
export const requireLectureLearnAccess = requireLectureLearningAccess;

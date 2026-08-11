import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prism";
import { HttpError } from "./httpError";
import type { SessionUser, UserRole } from "../types/auth.types";

/**
 * Load the authenticated session user.
 * Throws HttpError(401) if unauthenticated.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) throw new HttpError("Unauthorized", 401);
  return user;
}

/**
 * Authenticate and re-validate role against the database.
 * Use for sensitive authorization so a stale JWT role cannot escalate.
 */
export async function requireUserFresh(): Promise<SessionUser> {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, name: true, email: true, image: true },
  });
  if (!dbUser) throw new HttpError("Account not found", 401);

  return {
    id: dbUser.id,
    role: dbUser.role as UserRole,
    name: dbUser.name,
    email: dbUser.email,
    image: dbUser.image,
  };
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUserFresh();
  if (user.role !== "ADMIN") throw new HttpError("Admin access required", 403);
  return user;
}

export async function requireInstructor(): Promise<SessionUser> {
  const user = await requireUserFresh();
  if (user.role !== "INSTRUCTOR") throw new HttpError("Instructor access required", 403);
  return user;
}

export async function requireAdminOrInstructor(): Promise<SessionUser> {
  const user = await requireUserFresh();
  if (user.role !== "ADMIN" && user.role !== "INSTRUCTOR") {
    throw new HttpError("Instructor access required", 403);
  }
  return user;
}

// Alias for backward compatibility - will be deprecated
export async function requireAdminOrScholar(): Promise<SessionUser> {
  return requireAdminOrInstructor();
}

/**
 * Ensure the user may manage a course (admin or author).
 */
export async function requireCourseOwner(courseId: string, user?: SessionUser) {
  const actor = user ?? (await requireUserFresh());
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      authorId: true,
      published: true,
      status: true,
      approvalStatus: true,
      title: true,
      slug: true,
    },
  });
  if (!course) throw new HttpError("Course not found", 404);
  if (actor.role !== "ADMIN" && course.authorId !== actor.id) {
    throw new HttpError("You do not have permission to manage this course", 403);
  }
  return { user: actor, course };
}

/** Optional session helper — returns null when unauthenticated. */
export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  return user?.id ? user : null;
}

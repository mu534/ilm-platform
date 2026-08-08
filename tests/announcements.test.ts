/**
 * Course announcements access control tests.
 * Mirrors the authorization logic in app/api/courses/[id]/announcements/route.ts
 */

import { describe, it, expect } from "vitest";

type Role = "ADMIN" | "SCHOLAR" | "USER";

interface Course { id: string; authorId: string }
interface User   { id: string; role: Role }

function canManageAnnouncement(user: User | null, course: Course): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "SCHOLAR" && course.authorId === user.id) return true;
  return false;
}

function canViewAnnouncements(
  user: User | null,
  course: Course,
  isEnrolled: boolean,
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "SCHOLAR" && course.authorId === user.id) return true;
  return isEnrolled;
}

function canViewUnpublishedAnnouncement(user: User | null, course: Course): boolean {
  if (!user) return false;
  return user.role === "ADMIN" || course.authorId === user.id;
}

describe("course announcement — creation access", () => {
  const course    = { id: "course-1", authorId: "scholar-1" };
  const owner     = { id: "scholar-1", role: "SCHOLAR" as Role };
  const otherScholar = { id: "scholar-2", role: "SCHOLAR" as Role };
  const admin     = { id: "admin-1", role: "ADMIN" as Role };
  const student   = { id: "student-1", role: "USER" as Role };

  it("allows course owner to create announcement", () => {
    expect(canManageAnnouncement(owner, course)).toBe(true);
  });

  it("allows admin to create announcement", () => {
    expect(canManageAnnouncement(admin, course)).toBe(true);
  });

  it("prevents other scholars from creating announcements", () => {
    expect(canManageAnnouncement(otherScholar, course)).toBe(false);
  });

  it("prevents students from creating announcements", () => {
    expect(canManageAnnouncement(student, course)).toBe(false);
  });

  it("prevents unauthenticated users from creating announcements", () => {
    expect(canManageAnnouncement(null, course)).toBe(false);
  });
});

describe("course announcement — viewing access", () => {
  const course         = { id: "course-1", authorId: "scholar-1" };
  const owner          = { id: "scholar-1", role: "SCHOLAR" as Role };
  const admin          = { id: "admin-1", role: "ADMIN" as Role };
  const enrolledStudent   = { id: "student-1", role: "USER" as Role };
  const unenrolledStudent = { id: "student-2", role: "USER" as Role };

  it("allows enrolled students to view published announcements", () => {
    expect(canViewAnnouncements(enrolledStudent, course, true)).toBe(true);
  });

  it("prevents unenrolled students from viewing announcements", () => {
    expect(canViewAnnouncements(unenrolledStudent, course, false)).toBe(false);
  });

  it("allows course owner to view all announcements", () => {
    expect(canViewAnnouncements(owner, course, false)).toBe(true);
  });

  it("allows admin to view all announcements", () => {
    expect(canViewAnnouncements(admin, course, false)).toBe(true);
  });

  it("prevents unauthenticated users from viewing announcements", () => {
    expect(canViewAnnouncements(null, course, false)).toBe(false);
  });
});

describe("course announcement — unpublished visibility", () => {
  const course  = { id: "course-1", authorId: "scholar-1" };
  const owner   = { id: "scholar-1", role: "SCHOLAR" as Role };
  const admin   = { id: "admin-1", role: "ADMIN" as Role };
  const student = { id: "student-1", role: "USER" as Role };

  it("owner can see unpublished drafts", () => {
    expect(canViewUnpublishedAnnouncement(owner, course)).toBe(true);
  });

  it("admin can see unpublished drafts", () => {
    expect(canViewUnpublishedAnnouncement(admin, course)).toBe(true);
  });

  it("enrolled students cannot see unpublished announcements", () => {
    expect(canViewUnpublishedAnnouncement(student, course)).toBe(false);
  });
});

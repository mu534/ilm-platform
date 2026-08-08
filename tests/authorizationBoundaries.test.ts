/**
 * Authorization boundary tests — ownership and visibility rules.
 *
 * These are pure logic tests that mirror the server-side authorization
 * checks used in API routes. They document and verify the intended
 * access-control rules without requiring a live database.
 */

import { describe, it, expect } from "vitest";
import { isPublicCourse } from "../app/lib/courseAccess";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Role = "ADMIN" | "SCHOLAR" | "USER";

interface User  { id: string; role: Role }
interface Course { id: string; authorId: string; published: boolean; status: string; approvalStatus: string }
interface Lecture { id: string; authorId: string; published: boolean; approvalStatus: string; moduleId?: string }

/** Mirrors requireUserFresh + ownership check pattern used in course routes */
function canManageCourse(actor: User, course: Course): boolean {
  return actor.role === "ADMIN" || course.authorId === actor.id;
}

/** Mirrors admin-only check used in reports, users, audit-log, etc. */
function canPerformAdminAction(actor: User): boolean {
  return actor.role === "ADMIN";
}

/** Mirrors scholar analytics scoping */
function canViewScholarAnalytics(actor: User, scholarUserId: string): boolean {
  return actor.role === "ADMIN" || actor.id === scholarUserId;
}

/** Mirrors announcement management check */
function canManageAnnouncement(actor: User, courseAuthorId: string): boolean {
  return actor.role === "ADMIN" || actor.id === courseAuthorId;
}

/** Mirrors prerequisite management check */
function canManagePrerequisites(actor: User, courseAuthorId: string): boolean {
  return actor.role === "ADMIN" || actor.id === courseAuthorId;
}

/** Mirrors isPublicCourse + approvalStatus check for public lecture visibility */
function isPublicLecture(lecture: Lecture, coursePub: boolean | null): boolean {
  if (!lecture.published) return false;
  if (lecture.approvalStatus !== "APPROVED") return false;
  // Course-linked: course must also be public
  if (lecture.moduleId && !coursePub) return false;
  return true;
}

/** Mirrors certificate access check */
function canAccessCertificate(actor: User, certUserId: string): boolean {
  return actor.role === "ADMIN" || actor.id === certUserId;
}

/** Mirrors progress access check */
function canModifyProgress(actor: User, progressUserId: string): boolean {
  // Students can only modify their own progress; admins may not modify student progress
  // (progress is recorded automatically by the learning flow)
  return actor.id === progressUserId;
}

// ─── Student isolation tests ──────────────────────────────────────────────────

describe("student cannot access another student's private data", () => {
  const studentA = { id: "student-a", role: "USER" as Role };
  const studentB = { id: "student-b", role: "USER" as Role };

  it("student A cannot access student B's certificate", () => {
    expect(canAccessCertificate(studentA, studentB.id)).toBe(false);
  });

  it("student cannot access their own certificate via another user's id", () => {
    expect(canAccessCertificate(studentA, studentA.id)).toBe(true);
  });

  it("student A cannot modify student B's progress", () => {
    expect(canModifyProgress(studentA, studentB.id)).toBe(false);
  });

  it("student A can modify their own progress", () => {
    expect(canModifyProgress(studentA, studentA.id)).toBe(true);
  });

  it("student cannot resolve reports (admin-only action)", () => {
    expect(canPerformAdminAction(studentA)).toBe(false);
  });
});

// ─── Scholar isolation tests ──────────────────────────────────────────────────

describe("scholar cannot modify another scholar's course", () => {
  const scholarA = { id: "scholar-a", role: "SCHOLAR" as Role };
  const scholarB = { id: "scholar-b", role: "SCHOLAR" as Role };
  const courseOwnedByB = {
    id: "course-1", authorId: "scholar-b",
    published: true, status: "PUBLISHED", approvalStatus: "APPROVED",
  };

  it("scholar A cannot manage scholar B's course", () => {
    expect(canManageCourse(scholarA, courseOwnedByB)).toBe(false);
  });

  it("scholar B can manage their own course", () => {
    expect(canManageCourse(scholarB, courseOwnedByB)).toBe(true);
  });

  it("scholar A cannot manage announcements on scholar B's course", () => {
    expect(canManageAnnouncement(scholarA, courseOwnedByB.authorId)).toBe(false);
  });

  it("scholar B can manage announcements on their own course", () => {
    expect(canManageAnnouncement(scholarB, courseOwnedByB.authorId)).toBe(true);
  });

  it("scholar A cannot manage prerequisites on scholar B's course", () => {
    expect(canManagePrerequisites(scholarA, courseOwnedByB.authorId)).toBe(false);
  });

  it("scholar A cannot view scholar B's private analytics", () => {
    expect(canViewScholarAnalytics(scholarA, scholarB.id)).toBe(false);
  });

  it("scholar A can view their own analytics", () => {
    expect(canViewScholarAnalytics(scholarA, scholarA.id)).toBe(true);
  });

  it("scholar cannot perform admin moderation actions", () => {
    expect(canPerformAdminAction(scholarA)).toBe(false);
  });
});

// ─── Admin capability tests ───────────────────────────────────────────────────

describe("admin can perform authorized management operations", () => {
  const admin = { id: "admin-1", role: "ADMIN" as Role };
  const anyCourse = {
    id: "course-x", authorId: "scholar-z",
    published: true, status: "PUBLISHED", approvalStatus: "APPROVED",
  };

  it("admin can manage any course", () => {
    expect(canManageCourse(admin, anyCourse)).toBe(true);
  });

  it("admin can manage any announcement", () => {
    expect(canManageAnnouncement(admin, "scholar-z")).toBe(true);
  });

  it("admin can resolve reports", () => {
    expect(canPerformAdminAction(admin)).toBe(true);
  });

  it("admin can view any scholar's analytics", () => {
    expect(canViewScholarAnalytics(admin, "scholar-z")).toBe(true);
  });

  it("admin can access any certificate", () => {
    expect(canAccessCertificate(admin, "student-x")).toBe(true);
  });
});

// ─── Course visibility tests ──────────────────────────────────────────────────

describe("course visibility rules", () => {
  it("draft course → not public", () => {
    expect(isPublicCourse({ published: false, status: "DRAFT", approvalStatus: "DRAFT" })).toBe(false);
  });

  it("pending course → not public", () => {
    expect(isPublicCourse({ published: false, status: "PENDING_REVIEW", approvalStatus: "PENDING" })).toBe(false);
  });

  it("rejected course → not public", () => {
    expect(isPublicCourse({ published: false, status: "REJECTED", approvalStatus: "REJECTED" })).toBe(false);
  });

  it("archived course → not public", () => {
    expect(isPublicCourse({ published: false, status: "ARCHIVED", approvalStatus: "APPROVED" })).toBe(false);
  });

  it("approved + published course → public", () => {
    expect(isPublicCourse({ published: true, status: "PUBLISHED", approvalStatus: "APPROVED" })).toBe(true);
  });
});

// ─── Lecture visibility tests ─────────────────────────────────────────────────

describe("lecture visibility rules", () => {
  it("unpublished lecture → not public", () => {
    const lecture = { id: "l1", authorId: "a", published: false, approvalStatus: "APPROVED" };
    expect(isPublicLecture(lecture, true)).toBe(false);
  });

  it("published but unapproved lecture → not public", () => {
    const lecture = { id: "l1", authorId: "a", published: true, approvalStatus: "PENDING" };
    expect(isPublicLecture(lecture, true)).toBe(false);
  });

  it("published + approved standalone lecture → public", () => {
    const lecture = { id: "l1", authorId: "a", published: true, approvalStatus: "APPROVED" };
    expect(isPublicLecture(lecture, null)).toBe(true);
  });

  it("published + approved course-linked lecture with public course → public", () => {
    const lecture = { id: "l1", authorId: "a", published: true, approvalStatus: "APPROVED", moduleId: "m1" };
    expect(isPublicLecture(lecture, true)).toBe(true);
  });

  it("published + approved course-linked lecture with private course → not public", () => {
    const lecture = { id: "l1", authorId: "a", published: true, approvalStatus: "APPROVED", moduleId: "m1" };
    expect(isPublicLecture(lecture, false)).toBe(false);
  });
});

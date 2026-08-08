/**
 * Moderation system tests — report business rules.
 * Mirrors the access-control logic in app/api/reports/route.ts
 */

import { describe, it, expect } from "vitest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Role = "ADMIN" | "SCHOLAR" | "USER";

function canSubmitReport(user: { id: string; role: Role } | null): boolean {
  return user !== null; // any authenticated user can report
}

function canResolveReport(user: { id: string; role: Role } | null): boolean {
  return user?.role === "ADMIN";
}

function canViewAllReports(user: { id: string; role: Role } | null): boolean {
  return user?.role === "ADMIN";
}

function validateReportTargets(data: {
  commentId?: string;
  forumQuestionId?: string;
  forumReplyId?: string;
  courseId?: string;
}): { valid: boolean; error?: string } {
  const targets = [data.commentId, data.forumQuestionId, data.forumReplyId, data.courseId].filter(Boolean);
  if (targets.length === 0) return { valid: false, error: "A report target is required" };
  if (targets.length > 1)   return { valid: false, error: "Only one report target may be provided" };
  return { valid: true };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("report submission access control", () => {
  const normalUser  = { id: "u1", role: "USER" as Role };
  const scholarUser = { id: "u2", role: "SCHOLAR" as Role };
  const adminUser   = { id: "u3", role: "ADMIN" as Role };

  it("allows any authenticated user to submit a report", () => {
    expect(canSubmitReport(normalUser)).toBe(true);
    expect(canSubmitReport(scholarUser)).toBe(true);
    expect(canSubmitReport(adminUser)).toBe(true);
  });

  it("blocks unauthenticated users from submitting a report", () => {
    expect(canSubmitReport(null)).toBe(false);
  });
});

describe("report target validation", () => {
  it("requires exactly one target", () => {
    expect(validateReportTargets({ commentId: "c1" }).valid).toBe(true);
    expect(validateReportTargets({ forumQuestionId: "q1" }).valid).toBe(true);
    expect(validateReportTargets({ forumReplyId: "r1" }).valid).toBe(true);
    expect(validateReportTargets({ courseId: "course1" }).valid).toBe(true);
  });

  it("rejects reports with no target", () => {
    const result = validateReportTargets({});
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/target/i);
  });

  it("rejects reports with multiple targets", () => {
    const result = validateReportTargets({ commentId: "c1", courseId: "course1" });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/one/i);
  });
});

describe("report resolution access control", () => {
  const normalUser = { id: "u1", role: "USER" as Role };
  const admin      = { id: "u3", role: "ADMIN" as Role };

  it("allows admin to resolve reports", () => {
    expect(canResolveReport(admin)).toBe(true);
  });

  it("prevents normal users from resolving reports", () => {
    expect(canResolveReport(normalUser)).toBe(false);
  });

  it("prevents unauthenticated requests from resolving reports", () => {
    expect(canResolveReport(null)).toBe(false);
  });
});

describe("report listing access control", () => {
  it("only admins can view all reports", () => {
    expect(canViewAllReports({ id: "a", role: "ADMIN" })).toBe(true);
    expect(canViewAllReports({ id: "u", role: "USER" })).toBe(false);
    expect(canViewAllReports({ id: "s", role: "SCHOLAR" })).toBe(false);
    expect(canViewAllReports(null)).toBe(false);
  });
});

/**
 * Progress calculation tests.
 * Mirrors the server-side recalculateCourseProgress logic in app/api/progress/route.ts
 */

import { describe, it, expect } from "vitest";

function calculateProgressPercent(
  completedIds: string[],
  allLectureIds: string[],
): number {
  if (allLectureIds.length === 0) return 0;
  const completedSet  = new Set(completedIds);
  const completedCount = allLectureIds.filter((id) => completedSet.has(id)).length;
  return Math.round((completedCount / allLectureIds.length) * 100);
}

describe("course progress calculation", () => {
  const lectures = ["l1", "l2", "l3", "l4"];

  it("returns 0% when nothing completed", () => {
    expect(calculateProgressPercent([], lectures)).toBe(0);
  });

  it("returns 25% for 1 of 4 lectures", () => {
    expect(calculateProgressPercent(["l1"], lectures)).toBe(25);
  });

  it("returns 50% for 2 of 4", () => {
    expect(calculateProgressPercent(["l1", "l2"], lectures)).toBe(50);
  });

  it("returns 75% for 3 of 4", () => {
    expect(calculateProgressPercent(["l1", "l2", "l3"], lectures)).toBe(75);
  });

  it("returns 100% for all 4", () => {
    expect(calculateProgressPercent(lectures, lectures)).toBe(100);
  });

  it("handles empty course gracefully", () => {
    expect(calculateProgressPercent([], [])).toBe(0);
  });

  it("ignores extra completed IDs not in this course", () => {
    // Completed IDs from another course should not inflate progress
    expect(calculateProgressPercent(["l1", "other-course-lecture"], lectures)).toBe(25);
  });
});

describe("progress-based certificate eligibility trigger", () => {
  function shouldAttemptCertificate(percent: number): boolean {
    return percent >= 100;
  }

  it("triggers certificate attempt at exactly 100%", () => {
    expect(shouldAttemptCertificate(100)).toBe(true);
  });

  it("does not trigger at 99%", () => {
    expect(shouldAttemptCertificate(99)).toBe(false);
  });

  it("does not trigger at 0%", () => {
    expect(shouldAttemptCertificate(0)).toBe(false);
  });
});

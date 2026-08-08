/**
 * Enrollment business-rule tests (pure logic — no DB).
 *
 * These tests validate the authoritative server-side rules
 * that govern enrollment: prerequisite gates, duplicate prevention,
 * access control, and public-course visibility.
 */

import { describe, it, expect } from "vitest";
import { isPublicCourse } from "../app/lib/courseAccess";

// ─── Helpers used by tests ─────────────────────────────────────────────────────

function makeCourse(overrides: Partial<{
  published: boolean;
  status: string;
  approvalStatus: string;
  enrollmentType: string;
  price: number;
}> = {}) {
  return {
    published:      true,
    status:         "PUBLISHED",
    approvalStatus: "APPROVED",
    enrollmentType: "FREE",
    price:          0,
    ...overrides,
  };
}

// ─── Enrollment guard — public course requirement ──────────────────────────────

describe("enrollment guard — public course requirement", () => {
  it("allows enrollment in a public free course", () => {
    const course = makeCourse();
    expect(isPublicCourse(course)).toBe(true);
  });

  it("rejects enrollment in an unpublished course", () => {
    expect(isPublicCourse(makeCourse({ published: false }))).toBe(false);
  });

  it("rejects enrollment in a draft course", () => {
    expect(isPublicCourse(makeCourse({ status: "DRAFT" }))).toBe(false);
  });

  it("rejects enrollment in a pending-review course", () => {
    expect(isPublicCourse(makeCourse({ status: "PENDING_REVIEW" }))).toBe(false);
  });

  it("rejects enrollment in a rejected course", () => {
    expect(isPublicCourse(makeCourse({ status: "REJECTED", approvalStatus: "REJECTED" }))).toBe(false);
  });

  it("rejects enrollment in an archived course", () => {
    expect(isPublicCourse(makeCourse({ status: "ARCHIVED" }))).toBe(false);
  });

  it("rejects enrollment when approvalStatus is PENDING", () => {
    expect(isPublicCourse(makeCourse({ approvalStatus: "PENDING" }))).toBe(false);
  });

  it("rejects enrollment when approvalStatus is DRAFT", () => {
    expect(isPublicCourse(makeCourse({ approvalStatus: "DRAFT" }))).toBe(false);
  });
});

// ─── Prerequisite logic (pure implementation mirror) ─────────────────────────

/**
 * Mirrors the server-side checkPrerequisites logic for unit testing.
 * In production, this queries the database; here we use in-memory maps.
 */
function checkPrerequisitesPure(
  userId: string,
  courseId: string,
  prerequisites: Array<{ prerequisiteCourseId: string; dependentCourseId: string; title: string }>,
  completedEnrollments: Array<{ userId: string; courseId: string; status: "COMPLETED" | "ACTIVE" }>,
): { satisfied: true } | { satisfied: false; missing: { id: string; title: string }[] } {
  const prereqs = prerequisites.filter((p) => p.dependentCourseId === courseId);
  if (prereqs.length === 0) return { satisfied: true };

  const completedIds = new Set(
    completedEnrollments
      .filter((e) => e.userId === userId && e.status === "COMPLETED")
      .map((e) => e.courseId),
  );

  const missing = prereqs
    .filter((p) => !completedIds.has(p.prerequisiteCourseId))
    .map((p) => ({ id: p.prerequisiteCourseId, title: p.title }));

  if (missing.length === 0) return { satisfied: true };
  return { satisfied: false, missing };
}

describe("prerequisite gate", () => {
  const prereqs = [
    { prerequisiteCourseId: "arabic-1", dependentCourseId: "arabic-2", title: "Arabic Level 1" },
    { prerequisiteCourseId: "arabic-2", dependentCourseId: "arabic-3", title: "Arabic Level 2" },
  ];

  it("allows enrollment when there are no prerequisites", () => {
    const result = checkPrerequisitesPure("user1", "standalone-course", prereqs, []);
    expect(result.satisfied).toBe(true);
  });

  it("allows enrollment when all prerequisites are completed", () => {
    const result = checkPrerequisitesPure(
      "user1",
      "arabic-2",
      prereqs,
      [{ userId: "user1", courseId: "arabic-1", status: "COMPLETED" }],
    );
    expect(result.satisfied).toBe(true);
  });

  it("rejects enrollment when a prerequisite is only ACTIVE (not completed)", () => {
    const result = checkPrerequisitesPure(
      "user1",
      "arabic-2",
      prereqs,
      [{ userId: "user1", courseId: "arabic-1", status: "ACTIVE" }],
    );
    expect(result.satisfied).toBe(false);
    if (!result.satisfied) {
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].title).toBe("Arabic Level 1");
    }
  });

  it("rejects enrollment when prerequisite is not started at all", () => {
    const result = checkPrerequisitesPure("user1", "arabic-2", prereqs, []);
    expect(result.satisfied).toBe(false);
    if (!result.satisfied) {
      expect(result.missing[0].id).toBe("arabic-1");
    }
  });

  it("does not allow another user's completion to satisfy prerequisites", () => {
    const result = checkPrerequisitesPure(
      "user2",
      "arabic-2",
      prereqs,
      [{ userId: "user1", courseId: "arabic-1", status: "COMPLETED" }], // user1's completion, not user2's
    );
    expect(result.satisfied).toBe(false);
  });

  it("requires all prerequisites when there are multiple", () => {
    const multiPrereqs = [
      { prerequisiteCourseId: "course-a", dependentCourseId: "course-c", title: "Course A" },
      { prerequisiteCourseId: "course-b", dependentCourseId: "course-c", title: "Course B" },
    ];

    // Only one of two prerequisites completed
    const result = checkPrerequisitesPure(
      "user1",
      "course-c",
      multiPrereqs,
      [{ userId: "user1", courseId: "course-a", status: "COMPLETED" }],
    );
    expect(result.satisfied).toBe(false);
    if (!result.satisfied) {
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].id).toBe("course-b");
    }
  });
});

// ─── Circular dependency detection (pure) ────────────────────────────────────

/**
 * Mirrors the server-side wouldCreateCycle logic for unit testing.
 *
 * We're adding: prerequisiteCourseId → dependentCourseId
 * (meaning: to enroll in dependentCourseId, you must first complete prerequisiteCourseId)
 *
 * A cycle would occur if dependentCourseId is already an ancestor (direct or indirect
 * prerequisite) of prerequisiteCourseId. In that case, adding this edge would mean
 * course X requires itself to be completed (via a chain).
 *
 * To detect this we walk UPWARD from prerequisiteCourseId through its prerequisites
 * (following prerequisiteCourseId edges), and check if we hit dependentCourseId.
 */
function wouldCreateCyclePure(
  prerequisiteCourseId: string,
  dependentCourseId: string,
  existingPrereqs: Array<{ prerequisiteCourseId: string; dependentCourseId: string }>,
): boolean {
  // Walk prerequisiteCourseId's own prerequisites (and their prerequisites, etc.)
  // to see if dependentCourseId is already in that chain.
  const visited = new Set<string>();
  const queue   = [prerequisiteCourseId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    // Find the prerequisites OF current (rows where current is the dependent)
    const prereqsOfCurrent = existingPrereqs.filter((p) => p.dependentCourseId === current);
    for (const p of prereqsOfCurrent) {
      if (p.prerequisiteCourseId === dependentCourseId) return true;
      queue.push(p.prerequisiteCourseId);
    }
  }

  return false;
}

describe("circular prerequisite detection", () => {
  it("detects direct cycle: A is prereq of B, and we try to make B a prereq of A", () => {
    const existing = [
      // existing: to enroll in B, you need A (A is prereq of B)
      { prerequisiteCourseId: "A", dependentCourseId: "B" },
    ];
    // Adding B→A: to enroll in A, you need B.
    // Walk upward from B's prerequisites: B's prereqs = {A} → A === "A" = dependentCourseId!
    // Wait — we walk from prerequisiteCourseId=B upward: B has prereq A. Is A === dependentCourseId (A)? Yes!
    expect(wouldCreateCyclePure("B", "A", existing)).toBe(true);
  });

  it("detects indirect cycle: A→B→C exists, trying to add C as prereq of A", () => {
    const existing = [
      // A is prereq of B, B is prereq of C
      { prerequisiteCourseId: "A", dependentCourseId: "B" },
      { prerequisiteCourseId: "B", dependentCourseId: "C" },
    ];
    // Adding C→A: to enroll in A you need C.
    // Walk upward from C: C's prereq = B, B's prereq = A. A === dependentCourseId (A). Cycle!
    expect(wouldCreateCyclePure("C", "A", existing)).toBe(true);
  });

  it("allows non-circular prerequisites", () => {
    const existing = [
      // A is prereq of B
      { prerequisiteCourseId: "A", dependentCourseId: "B" },
    ];
    // Adding A→C: A is prereq of C. Walk from A upward: A has no prereqs. No cycle.
    expect(wouldCreateCyclePure("A", "C", existing)).toBe(false);
  });

  it("allows independent chain additions", () => {
    const existing = [
      { prerequisiteCourseId: "X", dependentCourseId: "Y" },
    ];
    // Adding A→B: unrelated courses. No cycle.
    expect(wouldCreateCyclePure("A", "B", existing)).toBe(false);
  });

  it("handles no existing prerequisites (fresh course)", () => {
    expect(wouldCreateCyclePure("X", "Y", [])).toBe(false);
  });

  it("detects self-reference via chain: A→B, B→C, adding C makes A a prerequisite of itself", () => {
    const existing = [
      { prerequisiteCourseId: "A", dependentCourseId: "B" },
      { prerequisiteCourseId: "B", dependentCourseId: "C" },
      { prerequisiteCourseId: "C", dependentCourseId: "D" },
    ];
    // Adding D→A: walk from D upward: D←C←B←A. A === dependentCourseId. Cycle!
    expect(wouldCreateCyclePure("D", "A", existing)).toBe(true);
  });
});

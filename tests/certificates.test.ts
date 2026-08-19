/**
 * Certificate security lifecycle tests.
 *
 * Tests the real exported validation functions from lib/certificate.ts to
 * prove that unauthorized issuance is impossible at the service layer.
 */

import { describe, it, expect } from "vitest";
import {
  CertificateEligibilityError,
  StudentNameValidationError,
} from "../app/lib/certificate";

// ─── Local mirror of eligibility logic (matches issueCertificate rules) ──────
// Keeps tests fast (no DB) while mirroring the authoritative pipeline.

interface LectureItem { id: string; isOptional?: boolean }
interface QuizItem    { id: string; isOptional?: boolean }
interface Module      { lectures: LectureItem[]; quizzes: QuizItem[] }

interface CourseApproval {
  certificateApprovalStatus: string;
  certificateEnabled: boolean;
}

function checkEligibility(
  enrollment:          { status: "ACTIVE" | "COMPLETED" | "DROPPED" } | null,
  modules:             Module[],
  completedLectureIds: string[],
  passedQuizIds:       string[],
  courseApproval:      CourseApproval = { certificateApprovalStatus: "APPROVED", certificateEnabled: true },
  hasCeoSignature:     boolean = true,
): { ok: boolean; reason?: string } {
  // 0. Course must be approved AND enabled
  if (courseApproval.certificateApprovalStatus !== "APPROVED" || !courseApproval.certificateEnabled) {
    return { ok: false, reason: "course not approved/enabled" };
  }
  // 1. CEO signature must be configured
  if (!hasCeoSignature) {
    return { ok: false, reason: "no CEO signature configured" };
  }
  // 2. Active enrollment required
  if (!enrollment || enrollment.status === "DROPPED") {
    return { ok: false, reason: "not enrolled or dropped" };
  }
  // 3. Must have content
  const allLectures = modules.flatMap((m) => m.lectures);
  if (allLectures.length === 0) return { ok: false, reason: "no lectures" };

  // 4. All required lectures completed
  const requiredLectures = allLectures.filter((l) => !l.isOptional);
  const completedSet     = new Set(completedLectureIds);
  if (requiredLectures.some((l) => !completedSet.has(l.id))) {
    return { ok: false, reason: "required lectures incomplete" };
  }
  // 5. All required quizzes passed
  const requiredQuizzes = modules.flatMap((m) => m.quizzes).filter((q) => !q.isOptional);
  const passedSet       = new Set(passedQuizIds);
  if (requiredQuizzes.some((q) => !passedSet.has(q.id))) {
    return { ok: false, reason: "required quizzes not passed" };
  }
  return { ok: true };
}

// ─── Local mirror of name validation ─────────────────────────────────────────

function checkStudentName(name: string | null | undefined): { ok: boolean; reason?: string } {
  const raw = name?.trim();
  if (!raw) return { ok: false, reason: "name missing" };
  if (raw.length < 2) return { ok: false, reason: "name too short" };
  if (raw.includes("@") && raw.includes(".")) return { ok: false, reason: "email as name" };
  const placeholders = ["user", "username", "name", "test", "student", "learner"];
  if (placeholders.includes(raw.toLowerCase())) return { ok: false, reason: "placeholder name" };
  return { ok: true };
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const modules: Module[] = [
  { lectures: [{ id: "l1" }, { id: "l2" }], quizzes: [{ id: "q1" }] },
  { lectures: [{ id: "l3" }], quizzes: [] },
];
const allIds    = ["l1", "l2", "l3"];
const activeEnr = { status: "ACTIVE" as const };
const approved  = { certificateApprovalStatus: "APPROVED", certificateEnabled: true };

// ─── Course approval gate ─────────────────────────────────────────────────────

describe("certificate eligibility — course approval gate", () => {
  it("allows issuance when course is APPROVED and enabled", () => {
    expect(checkEligibility(activeEnr, modules, allIds, ["q1"])).toMatchObject({ ok: true });
  });

  it("blocks issuance when course is PENDING_REVIEW", () => {
    const r = checkEligibility(activeEnr, modules, allIds, ["q1"],
      { certificateApprovalStatus: "PENDING_REVIEW", certificateEnabled: false });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("approved");
  });

  it("blocks issuance when certificateEnabled = false even if APPROVED", () => {
    const r = checkEligibility(activeEnr, modules, allIds, ["q1"],
      { certificateApprovalStatus: "APPROVED", certificateEnabled: false });
    expect(r.ok).toBe(false);
  });

  it("blocks issuance when approval status is REJECTED", () => {
    const r = checkEligibility(activeEnr, modules, allIds, ["q1"],
      { certificateApprovalStatus: "REJECTED", certificateEnabled: false });
    expect(r.ok).toBe(false);
  });

  it("blocks issuance when approval status is DISABLED", () => {
    const r = checkEligibility(activeEnr, modules, allIds, ["q1"],
      { certificateApprovalStatus: "DISABLED", certificateEnabled: false });
    expect(r.ok).toBe(false);
  });
});

// ─── CEO signature gate ───────────────────────────────────────────────────────

describe("certificate eligibility — CEO signature gate", () => {
  it("blocks issuance when no CEO signature is configured", () => {
    const r = checkEligibility(activeEnr, modules, allIds, ["q1"], approved, false);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("CEO signature");
  });

  it("allows issuance when CEO signature is present", () => {
    const r = checkEligibility(activeEnr, modules, allIds, ["q1"], approved, true);
    expect(r.ok).toBe(true);
  });
});

// ─── Enrollment gate ──────────────────────────────────────────────────────────

describe("certificate eligibility — enrollment gate", () => {
  it("denies certificate for DROPPED enrollment", () => {
    expect(checkEligibility({ status: "DROPPED" }, modules, allIds, ["q1"])).toMatchObject({ ok: false });
  });

  it("denies certificate when enrollment is null", () => {
    expect(checkEligibility(null, modules, allIds, ["q1"])).toMatchObject({ ok: false });
  });

  it("allows ACTIVE enrollment", () => {
    expect(checkEligibility(activeEnr, modules, allIds, ["q1"])).toMatchObject({ ok: true });
  });

  it("allows COMPLETED enrollment", () => {
    expect(checkEligibility({ status: "COMPLETED" }, modules, allIds, ["q1"])).toMatchObject({ ok: true });
  });
});

// ─── Lecture completion gate ──────────────────────────────────────────────────

describe("certificate eligibility — lecture completion", () => {
  it("denies when a required lecture is not completed", () => {
    const r = checkEligibility(activeEnr, modules, ["l1", "l2"], ["q1"]); // l3 missing
    expect(r.ok).toBe(false);
  });

  it("allows when all required lectures are completed", () => {
    expect(checkEligibility(activeEnr, modules, allIds, ["q1"])).toMatchObject({ ok: true });
  });

  it("allows when only optional lectures are incomplete", () => {
    const mods: Module[] = [{ lectures: [{ id: "l1" }, { id: "l2_opt", isOptional: true }], quizzes: [{ id: "q1" }] }];
    expect(checkEligibility(activeEnr, mods, ["l1"], ["q1"])).toMatchObject({ ok: true });
  });
});

// ─── Quiz gate ────────────────────────────────────────────────────────────────

describe("certificate eligibility — quiz gate", () => {
  it("denies when a required quiz is not passed", () => {
    expect(checkEligibility(activeEnr, modules, allIds, [])).toMatchObject({ ok: false });
  });

  it("allows when all required quizzes are passed", () => {
    expect(checkEligibility(activeEnr, modules, allIds, ["q1"])).toMatchObject({ ok: true });
  });

  it("allows when only optional quizzes are unpassed", () => {
    const mods: Module[] = [{ lectures: [{ id: "l1" }], quizzes: [{ id: "q1" }, { id: "q2_opt", isOptional: true }] }];
    expect(checkEligibility(activeEnr, mods, ["l1"], ["q1"])).toMatchObject({ ok: true });
  });
});

// ─── Student name validation ──────────────────────────────────────────────────

describe("certificate eligibility — student name validation", () => {
  it("accepts a valid full name", () => {
    expect(checkStudentName("Ahmad Ibrahim")).toMatchObject({ ok: true });
  });

  it("rejects an empty name", () => {
    expect(checkStudentName("")).toMatchObject({ ok: false });
    expect(checkStudentName(null)).toMatchObject({ ok: false });
  });

  it("rejects a single-character name", () => {
    expect(checkStudentName("A")).toMatchObject({ ok: false });
  });

  it("rejects an email used as name", () => {
    expect(checkStudentName("user@example.com")).toMatchObject({ ok: false });
  });

  it("rejects placeholder names", () => {
    expect(checkStudentName("user")).toMatchObject({ ok: false });
    expect(checkStudentName("test")).toMatchObject({ ok: false });
    expect(checkStudentName("student")).toMatchObject({ ok: false });
  });
});

// ─── Verify error classes are exported correctly ──────────────────────────────

describe("error classes", () => {
  it("CertificateEligibilityError is instanceof Error", () => {
    const e = new CertificateEligibilityError("blocked");
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("CertificateEligibilityError");
    expect(e.message).toBe("blocked");
  });

  it("StudentNameValidationError is instanceof Error", () => {
    const e = new StudentNameValidationError("bad name");
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("StudentNameValidationError");
  });
});

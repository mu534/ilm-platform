/**
 * Certificate eligibility tests — server-authoritative completion rules.
 *
 * The issueCertificate function in lib/certificate.ts is the
 * authoritative source. These tests verify pure eligibility logic including
 * approval gates and optional content handling.
 */

import { describe, it, expect } from "vitest";

interface LectureItem { id: string; isOptional?: boolean }
interface QuizItem    { id: string; isOptional?: boolean }
interface Module {
  lectures: LectureItem[];
  quizzes:  QuizItem[];
}

function checkCertificateEligibility(
  enrollment: { status: "ACTIVE" | "COMPLETED" | "DROPPED" } | null,
  modules:    Module[],
  completedLectureIds: string[],
  passedQuizIds:       string[],
  courseApproval:      { certificateApprovalStatus: string; certificateEnabled: boolean } = {
    certificateApprovalStatus: "APPROVED",
    certificateEnabled: true,
  }
): boolean {
  // 0. Must be approved and enabled
  if (courseApproval.certificateApprovalStatus !== "APPROVED" || !courseApproval.certificateEnabled) {
    return false;
  }

  // 1. Must have non-dropped enrollment
  if (!enrollment || enrollment.status === "DROPPED") return false;

  // Filter required content
  const requiredLectures = modules.flatMap((m) => m.lectures).filter((l) => !l.isOptional);
  const requiredQuizzes  = modules.flatMap((m) => m.quizzes).filter((q) => !q.isOptional);

  // 2. Must have at least one required lecture or course content
  const allLectures = modules.flatMap((m) => m.lectures);
  if (allLectures.length === 0) return false;

  // 3. All required lectures must be completed
  const completedSet = new Set(completedLectureIds);
  const completedCount = requiredLectures.filter((l) => completedSet.has(l.id)).length;
  if (completedCount < requiredLectures.length) return false;

  // 4. All required quizzes must have a passing attempt
  if (requiredQuizzes.length > 0) {
    const passedSet = new Set(passedQuizIds);
    const passedCount = requiredQuizzes.filter((q) => passedSet.has(q.id)).length;
    if (passedCount < requiredQuizzes.length) return false;
  }

  return true;
}

describe("certificate eligibility", () => {
  const modules: Module[] = [
    {
      lectures: [{ id: "l1" }, { id: "l2" }],
      quizzes:  [{ id: "q1" }],
    },
    {
      lectures: [{ id: "l3" }],
      quizzes:  [],
    },
  ];

  const allLectureIds = ["l1", "l2", "l3"];
  const activeEnrollment = { status: "ACTIVE" as const };

  it("issues certificate when all required lectures completed and required quiz passed", () => {
    expect(checkCertificateEligibility(
      activeEnrollment,
      modules,
      allLectureIds,
      ["q1"],
    )).toBe(true);
  });

  it("denies certificate if course is not approved", () => {
    expect(checkCertificateEligibility(
      activeEnrollment,
      modules,
      allLectureIds,
      ["q1"],
      { certificateApprovalStatus: "PENDING_REVIEW", certificateEnabled: false }
    )).toBe(false);
  });

  it("denies certificate if course is disabled", () => {
    expect(checkCertificateEligibility(
      activeEnrollment,
      modules,
      allLectureIds,
      ["q1"],
      { certificateApprovalStatus: "DISABLED", certificateEnabled: false }
    )).toBe(false);
  });

  it("allows certificate issuance when optional lectures are uncompleted", () => {
    const modulesWithOptional: Module[] = [
      {
        lectures: [{ id: "l1" }, { id: "l2_opt", isOptional: true }],
        quizzes:  [{ id: "q1" }],
      },
    ];
    expect(checkCertificateEligibility(
      activeEnrollment,
      modulesWithOptional,
      ["l1"], // l2_opt not completed
      ["q1"],
    )).toBe(true);
  });

  it("allows certificate issuance when optional quizzes are unpassed", () => {
    const modulesWithOptionalQuiz: Module[] = [
      {
        lectures: [{ id: "l1" }],
        quizzes:  [{ id: "q1" }, { id: "q2_opt", isOptional: true }],
      },
    ];
    expect(checkCertificateEligibility(
      activeEnrollment,
      modulesWithOptionalQuiz,
      ["l1"],
      ["q1"], // q2_opt not passed
    )).toBe(true);
  });

  it("denies certificate for DROPPED enrollment", () => {
    expect(checkCertificateEligibility(
      { status: "DROPPED" },
      modules,
      allLectureIds,
      ["q1"],
    )).toBe(false);
  });

  it("denies certificate when enrollment is null", () => {
    expect(checkCertificateEligibility(null, modules, allLectureIds, ["q1"])).toBe(false);
  });

  it("denies certificate when not all required lectures are completed", () => {
    expect(checkCertificateEligibility(
      activeEnrollment,
      modules,
      ["l1", "l2"], // l3 missing
      ["q1"],
    )).toBe(false);
  });

  it("denies certificate when required quiz is not passed", () => {
    expect(checkCertificateEligibility(
      activeEnrollment,
      modules,
      allLectureIds,
      [], // no passed quizzes
    )).toBe(false);
  });
});

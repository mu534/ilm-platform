import { describe, it, expect } from "vitest";
import { isPublicCourse, publicCourseWhere, getTrustedAppUrl } from "../app/lib/courseAccess";
import { HttpError } from "../app/lib/httpError";
import { isLectureLocked } from "../app/lib/sequentialLearning";

describe("isPublicCourse", () => {
  it("requires published + PUBLISHED + APPROVED", () => {
    expect(
      isPublicCourse({
        published: true,
        status: "PUBLISHED",
        approvalStatus: "APPROVED",
      }),
    ).toBe(true);
  });

  it("rejects draft / pending / rejected / unpublished", () => {
    expect(
      isPublicCourse({
        published: true,
        status: "DRAFT",
        approvalStatus: "APPROVED",
      }),
    ).toBe(false);

    expect(
      isPublicCourse({
        published: true,
        status: "PUBLISHED",
        approvalStatus: "PENDING",
      }),
    ).toBe(false);

    expect(
      isPublicCourse({
        published: true,
        status: "PUBLISHED",
        approvalStatus: "REJECTED",
      }),
    ).toBe(false);

    expect(
      isPublicCourse({
        published: false,
        status: "PUBLISHED",
        approvalStatus: "APPROVED",
      }),
    ).toBe(false);

    expect(
      isPublicCourse({
        published: true,
        status: "ARCHIVED",
        approvalStatus: "APPROVED",
      }),
    ).toBe(false);
  });
});

describe("publicCourseWhere", () => {
  it("matches the canonical public predicate fields", () => {
    expect(publicCourseWhere).toEqual({
      published: true,
      status: "PUBLISHED",
      approvalStatus: "APPROVED",
    });
  });
});

describe("getTrustedAppUrl", () => {
  it("throws when no trusted URL is configured", () => {
    const prevNext = process.env.NEXTAUTH_URL;
    const prevApp = process.env.APP_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.APP_URL;
    expect(() => getTrustedAppUrl()).toThrow(HttpError);
    process.env.NEXTAUTH_URL = prevNext;
    process.env.APP_URL = prevApp;
  });

  it("strips trailing slash from NEXTAUTH_URL", () => {
    const prev = process.env.NEXTAUTH_URL;
    process.env.NEXTAUTH_URL = "https://example.com/";
    expect(getTrustedAppUrl()).toBe("https://example.com");
    process.env.NEXTAUTH_URL = prev;
  });
});

describe("server-side sequential progress gate", () => {
  const lectures = ["l1", "l2", "l3"];

  it("blocks completing a future lecture while previous are incomplete", () => {
    expect(isLectureLocked("l3", lectures, new Set(["l1"]), true)).toBe(true);
    expect(isLectureLocked("l2", lectures, new Set(["l1"]), true)).toBe(false);
  });

  it("allows the first lecture with no progress", () => {
    expect(isLectureLocked("l1", lectures, new Set(), true)).toBe(false);
  });
});

describe("quiz attempt scoring rules (pure)", () => {
  function grade(
    questions: { id: string; correctAnswer: string; points: number }[],
    answers: { questionId: string; answer: string }[],
    passingScore: number,
  ) {
    const seen = new Set<string>();
    for (const a of answers) {
      if (seen.has(a.questionId)) throw new Error("Duplicate question");
      seen.add(a.questionId);
    }

    const byId = new Map(questions.map((q) => [q.id, q]));
    for (const a of answers) {
      if (!byId.has(a.questionId)) throw new Error("Invalid question");
    }

    let earned = 0;
    const total = questions.reduce((s, q) => s + q.points, 0);
    for (const a of answers) {
      const q = byId.get(a.questionId)!;
      if (a.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        earned += q.points;
      }
    }
    const score = total > 0 ? (earned / total) * 100 : 0;
    return { earned, total, score, passed: score >= passingScore };
  }

  const questions = [
    { id: "q1", correctAnswer: "A", points: 1 },
    { id: "q2", correctAnswer: "B", points: 1 },
  ];

  it("calculates score exclusively from DB points/answers", () => {
    const result = grade(questions, [
      { questionId: "q1", answer: "A" },
      { questionId: "q2", answer: "wrong" },
    ], 50);
    expect(result.earned).toBe(1);
    expect(result.total).toBe(2);
    expect(result.score).toBe(50);
    expect(result.passed).toBe(true);
  });

  it("rejects duplicate question IDs", () => {
    expect(() =>
      grade(questions, [
        { questionId: "q1", answer: "A" },
        { questionId: "q1", answer: "A" },
      ], 50),
    ).toThrow("Duplicate question");
  });

  it("rejects answers for questions not in the quiz", () => {
    expect(() =>
      grade(questions, [{ questionId: "q99", answer: "A" }], 50),
    ).toThrow("Invalid question");
  });

  it("does not accept client-supplied scores — only answer content", () => {
    // Even if the client "wanted" 100, only correct answers count
    const result = grade(questions, [
      { questionId: "q1", answer: "wrong" },
      { questionId: "q2", answer: "wrong" },
    ], 70);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });
});

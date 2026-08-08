/**
 * Quiz system tests — server-authoritative grading rules.
 * All grading is pure logic, mirroring what the API route does.
 */

import { describe, it, expect } from "vitest";

// ─── Pure grading logic (mirrors app/api/quizzes/[id]/attempt/route.ts) ───────

interface GradedAnswer {
  questionId: string;
  answer:     string;
  isCorrect:  boolean;
}

interface GradeResult {
  gradedAnswers: GradedAnswer[];
  earnedPoints:  number;
  totalPoints:   number;
  score:         number;
  passed:        boolean;
}

function gradeQuiz(
  questions: Array<{ id: string; correctAnswer: string; points: number }>,
  answers:   Array<{ questionId: string; answer: string }>,
  passingScore: number,
): GradeResult {
  // 1. Reject duplicates
  const seen = new Set<string>();
  for (const a of answers) {
    if (seen.has(a.questionId)) throw new Error("Duplicate question submissions are not allowed");
    seen.add(a.questionId);
  }

  const questionById = new Map(questions.map((q) => [q.id, q]));

  // 2. Reject invalid question IDs
  for (const a of answers) {
    if (!questionById.has(a.questionId)) {
      throw new Error("One or more answers reference invalid questions");
    }
  }

  // 3. All questions must be answered
  if (answers.length !== questions.length) {
    throw new Error(`All ${questions.length} question(s) must be answered`);
  }

  // 4. Server-side grading
  let earnedPoints = 0;
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  const gradedAnswers = answers.map(({ questionId, answer }) => {
    const question = questionById.get(questionId)!;
    const isCorrect = answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    if (isCorrect) earnedPoints += question.points;
    return { questionId, answer, isCorrect };
  });

  const score  = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  const passed = score >= passingScore;

  return { gradedAnswers, earnedPoints, totalPoints, score, passed };
}

const questions = [
  { id: "q1", correctAnswer: "A", points: 1 },
  { id: "q2", correctAnswer: "B", points: 2 },
  { id: "q3", correctAnswer: "true", points: 1 },
];

describe("quiz grading — server-authoritative", () => {
  it("grades all correct answers", () => {
    const result = gradeQuiz(
      questions,
      [
        { questionId: "q1", answer: "A" },
        { questionId: "q2", answer: "B" },
        { questionId: "q3", answer: "true" },
      ],
      70,
    );
    expect(result.earnedPoints).toBe(4);
    expect(result.totalPoints).toBe(4);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("grades all wrong answers", () => {
    const result = gradeQuiz(
      questions,
      [
        { questionId: "q1", answer: "wrong" },
        { questionId: "q2", answer: "wrong" },
        { questionId: "q3", answer: "wrong" },
      ],
      70,
    );
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("grades partial correct answers correctly", () => {
    const result = gradeQuiz(
      questions,
      [
        { questionId: "q1", answer: "A" },    // 1 point
        { questionId: "q2", answer: "wrong" }, // 0
        { questionId: "q3", answer: "wrong" }, // 0
      ],
      70,
    );
    expect(result.earnedPoints).toBe(1);
    expect(result.totalPoints).toBe(4);
    expect(Math.round(result.score)).toBe(25);
    expect(result.passed).toBe(false);
  });

  it("is case-insensitive in answer comparison", () => {
    const result = gradeQuiz(
      [{ id: "q1", correctAnswer: "True", points: 1 }],
      [{ questionId: "q1", answer: "true" }],
      50,
    );
    expect(result.gradedAnswers[0].isCorrect).toBe(true);
  });

  it("trims whitespace from answers before comparison", () => {
    const result = gradeQuiz(
      [{ id: "q1", correctAnswer: "A", points: 1 }],
      [{ questionId: "q1", answer: "  A  " }],
      50,
    );
    expect(result.gradedAnswers[0].isCorrect).toBe(true);
  });
});

describe("quiz validation — invalid submissions", () => {
  it("rejects duplicate question IDs", () => {
    expect(() =>
      gradeQuiz(
        [{ id: "q1", correctAnswer: "A", points: 1 }],
        [
          { questionId: "q1", answer: "A" },
          { questionId: "q1", answer: "A" },
        ],
        70,
      ),
    ).toThrow("Duplicate question");
  });

  it("rejects answers for questions not in the quiz", () => {
    expect(() =>
      gradeQuiz(
        [{ id: "q1", correctAnswer: "A", points: 1 }],
        [{ questionId: "q99", answer: "A" }],
        70,
      ),
    ).toThrow("invalid questions");
  });

  it("rejects partial submission (not all questions answered)", () => {
    expect(() =>
      gradeQuiz(
        questions,
        [
          { questionId: "q1", answer: "A" },
          // q2 and q3 missing
        ],
        70,
      ),
    ).toThrow("All 3 question(s) must be answered");
  });

  it("rejects empty submission", () => {
    expect(() =>
      gradeQuiz(questions, [], 70),
    ).toThrow("All 3 question(s) must be answered");
  });

  it("client cannot inject score via answer manipulation — only correct answers count", () => {
    // Even submitting 3 "wrong" answers cannot produce a passing score
    const result = gradeQuiz(
      questions,
      [
        { questionId: "q1", answer: "wrong" },
        { questionId: "q2", answer: "wrong" },
        { questionId: "q3", answer: "wrong" },
      ],
      50,
    );
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("cannot submit answers for questions from a different quiz", () => {
    // Even knowing a valid question ID from another quiz, it must not pass
    expect(() =>
      gradeQuiz(
        questions, // only q1,q2,q3
        [
          { questionId: "q1", answer: "A" },
          { questionId: "q2", answer: "B" },
          { questionId: "other-quiz-question-id", answer: "A" }, // foreign question ID
        ],
        70,
      ),
    ).toThrow("invalid questions");
  });
});

describe("quiz passing score boundary", () => {
  const twoPointQuestions = [
    { id: "q1", correctAnswer: "A", points: 1 },
    { id: "q2", correctAnswer: "B", points: 1 },
  ];

  it("passes exactly at the passing score threshold", () => {
    // 1/2 = 50%
    const result = gradeQuiz(
      twoPointQuestions,
      [
        { questionId: "q1", answer: "A" },
        { questionId: "q2", answer: "wrong" },
      ],
      50, // exactly 50%
    );
    expect(result.score).toBe(50);
    expect(result.passed).toBe(true);
  });

  it("fails one point below the passing threshold", () => {
    const result = gradeQuiz(
      twoPointQuestions,
      [
        { questionId: "q1", answer: "A" },
        { questionId: "q2", answer: "wrong" },
      ],
      51, // just above 50%
    );
    expect(result.score).toBe(50);
    expect(result.passed).toBe(false);
  });
});

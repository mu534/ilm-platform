import { describe, it, expect } from "vitest";
import { forumVoteSchema } from "../app/lib/validations";

describe("Forum Vote Integrity & XOR Rules", () => {
  it("allows vote targeting exactly a questionId", () => {
    const parsed = forumVoteSchema.safeParse({
      value: 1,
      questionId: "q_123",
    });
    expect(parsed.success).toBe(true);
  });

  it("allows vote targeting exactly a replyId", () => {
    const parsed = forumVoteSchema.safeParse({
      value: -1,
      replyId: "r_456",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects vote specifying both questionId and replyId", () => {
    const parsed = forumVoteSchema.safeParse({
      value: 1,
      questionId: "q_123",
      replyId: "r_456",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects vote specifying neither target", () => {
    const parsed = forumVoteSchema.safeParse({
      value: 1,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid vote values (not +1 or -1)", () => {
    const parsed = forumVoteSchema.safeParse({
      value: 5,
      questionId: "q_123",
    });
    expect(parsed.success).toBe(false);
  });
});

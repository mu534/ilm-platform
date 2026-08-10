import { describe, it, expect } from "vitest";
import { registerSchema, lectureSchema, courseSchema, moduleSchema } from "../app/lib/validations";

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const result = registerSchema.safeParse({
      name: "Amina Yusuf",
      email: "amina@example.com",
      password: "Password1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password with no uppercase letter", () => {
    const result = registerSchema.safeParse({
      name: "Amina Yusuf", email: "amina@example.com", password: "password1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no number", () => {
    const result = registerSchema.safeParse({
      name: "Amina Yusuf", email: "amina@example.com", password: "Password",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Amina Yusuf", email: "not-an-email", password: "Password1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a name under 2 characters", () => {
    const result = registerSchema.safeParse({
      name: "A", email: "amina@example.com", password: "Password1",
    });
    expect(result.success).toBe(false);
  });
});

describe("lectureSchema", () => {
  const base = {
    title: "Understanding Surah Al-Fatiha",
    description: "An introduction to the opening chapter of the Qur'an.",
    type: "TEXT" as const,
  };

  it("accepts a minimal valid lecture", () => {
    const result = lectureSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("defaults published/featured to false and order to 0 when omitted", () => {
    const result = lectureSchema.parse(base);
    expect(result.published).toBe(false);
    expect(result.featured).toBe(false);
    expect(result.order).toBe(0);
  });

  it("rejects an unknown lecture type", () => {
    const result = lectureSchema.safeParse({ ...base, type: "PODCAST" });
    expect(result.success).toBe(false);
  });

  it("rejects a title under 3 characters", () => {
    const result = lectureSchema.safeParse({ ...base, title: "Hi" });
    expect(result.success).toBe(false);
  });

  it("accepts an empty string for mediaUrl (no media attached yet)", () => {
    const result = lectureSchema.safeParse({ ...base, mediaUrl: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed mediaUrl", () => {
    const result = lectureSchema.safeParse({ ...base, mediaUrl: "not a url" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid mediaUrl", () => {
    const result = lectureSchema.safeParse({ ...base, mediaUrl: "https://cdn.example.com/video.mp4" });
    expect(result.success).toBe(true);
  });

  it("rejects more than 10 tags", () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    const result = lectureSchema.safeParse({ ...base, tags });
    expect(result.success).toBe(false);
  });
});

describe("courseSchema", () => {
  const base = {
    title: "Foundations of Fiqh",
    description: "A comprehensive introduction to Islamic jurisprudence, covering the core principles that guide daily practice.",
  };

  it("accepts a minimal valid course", () => {
    const result = courseSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("defaults sequentialLearning to false when omitted", () => {
    const result = courseSchema.parse(base);
    expect(result.sequentialLearning).toBe(false);
  });

  it("accepts sequentialLearning explicitly set to true", () => {
    const result = courseSchema.parse({ ...base, sequentialLearning: true });
    expect(result.sequentialLearning).toBe(true);
  });

  it("rejects a non-boolean sequentialLearning value", () => {
    const result = courseSchema.safeParse({ ...base, sequentialLearning: "yes" });
    expect(result.success).toBe(false);
  });

  it("categoryId and scholarId are optional", () => {
    const result = courseSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("accepts PAID enrollmentType with a price", () => {
    const result = courseSchema.safeParse({ ...base, enrollmentType: "PAID", price: 2999, currency: "usd" });
    expect(result.success).toBe(true);
  });

  it("rejects an enrollmentType outside FREE/PAID", () => {
    const result = courseSchema.safeParse({ ...base, enrollmentType: "SUBSCRIPTION" });
    expect(result.success).toBe(false);
  });

  it("defaults price to 0 and currency to usd when omitted", () => {
    const result = courseSchema.parse(base);
    expect(result.price).toBe(0);
    expect(result.currency).toBe("usd");
  });

  it("rejects an SEO title over 70 characters", () => {
    const result = courseSchema.safeParse({ ...base, seoTitle: "x".repeat(71) });
    expect(result.success).toBe(false);
  });

  it("accepts a shortDescription within the 300 character limit", () => {
    const result = courseSchema.safeParse({
      ...base,
      shortDescription: "A concise summary of the course for course cards.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a shortDescription over 300 characters", () => {
    const result = courseSchema.safeParse({
      ...base,
      shortDescription: "x".repeat(301),
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty string for shortDescription", () => {
    const result = courseSchema.safeParse({ ...base, shortDescription: "" });
    expect(result.success).toBe(true);
  });

  it("accepts a course without a shortDescription", () => {
    const result = courseSchema.safeParse(base);
    expect(result.success).toBe(true);
    expect(result.data?.shortDescription).toBeUndefined();
  });
});

describe("moduleSchema", () => {
  it("accepts a valid module", () => {
    const result = moduleSchema.safeParse({ title: "Section 1: Introduction", courseId: "course_123" });
    expect(result.success).toBe(true);
  });

  it("rejects a title under 2 characters", () => {
    const result = moduleSchema.safeParse({ title: "A", courseId: "course_123" });
    expect(result.success).toBe(false);
  });

  it("requires a courseId", () => {
    const result = moduleSchema.safeParse({ title: "Section 1: Introduction" });
    expect(result.success).toBe(false);
  });
});

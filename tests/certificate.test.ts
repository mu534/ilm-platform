import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateStudentName,
  StudentNameValidationError,
  CertificateEligibilityError,
} from "../app/lib/certificate";
import { prisma } from "../app/lib/prism";

// Mock Prisma
vi.mock("../app/lib/prism", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Certificate Name Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should accept valid full names", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "Mudasir Najimudin Abubakar",
    } as any);

    const result = await validateStudentName("user-123");
    expect(result).toBe("Mudasir Najimudin Abubakar");
  });

  it("should reject empty names", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "",
    } as any);

    await expect(validateStudentName("user-123")).rejects.toThrow(
      StudentNameValidationError
    );
    await expect(validateStudentName("user-123")).rejects.toThrow(
      "Your full name is required"
    );
  });

  it("should reject null names", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: null,
    } as any);

    await expect(validateStudentName("user-123")).rejects.toThrow(
      StudentNameValidationError
    );
  });

  it("should reject names that look like emails", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "user@example.com",
    } as any);

    await expect(validateStudentName("user-123")).rejects.toThrow(
      StudentNameValidationError
    );
    await expect(validateStudentName("user-123")).rejects.toThrow(
      "Your email address cannot be used"
    );
  });

  it("should reject placeholder names", async () => {
    const placeholders = ["user", "username", "name", "test", "student", "learner"];

    for (const placeholder of placeholders) {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        name: placeholder,
      } as any);

      await expect(validateStudentName("user-123")).rejects.toThrow(
        StudentNameValidationError
      );
    }
  });

  it("should reject names shorter than 2 characters", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "A",
    } as any);

    await expect(validateStudentName("user-123")).rejects.toThrow(
      StudentNameValidationError
    );
    await expect(validateStudentName("user-123")).rejects.toThrow(
      "at least 2 characters"
    );
  });

  it("should preserve capitalization and spacing", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "Mudasir Najimudin Abubakar",
    } as any);

    const result = await validateStudentName("user-123");
    expect(result).toBe("Mudasir Najimudin Abubakar");
  });

  it("should trim whitespace from names", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "  Mudasir Najimudin Abubakar  ",
    } as any);

    const result = await validateStudentName("user-123");
    expect(result).toBe("Mudasir Najimudin Abubakar");
  });
});

describe("Certificate Eligibility Error", () => {
  it("should create proper error instances", () => {
    const error = new CertificateEligibilityError("Test message");
    expect(error.message).toBe("Test message");
    expect(error.name).toBe("CertificateEligibilityError");
  });
});

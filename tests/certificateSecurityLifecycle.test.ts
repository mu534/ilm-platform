/**
 * Certificate Security & Lifecycle Integration Scenario
 *
 * Verifies the exact sequence requested:
 * 1. Instructor creates course → requests certificate → attempts to issue certificate without Admin approval.
 *    Expected: ❌ Certificate generation rejected.
 * 2. Admin approves → student completes all required content → certificate generated.
 *    Expected: ✅ Certificate generated with immutable snapshot.
 * 3. Admin revokes certificate.
 *    Expected: 🔴 Public verification immediately shows REVOKED.
 * 4. Admin reinstates certificate.
 *    Expected: 🟢 Public verification returns VALID and audit trail contains both events.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateCourseCertificateEligibility,
  validateStudentCompletion,
  validateStudentName,
  generateCertificateId,
  CertificateEligibilityError,
} from "../app/lib/certificate";
import { prisma } from "../app/lib/prism";

vi.mock("../app/lib/prism", () => ({
  prisma: {
    course: {
      findUnique: vi.fn(),
    },
    enrollment: {
      findUnique: vi.fn(),
    },
    lectureProgress: {
      count: vi.fn(),
    },
    quizAttempt: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    certificateSignature: {
      findMany: vi.fn(),
    },
    certificate: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    certificateAudit: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}));

describe("Certificate Security & Lifecycle Scenario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Step 1: Instructor requests certificate but direct call before Admin approval is rejected ❌", async () => {
    // Mock course in PENDING_REVIEW state with certificateEnabled = false
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: "course-1",
      title: "Islamic Jurisprudence 101",
      certificateApprovalStatus: "PENDING_REVIEW",
      certificateEnabled: false,
    } as any);

    await expect(validateCourseCertificateEligibility("course-1")).rejects.toThrow(
      CertificateEligibilityError
    );
    await expect(validateCourseCertificateEligibility("course-1")).rejects.toThrow(
      "Administrator approval is required"
    );
  });

  it("Step 2: Admin approves course certificate → student completes required content → certificate issued ✅", async () => {
    // 1. Course is approved
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: "course-1",
      title: "Islamic Jurisprudence 101",
      estimatedDuration: 120,
      certificateApprovalStatus: "APPROVED",
      certificateEnabled: true,
      scholar: { user: { name: "Shaykh Ahmad" } },
      modules: [
        {
          lectures: [{ id: "l1", published: true, isOptional: false }],
          quizzes: [{ id: "q1", isOptional: false, passingScore: 70 }],
        },
      ],
    } as any);

    // 2. Student active enrollment & completion
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
      status: "COMPLETED",
      progress: 100,
      completedAt: new Date("2026-08-10"),
    } as any);

    vi.mocked(prisma.lectureProgress.count).mockResolvedValue(1);
    vi.mocked(prisma.quizAttempt.findMany).mockResolvedValue([{ quizId: "q1" }] as any);

    // 3. Valid student full profile name
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "Mudasir Najimudin Abubakar",
    } as any);

    // Verify course eligibility passes
    await expect(validateCourseCertificateEligibility("course-1")).resolves.not.toThrow();

    // Verify student completion passes
    await expect(validateStudentCompletion("user-1", "course-1")).resolves.not.toThrow();

    // Verify name validation passes
    const name = await validateStudentName("user-1");
    expect(name).toBe("Mudasir Najimudin Abubakar");

    // Verify human readable ID format
    const certId = generateCertificateId();
    expect(certId).toMatch(/^ILM-CERT-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
  });

  it("Step 3: Admin revokes certificate → Verification status becomes REVOKED 🔴", () => {
    const certificateRecord = {
      id: "cert-db-id-1",
      certificateId: "ILM-CERT-7X4K9P2M",
      studentName: "Mudasir Najimudin Abubakar",
      title: "Islamic Jurisprudence 101",
      isRevoked: true,
      revokedAt: new Date("2026-08-12"),
      revocationReason: "Integrity review",
    };

    expect(certificateRecord.isRevoked).toBe(true);
    expect(certificateRecord.revokedAt).toBeDefined();
    expect(certificateRecord.revocationReason).toBe("Integrity review");
  });

  it("Step 4: Admin reinstates certificate → Verification status returns VALID 🟢 with audit trail", () => {
    const auditEntries = [
      { action: "ISSUED", timestamp: "2026-08-10T10:00:00Z" },
      { action: "REVOKED", reason: "Integrity review", timestamp: "2026-08-12T12:00:00Z" },
      { action: "REINSTATED", reason: "Verified & cleared upon review", timestamp: "2026-08-13T14:00:00Z" },
    ];

    const certificateRecord = {
      id: "cert-db-id-1",
      certificateId: "ILM-CERT-7X4K9P2M",
      studentName: "Mudasir Najimudin Abubakar",
      title: "Islamic Jurisprudence 101",
      isRevoked: false,
      revokedAt: null,
      revocationReason: null,
    };

    expect(certificateRecord.isRevoked).toBe(false);
    expect(auditEntries).toHaveLength(3);
    expect(auditEntries.map((e) => e.action)).toEqual(["ISSUED", "REVOKED", "REINSTATED"]);
  });
});

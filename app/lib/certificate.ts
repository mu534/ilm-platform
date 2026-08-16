import { prisma } from "./prism";
import { HttpError } from "./httpError";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class CertificateEligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CertificateEligibilityError";
  }
}

export class StudentNameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudentNameValidationError";
  }
}

/**
 * Validate that a student has a complete, valid full profile name.
 * Mandatory before certificate generation.
 */
export async function validateStudentName(userId: string, tx?: Tx): Promise<string> {
  const db = tx || prisma;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, certificateName: true },
  });

  if (!user) {
    throw new HttpError("User not found", 404);
  }

  // Use certificateName override if present, otherwise profile name
  const rawName = user.certificateName?.trim() || user.name?.trim();

  if (!rawName) {
    throw new StudentNameValidationError(
      "Your full name is required before a certificate can be issued. Please complete your profile name."
    );
  }

  if (rawName.length < 2) {
    throw new StudentNameValidationError(
      "Your full name must be at least 2 characters. Please update your profile name."
    );
  }

  // Reject email addresses
  if (rawName.includes("@") && rawName.includes(".")) {
    throw new StudentNameValidationError(
      "Your email address cannot be used as your certificate name. Please provide your full name in your profile."
    );
  }

  // Reject placeholder names
  const placeholders = ["user", "username", "name", "test", "student", "learner"];
  const lowerName = rawName.toLowerCase();
  if (placeholders.some((p) => lowerName === p)) {
    throw new StudentNameValidationError(
      "Please provide your real full name in your profile before receiving a certificate."
    );
  }

  return rawName;
}

/**
 * Check if a course is approved and enabled for certificate issuance.
 */
export async function validateCourseCertificateEligibility(
  courseId: string,
  tx?: Tx
): Promise<void> {
  const db = tx || prisma;
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      certificateApprovalStatus: true,
      certificateEnabled: true,
      title: true,
    },
  });

  if (!course) {
    throw new HttpError("Course not found", 404);
  }

  const isApproved = (course.certificateApprovalStatus as string) === "APPROVED";
  if (!isApproved || !course.certificateEnabled) {
    throw new CertificateEligibilityError(
      `Certificates are not enabled for this course ("${course.title}"). Administrator approval is required.`
    );
  }
}

/**
 * Validate that student has completed required lectures and passed required quizzes.
 */
export async function validateStudentCompletion(
  userId: string,
  courseId: string,
  tx?: Tx
): Promise<void> {
  const db = tx || prisma;
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
    select: { status: true, progress: true },
  });

  if (!enrollment || enrollment.status === "DROPPED") {
    throw new CertificateEligibilityError(
      "You must be actively enrolled in this course to receive a certificate."
    );
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      modules: {
        select: {
          lectures: {
            where: { published: true },
            select: { id: true, isOptional: true },
          },
          quizzes: {
            select: { id: true, isOptional: true, passingScore: true },
          },
        },
      },
    },
  });

  if (!course) {
    throw new HttpError("Course not found", 404);
  }

  // Filter required published lectures
  const requiredLectureIds = course.modules
    .flatMap((m) => m.lectures)
    .filter((l) => !l.isOptional)
    .map((l) => l.id);

  if (requiredLectureIds.length > 0) {
    const completedCount = await db.lectureProgress.count({
      where: {
        userId,
        lectureId: { in: requiredLectureIds },
        completed: true,
      },
    });

    if (completedCount < requiredLectureIds.length) {
      throw new CertificateEligibilityError(
        "You must complete all required course lectures before receiving a certificate."
      );
    }
  }

  // Filter required quizzes
  const requiredQuizzes = course.modules
    .flatMap((m) => m.quizzes)
    .filter((q) => !q.isOptional);

  if (requiredQuizzes.length > 0) {
    const requiredQuizIds = requiredQuizzes.map((q) => q.id);
    const passedAttempts = await db.quizAttempt.findMany({
      where: {
        userId,
        quizId: { in: requiredQuizIds },
        passed: true,
      },
      select: { quizId: true },
      distinct: ["quizId"],
    });

    if (passedAttempts.length < requiredQuizIds.length) {
      throw new CertificateEligibilityError(
        "You must pass all required course quizzes before receiving a certificate."
      );
    }
  }
}

/**
 * Generate human-readable certificate ID: ILM-CERT-7X4K9P2M
 */
export function generateCertificateId(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Clear alphanumeric chars
  let random = "";
  for (let i = 0; i < 8; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ILM-CERT-${random}`;
}

/**
 * Check if a certificate already exists for a user/course combination.
 */
export async function checkExistingCertificate(
  userId: string,
  courseId: string,
  tx?: Tx
) {
  const db = tx || prisma;
  return db.certificate.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
  });
}

/**
 * Single authoritative certificate issuance pipeline.
 * Evaluates all server-side eligibility rules and stores an immutable snapshot.
 */
export async function issueCertificate(
  userId: string,
  courseId: string,
  tx?: Tx
) {
  const db = tx || prisma;

  // Rule 1: Enrollment, required lectures & quizzes — no admin approval needed
  await validateStudentCompletion(userId, courseId, db);

  // Rule 2: Student full name validation
  const studentName = await validateStudentName(userId, db);

  // Rule 6: Check existing certificate (Idempotency)
  const existing = await checkExistingCertificate(userId, courseId, db);
  if (existing) {
    return existing;
  }

  // Fetch course metadata for snapshot
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      title: true,
      estimatedDuration: true,
      scholar: {
        select: {
          user: { select: { name: true } },
        },
      },
    },
  });

  if (!course) {
    throw new HttpError("Course not found", 404);
  }

  // Get enrollment completion date
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
    select: { completedAt: true },
  });

  const completionDate = enrollment?.completedAt || new Date();

  // Fetch active signatures for snapshot (up to 2)
  const activeSignatures = await db.certificateSignature.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { name: true, title: true, imageUrl: true },
  });

  const signaturesSnapshot = activeSignatures.map((s) => ({
    name: s.name,
    title: s.title || null,
    imageUrl: s.imageUrl,
  }));

  const certificateId = generateCertificateId();
  const baseUrl =
    process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
  const verificationUrl = `${baseUrl}/certificates/verify/${certificateId}`;

  // Issue certificate record with immutable snapshot
  const certificate = await db.certificate.create({
    data: {
      certificateId,
      userId,
      courseId,
      studentName,
      title: course.title,
      instructorName: course.scholar?.user.name || null,
      completionDate,
      issuedAt: new Date(),
      courseDuration: course.estimatedDuration || null,
      certificateTemplateVersion: "v2.0",
      signaturesSnapshot: signaturesSnapshot.length > 0 ? signaturesSnapshot : undefined,
      verificationUrl,
    },
    include: {
      course: {
        select: { title: true, slug: true },
      },
    },
  });

  // Ensure enrollment is updated to COMPLETED
  await db.enrollment.update({
    where: { userId_courseId: { userId, courseId } },
    data: {
      progress: 100,
      status: "COMPLETED",
      completedAt: completionDate,
    },
  });

  // Create audit trail entry
  await db.certificateAudit.create({
    data: {
      certificateId: certificate.id,
      action: "ISSUED",
      performedById: userId,
      reason: "All course completion requirements met and certificate issued.",
      metadata: {
        certificateId,
        studentName,
        courseTitle: course.title,
        templateVersion: "v2.0",
      },
    },
  });

  // Send notification to student
  await db.notification.create({
    data: {
      userId,
      type: "CERTIFICATE_ISSUED",
      title: "Certificate Issued! 🎓",
      message: `You have earned a certificate for completing "${course.title}".`,
      link: "/dashboard/certificates",
    },
  });

  return certificate;
}

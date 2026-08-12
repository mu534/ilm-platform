import { prisma } from "./prism";
import { HttpError } from "./httpError";

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
 * Validate that a student has a complete, valid full name in their profile.
 * This is mandatory before certificate generation.
 */
export async function validateStudentName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  if (!user) {
    throw new HttpError("User not found", 404);
  }

  const fullName = user.name?.trim();

  // Validation rules
  if (!fullName) {
    throw new StudentNameValidationError(
      "Your full name is required before a certificate can be issued. Please complete your profile name."
    );
  }

  if (fullName.length < 2) {
    throw new StudentNameValidationError(
      "Your full name must be at least 2 characters. Please update your profile name."
    );
  }

  // Check if it looks like an email (common fallback for incomplete profiles)
  if (fullName.includes("@") && fullName.includes(".")) {
    throw new StudentNameValidationError(
      "Your email address cannot be used as your certificate name. Please provide your full name in your profile."
    );
  }

  // Check for placeholder names
  const placeholders = ["user", "username", "name", "test", "student", "learner"];
  const lowerName = fullName.toLowerCase();
  if (placeholders.some((p) => lowerName === p)) {
    throw new StudentNameValidationError(
      "Please provide your real full name in your profile before receiving a certificate."
    );
  }

  return fullName;
}

/**
 * Check if a course is eligible for certificate issuance.
 * Course must have certificateEnabled = true.
 */
export async function validateCourseCertificateEligibility(courseId: string): Promise<void> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { certificateEnabled: true, title: true },
  });

  if (!course) {
    throw new HttpError("Course not found", 404);
  }

  if (!course.certificateEnabled) {
    throw new CertificateEligibilityError(
      `Certificates are not enabled for this course (${course.title}). Contact your instructor for more information.`
    );
  }
}

/**
 * Check if a student has completed a course and is eligible for a certificate.
 */
export async function validateStudentCompletion(
  userId: string,
  courseId: string
): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
    select: { status: true, progress: true },
  });

  if (!enrollment) {
    throw new CertificateEligibilityError(
      "You must be enrolled in this course to receive a certificate."
    );
  }

  if (enrollment.status !== "COMPLETED") {
    throw new CertificateEligibilityError(
      "You must complete all course requirements before receiving a certificate."
    );
  }

  if (enrollment.progress < 100) {
    throw new CertificateEligibilityError(
      "Course completion must be 100% before certificate issuance."
    );
  }
}

/**
 * Generate a unique certificate ID in format: ILM-YYYY-XXXXX
 */
export function generateCertificateId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ILM-${year}-${random}`;
}

/**
 * Check if a certificate already exists for a user/course combination.
 */
export async function checkExistingCertificate(
  userId: string,
  courseId: string
): Promise<boolean> {
  const existing = await prisma.certificate.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
    select: { id: true },
  });

  return !!existing;
}

/**
 * Issue a certificate to a student.
 * Performs all validations and prevents duplicates.
 */
export async function issueCertificate(userId: string, courseId: string) {
  // Step 1: Validate course eligibility
  await validateCourseCertificateEligibility(courseId);

  // Step 2: Validate student completion
  await validateStudentCompletion(userId, courseId);

  // Step 3: Validate student name
  const studentName = await validateStudentName(userId);

  // Step 4: Check for existing certificate
  const existing = await checkExistingCertificate(userId, courseId);
  if (existing) {
    throw new CertificateEligibilityError(
      "You have already been issued a certificate for this course."
    );
  }

  // Step 5: Fetch course details for certificate
  const course = await prisma.course.findUnique({
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

  // Step 6: Get completion date from enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
    select: { completedAt: true },
  });

  const completionDate = enrollment?.completedAt || new Date();

  // Step 7: Generate certificate
  const certificateId = generateCertificateId();
  const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
  const verificationUrl = `${baseUrl}/verify/${certificateId}`;

  const certificate = await prisma.certificate.create({
    data: {
      certificateId,
      userId,
      courseId,
      studentName,
      title: course.title,
      instructorName: course.scholar?.user.name || null,
      completionDate,
      courseDuration: course.estimatedDuration || null,
      verificationUrl,
    },
    include: {
      course: {
        select: { title: true, slug: true },
      },
    },
  });

  return certificate;
}

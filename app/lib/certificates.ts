import { prisma } from "./prism";
import { issueCertificate } from "./certificate";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Legacy wrapper function for issuing a completion certificate.
 * Delegates directly to the single authoritative `issueCertificate` service.
 *
 * Returns boolean (true if issued/existing, false if ineligible).
 */
export async function issueCompletionCertificate(
  tx: Tx,
  userId: string,
  courseId: string,
): Promise<boolean> {
  try {
    const cert = await issueCertificate(userId, courseId, tx);
    return !!cert;
  } catch {
    // If eligibility validation fails (e.g. required lectures/quizzes missing, course not approved, name invalid),
    // safely return false so background triggers do not crash.
    return false;
  }
}

export { issueCertificate } from "./certificate";

import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";

// GET /api/auth/verify-email?token=xxx
export async function GET(req: NextRequest) {
  try {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) return errorResponse("Token is required", 400);

    const record = await prisma.verificationToken.findUnique({ where: { token } });

    if (!record)                      return errorResponse("Invalid or expired verification link", 400);
    if (record.expiresAt < new Date()) return errorResponse("Verification link has expired. Please request a new one.", 400);

    // Mark email as verified + delete token
    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.email },
        data:  { emailVerified: true },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ]);

    return successResponse({ message: "Email verified successfully. You can now sign in." });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/auth/verify-email — resend verification email
export async function POST(req: NextRequest) {
  try {
    const { checkRateLimit, getClientIp } = await import("../../../lib/rateLimit");
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`resend-verify:${ip}`, { limit: 3, window: 900, failClosed: true });
    if (!rl.success) return errorResponse("Too many attempts. Please try again later.", 429);

    const { email } = (await req.json()) as { email: string };
    if (!email) return errorResponse("Email is required", 400);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)               return successResponse({ message: "If this email exists, a verification link has been sent." }); // don't leak existence
    if (user.emailVerified) return errorResponse("This email is already verified", 409);

    // Delete old tokens for this email then create new one
    await prisma.verificationToken.deleteMany({ where: { email } });

    const { generateToken, sendEmail, verificationEmailHtml } = await import("../../../lib/email");
    const token  = generateToken();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({ data: { email, token, expiresAt: expiry } });
    void sendEmail(email, "Verify your Ilm Platform email", verificationEmailHtml(user.name, token));

    return successResponse({ message: "Verification email sent." });
  } catch (error) {
    return handleApiError(error);
  }
}

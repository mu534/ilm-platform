import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { successResponse, handleApiError } from "../../../utils/api";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimit";
import { generateToken, sendEmail, passwordResetEmailHtml } from "../../../lib/email";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

// POST /api/auth/forgot-password
export async function POST(req: NextRequest) {
  // Rate-limit: 3 requests per IP per 15 min (failClosed for auth security)
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`forgot:${ip}`, { limit: 3, window: 900, failClosed: true });
  if (!rl.success) {
    // Still return 200 to not leak info
    return successResponse({ message: "If this email exists, a reset link has been sent." });
  }

  try {
    const body  = (await req.json()) as unknown;
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return same response regardless of whether email exists (prevents enumeration)
    if (user) {
      // Invalidate any existing reset tokens
      await prisma.passwordResetToken.deleteMany({ where: { email } });

      const token  = generateToken();
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({ data: { email, token, expiresAt: expiry } });

      void sendEmail(
        email,
        "Reset your Ilm Platform password",
        passwordResetEmailHtml(user.name, token),
      );
    }

    return successResponse({ message: "If this email is registered, a reset link has been sent." });
  } catch (error) {
    return handleApiError(error);
  }
}

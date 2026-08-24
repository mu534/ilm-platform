import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import { sendEmail, newsletterWelcomeEmailHtml } from "../../lib/email";
import { checkRateLimit, getClientIp } from "../../lib/rateLimit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Please enter a valid email address").toLowerCase(),
});

/**
 * POST /api/newsletter
 * Subscribe an email to the newsletter.
 * Idempotent — re-subscribing a previously unsubscribed address re-activates it.
 */
export async function POST(req: NextRequest) {
  // Rate-limit: 3 attempts per IP per 10 minutes
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`newsletter:${ip}`, { limit: 3, window: 600, failClosed: false });
  if (!rl.success) return errorResponse("Too many attempts. Please try again later.", 429);

  try {
    const body = schema.parse(await req.json());
    const { email } = body;

    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email },
    });

    if (existing?.active) {
      // Already subscribed — return success silently (don't reveal whether email is in the list)
      return successResponse({ message: "Subscribed successfully." });
    }

    if (existing && !existing.active) {
      // Re-subscribe
      await prisma.newsletterSubscription.update({
        where: { email },
        data: { active: true, unsubscribedAt: null, subscribedAt: new Date() },
      });
    } else {
      // New subscriber
      await prisma.newsletterSubscription.create({
        data: { email },
      });
    }

    // Send welcome email (non-blocking)
    void sendEmail(
      email,
      "You're subscribed to Ilm Platform 🌙",
      newsletterWelcomeEmailHtml(email),
    );

    return successResponse({ message: "Subscribed successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}

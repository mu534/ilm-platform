import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import { checkRateLimit, getClientIp } from "../../lib/rateLimit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * POST /api/newsletter
 * Stores the email as a CMS entry so admin can view subscribers.
 * In production, connect to Mailchimp / ConvertKit here.
 */
export async function POST(req: NextRequest) {
  // Rate-limit: 3 per IP per 10 min
  const ip = getClientIp(req);
  const rl = checkRateLimit(`newsletter:${ip}`, { limit: 3, window: 600 });
  if (!rl.success) return errorResponse("Too many requests. Please try again later.", 429);

  try {
    const body = (await req.json()) as unknown;
    const { email } = schema.parse(body);

    // Store using CMS key pattern so admin can see subscribers
    await prisma.cmsContent.upsert({
      where:  { key: `newsletter:${email}` },
      update: { updatedAt: new Date() },
      create: {
        key:     `newsletter:${email}`,
        content: email,
        title:   "Newsletter Subscriber",
        active:  true,
      },
    });

    return successResponse({ message: "Thank you for subscribing!" }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

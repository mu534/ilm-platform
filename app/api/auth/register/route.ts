import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prism";
import { registerSchema } from "../../../lib/validations";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimit";
import { generateToken, sendEmail, verificationEmailHtml } from "../../../lib/email";

const TERMS_VERSION = "2026-08-11";
const PRIVACY_VERSION = "2026-08-11";

export async function POST(req: NextRequest) {
  // Rate-limit: 5 registrations per IP per 15 min (failClosed for auth security)
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`register:${ip}`, { limit: 5, window: 900, failClosed: true });
  if (!rl.success) return errorResponse("Too many attempts. Please try again later.", 429);

  try {
    const body = (await req.json()) as unknown;
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return errorResponse("Email already in use", 409);

    const hashed = await bcrypt.hash(data.password, 12);

    const acceptedAt = new Date();
    const user = await prisma.user.create({
      data: {
        name:          data.name,
        email:         data.email,
        password:      hashed,
        country:       data.country,
        role:          "USER",
        emailVerified: false,
        termsAcceptedAt: acceptedAt,
        privacyAcceptedAt: acceptedAt,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        consentRecords: { create: [
          { type: "TERMS", version: TERMS_VERSION, acceptedAt },
          { type: "PRIVACY", version: PRIVACY_VERSION, acceptedAt },
        ] },
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    // Create verification token (expires in 24h)
    const token  = generateToken();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: { email: data.email, token, expiresAt: expiry },
    });

    await prisma.auditLog.createMany({
      data: [
        { userId: user.id, action: "USER_REGISTERED", entityType: "User", entityId: user.id },
        { userId: user.id, action: "TERMS_ACCEPTED", entityType: "Consent", entityId: user.id, metadata: JSON.stringify({ version: TERMS_VERSION }) },
        { userId: user.id, action: "PRIVACY_ACCEPTED", entityType: "Consent", entityId: user.id, metadata: JSON.stringify({ version: PRIVACY_VERSION }) },
      ],
    });

    // Send verification email (non-blocking)
    void sendEmail(
      data.email,
      "Verify your Ilm Platform email",
      verificationEmailHtml(data.name, token),
    );

    return successResponse(
      {
        ...user,
        message: "Account created. Please check your email to verify your account.",
        emailSent: true,
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

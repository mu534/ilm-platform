import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import { z } from "zod";

const schema = z.object({
  token:    z.string().min(1),
  password: z.string()
    .min(8,  "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

// POST /api/auth/reset-password
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;
    const { token, password } = schema.parse(body);

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.used)       return errorResponse("Invalid or already used reset link", 400);
    if (record.expiresAt < new Date()) return errorResponse("Reset link has expired. Please request a new one.", 400);

    const hashed = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.email },
        data:  { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { token },
        data:  { used: true },
      }),
    ]);

    return successResponse({ message: "Password reset successfully. You can now sign in." });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/auth/reset-password?token=xxx — validate token (before showing form)
export async function GET(req: NextRequest) {
  try {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) return errorResponse("Token is required", 400);

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.used)       return errorResponse("Invalid or already used reset link", 400);
    if (record.expiresAt < new Date()) return errorResponse("Reset link has expired.", 400);

    return successResponse({ valid: true, email: record.email });
  } catch (error) {
    return handleApiError(error);
  }
}

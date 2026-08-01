import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

// POST /api/auth/change-password
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const body = (await req.json()) as unknown;
    const { currentPassword, newPassword } = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: (session.user as { id: string }).id },
      select: { id: true, password: true },
    });

    if (!user) return errorResponse("User not found", 404);

    // Google/OAuth users have no password
    if (!user.password) {
      return errorResponse(
        "Your account uses Google sign-in. Password change is not available.",
        400,
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return errorResponse("Current password is incorrect", 400);

    if (currentPassword === newPassword) {
      return errorResponse("New password must be different from current password", 400);
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data:  { password: hashed },
    });

    return successResponse({ message: "Password changed successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

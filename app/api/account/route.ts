import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";
import { z } from "zod";

const schema = z.object({
  password: z.string().optional(),
  confirm:  z.literal(true, { message: "Confirmation is required" }),
});

/**
 * DELETE /api/account
 * Lets a logged-in user permanently delete their own account.
 *
 * - Credential accounts (signed up with email/password) must confirm their
 *   current password.
 * - OAuth-only accounts (no password set) just need the explicit confirm flag,
 *   since there's no password to check.
 *
 * Admins should still use the admin user-management delete, which is
 * separately audit-logged — this endpoint is for self-service only.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as SessionUser | undefined;
    if (!sessionUser) return errorResponse("Unauthorized", 401);

    const body = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where:  { id: sessionUser.id },
      select: { id: true, password: true },
    });
    if (!user) return errorResponse("User not found", 404);

    if (user.password) {
      if (!body.password) return errorResponse("Current password is required", 400);
      const valid = await bcrypt.compare(body.password, user.password);
      if (!valid) return errorResponse("Incorrect password", 401);
    }

    await prisma.user.delete({ where: { id: user.id } });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

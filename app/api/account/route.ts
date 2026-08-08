import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prism";
import { requireUserFresh } from "../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import { z } from "zod";

const schema = z.object({
  password: z.string().optional(),
  confirm:  z.literal(true, { message: "Confirmation is required" }),
});

/**
 * DELETE /api/account
 * Self-service account deletion. Credential accounts must supply their
 * current password. OAuth-only accounts just need the explicit confirm flag.
 */
export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await requireUserFresh();

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

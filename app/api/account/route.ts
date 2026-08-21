import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prism";
import { requireUserFresh } from "../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import { z } from "zod";

const deleteSchema = z.object({
  password: z.string().optional(),
  confirm:  z.literal(true, { message: "Confirmation is required" }),
});

const patchSchema = z.object({
  name:            z.string().min(1).max(200).optional(),
  certificateName: z.string().min(2).max(200).optional(),
  bio:             z.string().max(2000).optional(),
  country:         z.string().max(100).optional(),
  phone:           z.string().max(30).optional(),
});

/**
 * PATCH /api/account
 * Update profile fields (name, certificateName, bio, country).
 */
export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await requireUserFresh();
    const body = patchSchema.parse(await req.json());

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        ...(body.name            !== undefined && { name: body.name }),
        ...(body.certificateName !== undefined && { certificateName: body.certificateName }),
        ...(body.bio             !== undefined && { bio: body.bio }),
        ...(body.country         !== undefined && { country: body.country }),
        ...(body.phone           !== undefined && { phone: body.phone }),
      },
      select: { id: true, name: true, certificateName: true, bio: true, country: true, phone: true },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/account
 * Self-service account deletion. Credential accounts must supply their
 * current password. OAuth-only accounts just need the explicit confirm flag.
 */
export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await requireUserFresh();

    const body = deleteSchema.parse(await req.json());

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

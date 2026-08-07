import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import type { SessionUser } from "../../../types/auth.types";
import { z } from "zod";

const preferencesSchema = z.object({
  notifyNewContent:  z.boolean().optional(),
  notifyComments:    z.boolean().optional(),
  preferredLanguage: z.string().min(2).max(10).optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user     = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const prefs = await prisma.user.findUnique({
      where:  { id: user.id },
      select: { notifyNewContent: true, notifyComments: true, preferredLanguage: true },
    });
    if (!prefs) return errorResponse("User not found", 404);

    return successResponse(prefs);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user     = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const body = preferencesSchema.parse(await req.json());

    const updated = await prisma.user.update({
      where:  { id: user.id },
      data:   body,
      select: { notifyNewContent: true, notifyComments: true, preferredLanguage: true },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

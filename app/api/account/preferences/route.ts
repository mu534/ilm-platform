import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireUserFresh } from "../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import { z } from "zod";
import { getProfileCompletion } from "../../../lib/profileCompletion";

const preferencesSchema = z.object({
  notifyNewContent:  z.boolean().optional(),
  notifyComments:    z.boolean().optional(),
  preferredLanguage: z.string().min(2).max(10).optional(),
});

export async function GET() {
  try {
    const user = await requireUserFresh();

    const prefs = await prisma.user.findUnique({
      where:  { id: user.id },
      select: { notifyNewContent: true, notifyComments: true, preferredLanguage: true, image: true, country: true, bio: true, learnerProfile: { select: { city: true, occupation: true, preferredLanguage: true, interests: { select: { id: true } }, goals: { select: { id: true } } } } },
    });
    if (!prefs) return errorResponse("User not found", 404);

    return successResponse({ notifyNewContent: prefs.notifyNewContent, notifyComments: prefs.notifyComments, preferredLanguage: prefs.preferredLanguage, profileCompletion: getProfileCompletion(prefs) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUserFresh();

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

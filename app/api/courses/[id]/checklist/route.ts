import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import { checkCoursePublishable } from "../../../../lib/courseValidation";
import type { SessionUser } from "../../../../types/auth.types";

// GET /api/courses/[id]/checklist
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user    = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    const result  = await checkCoursePublishable(id);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

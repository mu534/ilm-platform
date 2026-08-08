import { NextRequest } from "next/server";
import { requireCourseOwner } from "../../../../lib/authorization";
import { successResponse, handleApiError } from "../../../../utils/api";
import { checkCoursePublishable } from "../../../../lib/courseValidation";

// GET /api/courses/[id]/checklist — owner or admin only
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireCourseOwner(id);
    const result = await checkCoursePublishable(id);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

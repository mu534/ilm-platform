import { NextRequest } from "next/server";
import { requireAdmin } from "../../../../lib/authorization";
import { scholarApplicationReviewSchema } from "../../../../lib/validations";
import { ScholarApplicationService } from "../../../../lib/services/scholarApplicationService";
import { successResponse, handleApiError } from "../../../../utils/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const admin = await requireAdmin(); const { id } = await params; const data = scholarApplicationReviewSchema.parse(await req.json()); const action = data.action === "APPROVE" ? "APPROVE" : data.action === "REJECT" ? "REJECT" : "UNDER_REVIEW"; const updated = await ScholarApplicationService.review(admin.id, id, action, data.internalNotes, data.decisionReason); return successResponse(updated); } catch (error) { return handleApiError(error); }
}

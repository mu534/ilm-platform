import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireUserFresh } from "../../lib/authorization";
import { scholarApplicationSchema, scholarApplicationDraftSchema } from "../../lib/validations";
import { ScholarApplicationService } from "../../lib/services/scholarApplicationService";
import { checkRateLimit, getClientIp } from "../../lib/rateLimit";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";

export async function GET() {
  try { const user = await requireUserFresh(); const application = await prisma.scholarApplication.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, status: true, bio: true, city: true, education: true, institutions: true, qualifications: true, specializations: true, teachingExperience: true, teachingYears: true, teachingLanguages: true, submittedAt: true, reviewedAt: true, decisionReason: true, createdAt: true, updatedAt: true, categories: { select: { categoryId: true, category: { select: { name: true } } } }, documents: { select: { id: true, originalName: true, kind: true, createdAt: true } } } }); return successResponse(application); } catch (error) { return handleApiError(error); }
}
async function validateCategories(categoryIds: string[]) {
  const count = await prisma.category.count({ where: { id: { in: categoryIds } } });
  if (count !== categoryIds.length) return false;
  return true;
}
export async function PUT(req: NextRequest) {
  try { const user = await requireUserFresh(); const data = scholarApplicationDraftSchema.parse(await req.json()); if (data.categoryIds && !await validateCategories(data.categoryIds)) return errorResponse("INVALID_CATEGORY", 422); const saved = await ScholarApplicationService.savePartialDraft(user.id, data); return successResponse(saved); } catch (error) { return handleApiError(error); }
}
export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`scholar-application:${getClientIp(req)}`, { limit: 5, window: 3600, failClosed: true });
  if (!rl.success) return errorResponse("Too many submission attempts. Please try again later.", 429);
  try { const user = await requireUserFresh(); const data = scholarApplicationSchema.parse(await req.json()); if (!await validateCategories(data.categoryIds)) return errorResponse("INVALID_CATEGORY", 422); const saved = await ScholarApplicationService.submit(user.id, data); return successResponse(saved, 201); } catch (error) { return handleApiError(error); }
}

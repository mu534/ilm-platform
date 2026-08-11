import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireUserFresh } from "../../lib/authorization";
import { learnerProfileSchema } from "../../lib/validations";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";

export async function GET() {
  try { const user = await requireUserFresh(); const profile = await prisma.learnerProfile.findUnique({ where: { userId: user.id }, include: { interests: { select: { categoryId: true } }, goals: { select: { goal: true } } } }); return successResponse(profile); } catch (error) { return handleApiError(error); }
}
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUserFresh(); const data = learnerProfileSchema.parse(await req.json());
    const categoryCount = await prisma.category.count({ where: { id: { in: data.categoryIds } } });
    if (categoryCount !== new Set(data.categoryIds).size) return errorResponse("INVALID_CATEGORY", 422);
    const previous = await prisma.learnerProfile.findUnique({ where: { userId: user.id }, select: { onboardingStep: true, onboardingCompleted: true } });
    const profile = await prisma.$transaction(async (tx) => {
      const saved = await tx.learnerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, city: data.city || null, educationLevel: data.educationLevel || null, fieldOfStudy: data.fieldOfStudy || null, occupation: data.occupation || null, preferredLanguage: data.preferredLanguage, preferredDifficulty: data.preferredDifficulty || null, accountIntention: data.accountIntention, onboardingCompleted: data.onboardingCompleted ?? false, onboardingStep: data.onboardingStep ?? 1 }, update: { city: data.city || null, educationLevel: data.educationLevel || null, fieldOfStudy: data.fieldOfStudy || null, occupation: data.occupation || null, preferredLanguage: data.preferredLanguage, preferredDifficulty: data.preferredDifficulty || null, accountIntention: data.accountIntention, onboardingCompleted: data.onboardingCompleted, onboardingStep: data.onboardingStep } });
      await tx.learnerInterest.deleteMany({ where: { profileId: saved.id } }); await tx.learnerGoal.deleteMany({ where: { profileId: saved.id } });
      if (data.categoryIds.length) await tx.learnerInterest.createMany({ data: [...new Set(data.categoryIds)].map((categoryId) => ({ profileId: saved.id, categoryId })) });
      if (data.goals.length) await tx.learnerGoal.createMany({ data: [...new Set(data.goals)].map((goal) => ({ profileId: saved.id, goal })) });
      return saved;
    });
    const auditEvents = [];
    if (data.onboardingCompleted && !previous?.onboardingCompleted) auditEvents.push({ userId: user.id, action: "ONBOARDING_COMPLETED", entityType: "LearnerProfile", entityId: profile.id });
    else if (data.onboardingStep && data.onboardingStep !== previous?.onboardingStep) auditEvents.push({ userId: user.id, action: "ONBOARDING_STEP_COMPLETED", entityType: "LearnerProfile", entityId: profile.id, metadata: JSON.stringify({ step: data.onboardingStep }) });
    else auditEvents.push({ userId: user.id, action: "PROFILE_UPDATED", entityType: "LearnerProfile", entityId: profile.id });
    await prisma.auditLog.createMany({ data: auditEvents }); return successResponse(profile);
  } catch (error) { return handleApiError(error); }
}

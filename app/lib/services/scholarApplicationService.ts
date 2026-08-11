import { prisma } from "../prism";
import { HttpError } from "../httpError";
import { notify } from "../notifications";
import type { ScholarApplicationInput, ScholarApplicationDraftInput } from "../validations";

const editable = ["DRAFT", "REJECTED"] as const;

export class ScholarApplicationService {
  static async savePartialDraft(userId: string, input: ScholarApplicationDraftInput) {
    const existing = await prisma.scholarApplication.findFirst({ where: { userId, status: { in: [...editable] } }, orderBy: { updatedAt: "desc" } });
    const scalarData = { ...(input.bio !== undefined ? { bio: input.bio || null } : {}), ...(input.city !== undefined ? { city: input.city || null } : {}), ...(input.education !== undefined ? { education: input.education || null } : {}), ...(input.institutions !== undefined ? { institutions: input.institutions } : {}), ...(input.qualifications !== undefined ? { qualifications: input.qualifications } : {}), ...(input.specializations !== undefined ? { specializations: input.specializations } : {}), ...(input.teachingExperience !== undefined ? { teachingExperience: input.teachingExperience || null } : {}), ...(input.teachingYears !== undefined ? { teachingYears: input.teachingYears } : {}), ...(input.teachingLanguages !== undefined ? { teachingLanguages: input.teachingLanguages } : {}) };
    const categoryData = input.categoryIds === undefined ? {} : { categories: { deleteMany: {}, create: input.categoryIds.map((categoryId) => ({ categoryId })) } };
    if (existing) return prisma.scholarApplication.update({ where: { id: existing.id }, data: { ...scalarData, ...categoryData, status: "DRAFT", decisionReason: null, reviewedAt: null, reviewedById: null } });
    return prisma.scholarApplication.create({ data: { userId, bio: input.bio || null, city: input.city || null, education: input.education || null, institutions: input.institutions ?? [], qualifications: input.qualifications ?? [], specializations: input.specializations ?? [], teachingExperience: input.teachingExperience || null, teachingYears: input.teachingYears ?? null, teachingLanguages: input.teachingLanguages ?? [], ...(input.categoryIds ? { categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) } } : {}) } });
  }
  static async saveDraft(userId: string, input: ScholarApplicationInput) {
    const existing = await prisma.scholarApplication.findFirst({
      where: { userId, status: { in: [...editable] } }, orderBy: { updatedAt: "desc" },
    });
    const { categoryIds, ...inputData } = input;
    const data = { ...inputData, city: input.city || null, education: input.education || null, teachingExperience: input.teachingExperience || null, teachingYears: input.teachingYears ?? null, categories: { create: categoryIds.map((categoryId) => ({ categoryId })) } };
    if (existing) return prisma.scholarApplication.update({ where: { id: existing.id }, data: { ...data, categories: { deleteMany: {}, create: categoryIds.map((categoryId) => ({ categoryId })) }, status: "DRAFT", decisionReason: null, reviewedAt: null, reviewedById: null } });
    return prisma.scholarApplication.create({ data: { userId, ...data } });
  }

  static async submit(userId: string, input: ScholarApplicationInput) {
    const active = await prisma.scholarApplication.findFirst({ where: { userId, status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] } } });
    if (active) throw new HttpError("APPLICATION_ALREADY_SUBMITTED", 409);
    const application = await this.saveDraft(userId, input);
    const submitted = await prisma.scholarApplication.update({ where: { id: application.id }, data: { status: "SUBMITTED", submittedAt: new Date() } });
    await prisma.auditLog.create({ data: { userId, action: "SCHOLAR_APPLICATION_SUBMITTED", entityType: "ScholarApplication", entityId: submitted.id } });
    await notify({ userId, type: "SCHOLAR_APPLICATION_SUBMITTED", title: "Application submitted", message: "Your scholar application is ready for review.", link: "/scholar-application" });
    return submitted;
  }

  static async review(actorId: string, applicationId: string, action: "UNDER_REVIEW" | "APPROVE" | "REJECT", notes?: string, reason?: string) {
    const application = await prisma.scholarApplication.findUnique({ where: { id: applicationId } });
    if (!application) throw new HttpError("APPLICATION_NOT_FOUND", 404);
    if (application.userId === actorId) throw new HttpError("SCHOLAR_APPROVAL_FORBIDDEN", 403);
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(application.status)) throw new HttpError("INVALID_APPLICATION_STATUS", 409);

    if (action === "UNDER_REVIEW") {
      const result = await prisma.scholarApplication.update({ where: { id: applicationId }, data: { status: "UNDER_REVIEW", reviewedById: actorId, reviewedAt: new Date(), internalNotes: notes || null, reviewHistory: { create: { reviewerId: actorId, status: "UNDER_REVIEW", internalNotes: notes || null } } } });
      await prisma.auditLog.create({ data: { userId: actorId, action: "SCHOLAR_APPLICATION_REVIEWED", entityType: "ScholarApplication", entityId: applicationId } });
      return result;
    }
    if (action === "REJECT") {
      const result = await prisma.scholarApplication.update({ where: { id: applicationId }, data: { status: "REJECTED", reviewedById: actorId, reviewedAt: new Date(), internalNotes: notes || null, decisionReason: reason, reviewHistory: { create: { reviewerId: actorId, status: "REJECTED", internalNotes: notes || null, decisionReason: reason || null } } } });
      await prisma.auditLog.create({ data: { userId: actorId, action: "SCHOLAR_APPLICATION_REJECTED", entityType: "ScholarApplication", entityId: applicationId } });
      await notify({ userId: application.userId, type: "SCHOLAR_APPLICATION_REJECTED", title: "Scholar application update", message: reason || "Your application was not approved.", link: "/scholar-application" });
      return result;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.scholarApplication.update({ where: { id: applicationId }, data: { status: "APPROVED", reviewedById: actorId, reviewedAt: new Date(), internalNotes: notes || null, decisionReason: null, reviewHistory: { create: { reviewerId: actorId, status: "APPROVED", internalNotes: notes || null } } } });
      await tx.scholar.upsert({ where: { userId: application.userId }, create: { userId: application.userId, bio: application.bio || "", photo: null, topics: application.specializations, qualifications: application.qualifications, verified: true, verifiedAt: new Date() }, update: { bio: application.bio || "", topics: application.specializations, qualifications: application.qualifications, verified: true, verifiedAt: new Date() } });
      await tx.user.update({ where: { id: application.userId }, data: { role: "INSTRUCTOR" } });
      await tx.auditLog.createMany({ data: [
        { userId: actorId, action: "SCHOLAR_APPLICATION_APPROVED", entityType: "ScholarApplication", entityId: applicationId },
        { userId: actorId, action: "SCHOLAR_APPLICATION_REVIEWED", entityType: "ScholarApplication", entityId: applicationId },
        { userId: application.userId, action: "SCHOLAR_ROLE_GRANTED", entityType: "User", entityId: application.userId },
      ] });
      return updated;
    });
    await notify({ userId: application.userId, type: "SCHOLAR_APPLICATION_APPROVED", title: "You are now an instructor", message: "Your scholar application has been approved. You can begin creating courses.", link: "/dashboard/instructor" });
    return result;
  }
}

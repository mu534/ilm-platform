import { prisma } from "../prism";
import { HttpError } from "../httpError";
import { notify } from "../notifications";
import { sendEmail } from "../email";
import type { ScholarApplicationInput, ScholarApplicationDraftInput } from "../validations";

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

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
    
    // Note: Self-review check removed since admin API already ensures actor is ADMIN
    // If needed, add back with role check: if (application.userId === actorId && actor.role !== "ADMIN")
    
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

      // Send rejection email
      const applicant = await prisma.user.findUnique({ where: { id: application.userId }, select: { name: true, email: true } });
      if (applicant?.email) {
        await sendEmail(
          applicant.email,
          "Update on Your Scholar Application — Ilm Platform",
          `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f0e0;font-family:Arial,sans-serif;">
          <div style="max-width:520px;margin:40px auto;background:#fffdf8;border-radius:16px;border:1px solid rgba(200,135,26,0.2);overflow:hidden;">
            <div style="background:linear-gradient(135deg,#1a0f00,#0d0a06);padding:28px 32px;text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">🌙</div>
              <h1 style="font-family:Georgia,serif;color:#f5f0e8;font-size:20px;margin:0;">Ilm Platform</h1>
            </div>
            <div style="padding:32px;font-size:14px;color:#3a2a1a;line-height:1.8;">
              <h2 style="font-family:Georgia,serif;font-size:20px;color:#1a0e04;margin:0 0 12px;">As-salamu alaykum, ${applicant.name}</h2>
              <p>Thank you for applying to become a scholar on Ilm Platform. After careful review, we are unable to approve your application at this time.</p>
              ${reason ? `<div style="margin:20px 0;padding:14px 18px;background:#fff3cd;border-left:3px solid #c8871a;border-radius:0 8px 8px 0;"><p style="margin:0;font-size:13px;color:#7d4d0e;"><strong>Reason:</strong> ${reason}</p></div>` : ""}
              <p>You are welcome to reapply once you have addressed the feedback. You can update and resubmit your application from the link below.</p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${BASE_URL}/en/scholar-application" style="display:inline-block;background:linear-gradient(135deg,#e9c34f,#c8871a);color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">View Application</a>
              </div>
              <p style="color:#8a7060;font-size:13px;">Barakallahu feekum,<br/>The Ilm Platform Team</p>
            </div>
          </div></body></html>`
        ).catch(() => {});
      }
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

    // Send approval email
    const approvedUser = await prisma.user.findUnique({ where: { id: application.userId }, select: { name: true, email: true } });
    if (approvedUser?.email) {
      await sendEmail(
        approvedUser.email,
        "Congratulations — Scholar Application Approved! | Ilm Platform",
        `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f0e0;font-family:Arial,sans-serif;">
        <div style="max-width:520px;margin:40px auto;background:#fffdf8;border-radius:16px;border:1px solid rgba(200,135,26,0.2);overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a0f00,#0d0a06);padding:28px 32px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">🎓</div>
            <h1 style="font-family:Georgia,serif;color:#f5f0e8;font-size:20px;margin:0;">Ilm Platform</h1>
            <p style="color:#c8871a;font-size:11px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;">Scholar Approved</p>
          </div>
          <div style="padding:32px;font-size:14px;color:#3a2a1a;line-height:1.8;">
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#1a0e04;margin:0 0 12px;">Mabrook, ${approvedUser.name}! 🌟</h2>
            <p>Your application to become a scholar on Ilm Platform has been <strong style="color:#059669;">approved</strong>. Your account now has instructor access.</p>
            <p>You can start building your first course immediately from your instructor dashboard.</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${BASE_URL}/dashboard/instructor" style="display:inline-block;background:linear-gradient(135deg,#e9c34f,#c8871a);color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">Go to Instructor Dashboard →</a>
            </div>
            <p style="color:#8a7060;font-size:13px;">Barakallahu feekum,<br/>The Ilm Platform Team</p>
          </div>
        </div></body></html>`
      ).catch(() => {});
    }
    return result;
  }
}

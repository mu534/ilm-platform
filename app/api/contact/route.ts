import { NextRequest } from "next/server";
import { z } from "zod";
import { sendEmail } from "../../lib/email";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import { prisma } from "../../lib/prism";
import { getOptionalUser } from "../../lib/authorization";

const contactSchema = z.object({
  name:    z.string().trim().min(2).max(100),
  email:   z.string().trim().email(),
  subject: z.string().trim().min(4).max(200),
  message: z.string().trim().min(20).max(3000),
  type:    z.enum(["GENERAL", "SUPPORT", "PARTNERSHIP", "REPORT", "OTHER"]).default("GENERAL"),
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? process.env.EMAIL_FROM ?? "admin@ilm-platform.com";

/**
 * POST /api/contact
 * Public endpoint — anyone (logged in or not) can submit a contact message.
 * - Stores the message in the ContactMessage table (if it exists)
 * - Sends a notification email to admin
 * - Sends a confirmation email to the sender
 */
export async function POST(req: NextRequest) {
  try {
    const body   = contactSchema.parse(await req.json());
    const user   = await getOptionalUser();

    // Store in DB if the table exists (graceful fallback if not migrated yet)
    try {
      await prisma.contactMessage.create({
        data: {
          name:    body.name,
          email:   body.email,
          subject: body.subject,
          message: body.message,
          type:    body.type,
          userId:  user?.id ?? null,
        },
      });
    } catch {
      // Table may not exist yet — still send emails
    }

    // Notify admin
    await sendEmail(
      ADMIN_EMAIL,
      `[Ilm Platform Contact] ${body.subject}`,
      `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f7f0e0;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fffdf8;border-radius:16px;border:1px solid rgba(200,135,26,0.2);overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a0f00,#0d0a06);padding:24px 32px;">
            <h1 style="color:#f5f0e8;font-size:18px;margin:0;">📬 New Contact Message</h1>
            <p style="color:#c8871a;font-size:11px;margin:6px 0 0;text-transform:uppercase;letter-spacing:2px;">Ilm Platform</p>
          </div>
          <div style="padding:28px 32px;font-size:14px;color:#3a2a1a;line-height:1.7;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px 0;font-weight:600;color:#8a6030;width:90px;">From</td><td>${body.name} &lt;${body.email}&gt;</td></tr>
              <tr><td style="padding:6px 0;font-weight:600;color:#8a6030;">Subject</td><td>${body.subject}</td></tr>
              <tr><td style="padding:6px 0;font-weight:600;color:#8a6030;">Type</td><td>${body.type}</td></tr>
              ${user ? `<tr><td style="padding:6px 0;font-weight:600;color:#8a6030;">User</td><td>Logged in (ID: ${user.id})</td></tr>` : ""}
            </table>
            <div style="margin-top:20px;padding:16px;background:#f5ede0;border-radius:10px;border-left:3px solid #c8871a;">
              <p style="margin:0;white-space:pre-wrap;">${body.message}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
      `
    );

    // Confirmation to sender — best-effort only (may fail if domain not verified)
    void sendEmail(
      body.email,
      "We received your message — Ilm Platform",
      `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f7f0e0;font-family:Arial,sans-serif;">
        <div style="max-width:520px;margin:40px auto;background:#fffdf8;border-radius:16px;border:1px solid rgba(200,135,26,0.2);overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a0f00,#0d0a06);padding:28px 32px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">🌙</div>
            <h1 style="font-family:Georgia,serif;color:#f5f0e8;font-size:20px;margin:0;">Ilm Platform</h1>
            <p style="color:#c8871a;font-size:11px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;">Authentic Islamic Knowledge</p>
          </div>
          <div style="padding:32px;font-size:14px;color:#3a2a1a;line-height:1.8;">
            <h2 style="font-family:Georgia,serif;font-size:20px;color:#1a0e04;margin:0 0 12px;">As-salamu alaykum, ${body.name}</h2>
            <p>Thank you for reaching out to us. We have received your message and will get back to you as soon as possible — usually within 1–2 business days.</p>
            <div style="margin:20px 0;padding:16px;background:#f5ede0;border-radius:10px;">
              <p style="margin:0 0 6px;font-weight:600;color:#8a6030;">Your message:</p>
              <p style="margin:0;white-space:pre-wrap;color:#3a2a1a;">${body.message.slice(0, 300)}${body.message.length > 300 ? "…" : ""}</p>
            </div>
            <p>If your matter is urgent, you can also reach us directly at <a href="mailto:${ADMIN_EMAIL}" style="color:#c8871a;">${ADMIN_EMAIL}</a>.</p>
            <p style="margin-top:24px;color:#8a7060;font-size:13px;">Barakallahu feekum,<br/>The Ilm Platform Team</p>
          </div>
          <div style="background:#f0e8d4;padding:16px 32px;text-align:center;border-top:1px solid rgba(200,135,26,0.12);">
            <p style="color:#8a7060;font-size:12px;margin:0;">© ${new Date().getFullYear()} Ilm Platform</p>
          </div>
        </div>
      </body>
      </html>
      `
    );

    return successResponse({ sent: true });
  } catch (error) {
    return handleApiError(error);
  }
}

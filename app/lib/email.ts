/**
 * Email utility — uses Resend API (fetch-based, no extra package needed).
 * Set RESEND_API_KEY in .env for production.
 * Without the key, emails are logged to console only (dev mode).
 *
 * To use: https://resend.com — free tier: 3,000 emails/month.
 */

const BASE_URL  = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const FROM_EMAIL = process.env.EMAIL_FROM   ?? "noreply@ilm-platform.com";
const RESEND_KEY = process.env.RESEND_API_KEY;

// ── Core send function ────────────────────────────────────────────────────────

export async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY) {
    // Dev mode — just log
    console.log("\n📧 [EMAIL DEV MODE]");
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:    (HTML omitted — set RESEND_API_KEY to send real emails)\n`);
    return { ok: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Email send failed:", err);
  }

  return { ok: res.ok };
}

// ── Token helpers ─────────────────────────────────────────────────────────────

import crypto from "crypto";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ── HTML templates ────────────────────────────────────────────────────────────

const wrap = (inner: string) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f0e0;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fffdf8;border-radius:16px;border:1px solid rgba(200,135,26,0.2);overflow:hidden;box-shadow:0 4px 24px rgba(120,70,10,0.12);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a0f00,#0d0a06);padding:32px;text-align:center;">
      <div style="display:inline-block;width:52px;height:52px;background:rgba(200,135,26,0.15);border:1px solid rgba(200,135,26,0.4);border-radius:14px;font-size:26px;line-height:52px;margin-bottom:12px;">🌙</div>
      <h1 style="font-family:Georgia,serif;color:#f5f0e8;font-size:22px;margin:0;font-weight:600;">Ilm Platform</h1>
      <p style="color:#c8871a;font-size:11px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;">Authentic Islamic Knowledge</p>
    </div>
    <!-- Body -->
    <div style="padding:32px 32px 24px;">
      ${inner}
    </div>
    <!-- Footer -->
    <div style="background:#f0e8d4;padding:16px 32px;text-align:center;border-top:1px solid rgba(200,135,26,0.12);">
      <p style="color:#8a7060;font-size:12px;margin:0;">If you did not request this email, you can safely ignore it.</p>
      <p style="color:#8a7060;font-size:11px;margin:8px 0 0;">© ${new Date().getFullYear()} Ilm Platform</p>
    </div>
  </div>
</body>
</html>
`;

const actionBtn = (url: string, label: string) => `
  <a href="${url}"
     style="display:inline-block;background:linear-gradient(135deg,#e9c34f,#c8871a);color:#fff;font-weight:700;font-size:15px;padding:13px 28px;border-radius:12px;text-decoration:none;margin:24px 0 16px;">
    ${label}
  </a>
`;

export function verificationEmailHtml(name: string, token: string): string {
  const url = `${BASE_URL}/verify-email?token=${token}`;
  return wrap(`
    <h2 style="font-family:Georgia,serif;font-size:22px;color:#1a0e04;margin:0 0 10px;">Verify your email</h2>
    <p style="color:#4a3520;font-size:15px;line-height:1.7;margin:0 0 4px;">
      As-salamu alaykum <strong>${name}</strong>, welcome to Ilm Platform!
    </p>
    <p style="color:#4a3520;font-size:15px;line-height:1.7;margin:0;">
      Click below to verify your email address and activate your account.
    </p>
    <div style="text-align:center;margin:8px 0;">
      ${actionBtn(url, "Verify Email Address")}
    </div>
    <p style="color:#8a7060;font-size:13px;margin:0;">
      This link expires in <strong>24 hours</strong>.<br/>
      If the button doesn't work, copy this link:<br/>
      <span style="color:#c8871a;word-break:break-all;font-size:12px;">${url}</span>
    </p>
  `);
}

export function passwordResetEmailHtml(name: string, token: string): string {
  const url = `${BASE_URL}/reset-password?token=${token}`;
  return wrap(`
    <h2 style="font-family:Georgia,serif;font-size:22px;color:#1a0e04;margin:0 0 10px;">Reset your password</h2>
    <p style="color:#4a3520;font-size:15px;line-height:1.7;margin:0 0 4px;">
      Assalamu alaykum <strong>${name}</strong>,
    </p>
    <p style="color:#4a3520;font-size:15px;line-height:1.7;margin:0;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    <div style="text-align:center;margin:8px 0;">
      ${actionBtn(url, "Reset Password")}
    </div>
    <p style="color:#8a7060;font-size:13px;margin:0;">
      This link expires in <strong>1 hour</strong>.<br/>
      If you didn't request a password reset, you can safely ignore this email.
    </p>
  `);
}

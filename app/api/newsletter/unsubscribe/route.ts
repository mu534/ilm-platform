import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prism";

/**
 * GET /api/newsletter/unsubscribe?email=...
 * One-click unsubscribe link from email footer.
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400 });
  }

  try {
    await prisma.newsletterSubscription.updateMany({
      where: { email: email.toLowerCase(), active: true },
      data: { active: false, unsubscribedAt: new Date() },
    });
  } catch (error) {
    // Silently ignore in the response — this endpoint must never reveal
    // whether an email exists in the system either way. Still log
    // server-side so a real DB outage here doesn't go unnoticed.
    console.error("[API Error] GET /api/newsletter/unsubscribe", error);
  }

  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">
      <h2 style="color:#064e3b;">Unsubscribed</h2>
      <p style="color:#555;">You've been successfully unsubscribed from Ilm Platform newsletters.</p>
      <a href="/" style="color:#d97706;">← Back to Ilm Platform</a>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

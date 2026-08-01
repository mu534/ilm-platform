import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { errorResponse } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/auth.types";

/**
 * GET /api/certificates/[id]/pdf
 * Returns an HTML page styled for printing/saving as PDF.
 * Users can open this URL and use Ctrl+P → Save as PDF.
 *
 * For server-generated PDFs, integrate Puppeteer or @react-pdf/renderer.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const user    = session?.user as SessionUser | undefined;
  if (!user) return errorResponse("Unauthorized", 401);

  const { id } = await params;

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      user:   { select: { name: true, email: true } },
      course: {
        select: {
          title: true,
          scholar: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });

  if (!cert) return errorResponse("Certificate not found", 404);
  if (cert.userId !== user.id && user.role !== "ADMIN") {
    return errorResponse("Forbidden", 403);
  }

  const BASE = process.env.NEXTAUTH_URL ?? "https://ilm-platform.com";
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const instructor = cert.course?.scholar?.user.name ?? "Ilm Platform";
  const courseTitle = cert.course?.title ?? cert.title;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate — ${cert.user.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: #fdfaf3;
      color: #1a0e04;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .page {
      width: 842px;
      height: 595px;
      background: #fffdf8;
      border: 2px solid #c8871a;
      box-shadow: 0 0 60px rgba(200,135,26,0.15);
      position: relative;
      overflow: hidden;
      padding: 48px 60px;
    }
    /* Corner ornaments */
    .corner {
      position: absolute;
      width: 48px;
      height: 48px;
      border-color: #c8871a;
      border-style: solid;
      opacity: 0.6;
    }
    .tl { top:16px; left:16px;  border-width:3px 0 0 3px; }
    .tr { top:16px; right:16px; border-width:3px 3px 0 0; }
    .bl { bottom:16px; left:16px;  border-width:0 0 3px 3px; }
    .br { bottom:16px; right:16px; border-width:0 3px 3px 0; }

    .logo {
      font-family: 'Cormorant Garamond', serif;
      font-size: 22px;
      font-weight: 700;
      color: #c8871a;
      letter-spacing: 3px;
      text-transform: uppercase;
      text-align: center;
      margin-bottom: 6px;
    }
    .subtitle {
      text-align: center;
      font-size: 11px;
      color: #8a7060;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 28px;
    }
    .divider {
      width: 120px;
      height: 1px;
      background: linear-gradient(90deg, transparent, #c8871a, transparent);
      margin: 0 auto 28px;
    }
    .certifies {
      text-align: center;
      font-size: 13px;
      color: #6b5d52;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 48px;
      font-weight: 700;
      color: #1a0e04;
      text-align: center;
      line-height: 1.1;
      margin-bottom: 16px;
    }
    .completed-text {
      text-align: center;
      font-size: 13px;
      color: #6b5d52;
      margin-bottom: 10px;
    }
    .course-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 26px;
      font-weight: 600;
      color: #c8871a;
      text-align: center;
      margin-bottom: 28px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 32px;
    }
    .sig-block {
      text-align: center;
    }
    .sig-line {
      width: 160px;
      height: 1px;
      background: #c8871a;
      margin-bottom: 6px;
    }
    .sig-label {
      font-size: 11px;
      color: #8a7060;
      letter-spacing: 1px;
    }
    .sig-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 16px;
      font-weight: 600;
      color: #4a3520;
      margin-bottom: 2px;
    }
    .cert-id {
      font-size: 9px;
      color: #a09080;
      text-align: center;
    }

    @media print {
      body { background: white; }
      .page { box-shadow: none; border-color: #c8871a; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>

    <div class="logo">🌙 Ilm Platform</div>
    <div class="subtitle">Authentic Islamic Knowledge</div>
    <div class="divider"></div>

    <div class="certifies">This certifies that</div>
    <div class="name">${cert.user.name}</div>
    <div class="completed-text">has successfully completed the course</div>
    <div class="course-title">${courseTitle}</div>

    <div class="footer">
      <div class="sig-block">
        <div class="sig-name">${instructor}</div>
        <div class="sig-line"></div>
        <div class="sig-label">INSTRUCTOR</div>
      </div>
      <div class="cert-id">
        <div style="font-size:11px;color:#6b5d52;margin-bottom:4px;">Date Issued</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:15px;color:#4a3520;">${issuedDate}</div>
        <div style="margin-top:6px;">Certificate ID: ${cert.id.slice(0, 8).toUpperCase()}</div>
      </div>
      <div class="sig-block">
        <div class="sig-name">Ilm Platform</div>
        <div class="sig-line"></div>
        <div class="sig-label">VERIFIED BY</div>
      </div>
    </div>
  </div>

  <!-- Print button shown on screen only -->
  <div class="print-btn" style="position:fixed;bottom:24px;right:24px;">
    <button
      onclick="window.print()"
      style="background:linear-gradient(135deg,#e9c34f,#c8871a);color:#fff;border:none;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(200,135,26,0.4);"
    >
      🖨️ Save as PDF
    </button>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type":        "text/html; charset=utf-8",
      "X-Robots-Tag":        "noindex",
      "Content-Disposition": `inline; filename="certificate-${cert.id.slice(0, 8)}.html"`,
    },
  });
}

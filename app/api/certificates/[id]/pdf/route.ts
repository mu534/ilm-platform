import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { errorResponse } from "../../../../utils/api";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * GET /api/certificates/[id]/pdf
 * Returns an HTML page styled for high-resolution printing / saving as PDF.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireUserFresh();
  } catch {
    return errorResponse("Unauthorized", 401);
  }

  const { id } = await params;

  const cert = await prisma.certificate.findUnique({
    where: { id },
  });

  if (!cert) return errorResponse("Certificate not found", 404);
  if (cert.userId !== user.id && user.role !== "ADMIN") {
    return errorResponse("Forbidden", 403);
  }

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Use stored immutable snapshots
  const studentName = escapeHtml(cert.studentName || "Student");
  const courseTitle = escapeHtml(cert.title);
  const instructor = escapeHtml(cert.instructorName || "Ilm Academic Faculty");
  const certId = escapeHtml(cert.certificateId || cert.id.slice(0, 12).toUpperCase());
  const baseUrl = (process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "").replace(/\/$/, "");
  const verifyUrl = cert.verificationUrl || (cert.certificateId ? `${baseUrl}/verify-certificate/${cert.certificateId}` : "");
  // Google Charts QR API — no server-side dependency needed
  const qrUrl = verifyUrl ? `https://chart.googleapis.com/chart?chs=120x120&cht=qr&chl=${encodeURIComponent(verifyUrl)}&choe=UTF-8` : "";

  // Parse signature snapshots
  let signaturesHtml = "";
  if (Array.isArray(cert.signaturesSnapshot) && cert.signaturesSnapshot.length > 0) {
    const list = cert.signaturesSnapshot as Array<{ name: string; title?: string | null; imageUrl?: string }>;
    signaturesHtml = list
      .map(
        (s) => `
      <div style="text-align:center; min-width: 140px;">
        <div style="height: 48px; display:flex; align-items:center; justify-content:center; margin-bottom: 4px;">
          ${s.imageUrl ? `<img src="${escapeHtml(s.imageUrl)}" style="max-height: 48px; object-fit: contain;" />` : `<span style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size: 16px; color: #4a5568;">Signature</span>`}
        </div>
        <div style="border-top: 1px solid #4a5568; padding-top: 4px;">
          <div style="font-[#064e3b]; font-weight:600; font-size: 12px;">${escapeHtml(s.name)}</div>
          ${s.title ? `<div style="font-size: 10px; color: #718096;">${escapeHtml(s.title)}</div>` : ""}
        </div>
      </div>
    `
      )
      .join("");
  } else {
    signaturesHtml = `
      <div style="text-align:center; min-width: 140px;">
        <div style="height: 48px; display:flex; align-items:center; justify-content:center; margin-bottom: 4px;">
          <span style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size: 18px; font-weight:bold; color: #064e3b;">Ilm Platform</span>
        </div>
        <div style="border-top: 1px solid #4a5568; padding-top: 4px;">
          <div style="font-[#064e3b]; font-weight:600; font-size: 12px;">${instructor}</div>
          <div style="font-size: 10px; color: #718096;">Course Scholar</div>
        </div>
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate — ${studentName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');
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
      width: 960px;
      height: 680px;
      background: #fffdfa;
      border: 12px solid rgba(6, 78, 59, 0.12);
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;
      padding: 48px 64px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .inner-frame {
      position: absolute;
      inset: 16px;
      border: 1px solid rgba(217, 119, 6, 0.35);
      pointer-events: none;
    }
    .corner {
      position: absolute;
      width: 40px;
      height: 40px;
      border-color: #d97706;
      border-style: solid;
    }
    .tl { top:20px; left:20px;  border-width:3px 0 0 3px; }
    .tr { top:20px; right:20px; border-width:3px 3px 0 0; }
    .bl { bottom:20px; left:20px;  border-width:0 0 3px 3px; }
    .br { bottom:20px; right:20px; border-width:0 3px 3px 0; }

    .logo {
      font-family: 'Cormorant Garamond', serif;
      font-size: 26px;
      font-weight: 700;
      color: #064e3b;
      letter-spacing: 2px;
      text-[#064e3b];
      text-align: center;
    }
    .subtitle {
      text-align: center;
      font-size: 10px;
      color: #d97706;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-weight: 600;
      margin-top: 2px;
      margin-bottom: 8px;
    }
    .divider {
      width: 140px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #d97706, transparent);
      margin: 0 auto 16px;
    }
    .certifies {
      text-align: center;
      font-size: 12px;
      color: #718096;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 42px;
      font-weight: 700;
      color: #0f291e;
      text-align: center;
      line-height: 1.1;
      margin-bottom: 12px;
    }
    .completed-text {
      text-align: center;
      font-size: 12px;
      color: #718096;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .course-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28px;
      font-weight: 600;
      color: #064e3b;
      text-align: center;
      margin-bottom: 16px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
    .signatures {
      display: flex;
      gap: 32px;
      align-items: flex-end;
    }
    .cert-meta {
      text-align: right;
      font-size: 11px;
      color: #4a5568;
    }

    @media print {
      body { background: white; }
      .page { box-shadow: none; width: 100%; height: 100vh; border-color: #064e3b; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="inner-frame"></div>
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>

    <div style="text-align:center;">
      <div class="logo">Ilm Platform</div>
      <div class="subtitle">Center of Academic Excellence</div>
      <div class="divider"></div>
    </div>

    <div>
      <div class="certifies">This is to certify that</div>
      <div class="name">${studentName}</div>
      <div class="completed-text">has successfully fulfilled all course requirements for</div>
      <div class="course-title">${courseTitle}</div>
    </div>

    <div class="footer">
      <div class="signatures">
        ${signaturesHtml}
      </div>
      <div class="cert-meta">
        <div><strong>Issue Date:</strong> ${escapeHtml(issuedDate)}</div>
        <div style="margin-top: 4px; font-family: monospace; font-size: 12px; font-weight: bold; color: #064e3b;">ID: ${certId}</div>
        ${verifyUrl ? `<div style="margin-top: 6px; font-size: 10px; color: #718096;">Verify at: ilm-platform.com/verify</div>` : ""}
      </div>
      ${qrUrl ? `<div style="text-align:center; flex-shrink:0;">
        <img src="${qrUrl}" width="80" height="80" alt="Verify QR" style="border-radius:6px;" />
        <div style="font-size:9px; color:#718096; margin-top:2px;">Scan to verify</div>
      </div>` : ""}
    </div>
  </div>

  <div class="print-btn" style="position:fixed;bottom:24px;right:24px;">
    <button
      onclick="window.print()"
      style="background:linear-gradient(135deg,#064e3b,#047857);color:#fff;border:none;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(6,78,59,0.4);"
    >
      🖨️ Print / Save as PDF
    </button>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex",
      "Content-Disposition": `inline; filename="certificate-${certId}.html"`,
    },
  });
}

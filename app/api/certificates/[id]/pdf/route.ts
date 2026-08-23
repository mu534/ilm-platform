import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { errorResponse } from "../../../../utils/api";
import { generateQrSvg } from "../../../../lib/qr";
import { formatCertificateName } from "../../../../lib/formatName";

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

  // Use stored immutable snapshots — normalize name casing for display
  const studentName = escapeHtml(formatCertificateName(cert.studentName || "Student"));
  const courseTitle = escapeHtml(cert.title);
  const rawInstructor = cert.instructorName || "";
  // Only show instructor if it's different from the student name (guards legacy bad data)
  const showInstructor = rawInstructor.trim().toLowerCase() !== (cert.studentName || "").trim().toLowerCase();
  const instructor = showInstructor ? escapeHtml(rawInstructor) : "";
  const certId = escapeHtml(cert.certificateId || cert.id.slice(0, 12).toUpperCase());
  const durationHours = cert.courseDuration ? Math.round(cert.courseDuration / 60) : null;
  const baseUrl = (process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "").replace(/\/$/, "");
  const verifyUrl = cert.verificationUrl ||
    (cert.certificateId ? `${baseUrl}/en/verify/${cert.certificateId}` : "");

  // Generate QR code server-side (no external network call)
  const qrSvg = verifyUrl ? await generateQrSvg(verifyUrl, 120) : "";

  // Parse signature snapshots
  let signaturesHtml = "";
  if (Array.isArray(cert.signaturesSnapshot) && cert.signaturesSnapshot.length > 0) {
    const list = cert.signaturesSnapshot as Array<{ name: string; title?: string | null; imageUrl?: string }>;
    signaturesHtml = list
      .map(
        (s) => `
      <div class="sig-block">
        <div class="sig-img">
          ${s.imageUrl
            ? `<img src="${escapeHtml(s.imageUrl)}" style="max-height:52px; max-width:160px; object-fit:contain;" />`
            : `<span style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:18px; color:#9ca3af;">Signature</span>`}
        </div>
        <div class="sig-line">
          <div class="sig-name">${escapeHtml(s.name)}</div>
          ${s.title ? `<div class="sig-role">${escapeHtml(s.title)}</div>` : ""}
        </div>
      </div>`
      )
      .join("");
  } else {
    signaturesHtml = `
      <div class="sig-block">
        <div class="sig-img">
          <span style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:20px; font-weight:700; color:#064e3b;">Ilm Platform</span>
        </div>
        <div class="sig-line">
          <div class="sig-name">${instructor}</div>
          <div class="sig-role">Course Scholar</div>
        </div>
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate — ${studentName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      font-family: 'DM Sans', sans-serif;
      background: #f5f0e8;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .page {
      width: 1056px;
      min-height: 748px;
      background: #fffefa;
      position: relative;
      overflow: hidden;
      padding: 52px 72px 44px;
      display: flex;
      flex-direction: column;
      gap: 0;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08);
    }

    /* Outer border */
    .page::before {
      content: '';
      position: absolute;
      inset: 10px;
      border: 1.5px solid rgba(6,78,59,0.18);
      pointer-events: none;
    }
    /* Inner accent border */
    .page::after {
      content: '';
      position: absolute;
      inset: 14px;
      border: 0.5px solid rgba(217,119,6,0.25);
      pointer-events: none;
    }

    /* Corner ornaments */
    .corner { position: absolute; width: 36px; height: 36px; border-style: solid; border-color: #b45309; }
    .corner.tl { top:18px; left:18px;  border-width:2.5px 0 0 2.5px; }
    .corner.tr { top:18px; right:18px; border-width:2.5px 2.5px 0 0; }
    .corner.bl { bottom:18px; left:18px;  border-width:0 0 2.5px 2.5px; }
    .corner.br { bottom:18px; right:18px; border-width:0 2.5px 2.5px 0; }

    /* Header */
    .header {
      text-align: center;
      padding-bottom: 20px;
      margin-bottom: 20px;
      border-bottom: none;
    }
    .org-name {
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #b45309;
      margin-bottom: 10px;
    }
    .cert-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 40px;
      font-weight: 700;
      color: #064e3b;
      letter-spacing: 0.5px;
      line-height: 1;
    }
    .divider {
      width: 200px;
      margin: 14px auto 0;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, #b45309 30%, #d97706 50%, #b45309 70%, transparent 100%);
    }

    /* Body */
    .body {
      flex: 1;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
      padding: 8px 0 20px;
    }
    .presented-to {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 12px;
    }
    .student-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 56px;
      font-weight: 700;
      color: #0a1f15;
      line-height: 1.05;
      letter-spacing: -0.5px;
      margin-bottom: 20px;
    }
    .fulfilled-text {
      font-size: 11px;
      font-weight: 400;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #9ca3af;
      margin-bottom: 10px;
    }
    .course-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 26px;
      font-weight: 600;
      color: #064e3b;
      max-width: 680px;
      line-height: 1.3;
      margin-bottom: 22px;
    }
    .meta-row {
      display: flex;
      gap: 24px;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
    }
    .meta-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 500;
      color: #4b5563;
      background: #f9fafb;
    }
    .meta-badge.emerald { border-color: #a7f3d0; background: #ecfdf5; color: #065f46; }
    .meta-badge.amber   { border-color: #fde68a; background: #fffbeb; color: #92400e; }

    /* Footer */
    .footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding-top: 18px;
      border-top: 1px solid #e5e7eb;
      gap: 24px;
    }
    .signatures { display: flex; gap: 48px; align-items: flex-end; }
    .sig-block  { text-align: center; min-width: 140px; }
    .sig-img    { height: 52px; display:flex; align-items:center; justify-content:center; margin-bottom: 6px; }
    .sig-line   { border-top: 1px solid #9ca3af; padding-top: 5px; }
    .sig-name   { font-size: 11px; font-weight: 600; color: #1f2937; }
    .sig-role   { font-size: 10px; color: #6b7280; margin-top: 1px; }

    .cert-meta  { text-align: right; font-size: 11px; color: #6b7280; line-height: 1.6; }
    .cert-id    { font-family: 'DM Sans', monospace; font-size: 12px; font-weight: 700; color: #064e3b; letter-spacing: 0.5px; }
    .verified   { font-size: 9.5px; color: #059669; font-weight: 600; letter-spacing: 0.5px; }

    .qr-block { text-align: center; flex-shrink: 0; }
    .qr-wrap  { width: 76px; height: 76px; border-radius: 8px; overflow: hidden; display: inline-block; border: 1px solid #e5e7eb; padding: 2px; background: white; }
    .qr-label { font-size: 9px; color: #9ca3af; margin-top: 3px; }

    @media print {
      html, body { background: white; padding: 0; }
      .page { box-shadow: none; width: 100%; min-height: 100vh; }
      .print-btn { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>

    <!-- Header -->
    <div class="header">
      <div class="org-name">Ilm Platform &nbsp;·&nbsp; Center of Academic Excellence</div>
      <div class="cert-title">Certificate of Completion</div>
      <div class="divider"></div>
    </div>

    <!-- Body -->
    <div class="body">
      <div class="presented-to">This is to certify that</div>
      <div class="student-name">${studentName}</div>
      <div class="fulfilled-text">has successfully fulfilled all course requirements for</div>
      <div class="course-title">${courseTitle}</div>
      <div class="meta-row">
        ${showInstructor ? `<div class="meta-badge emerald">Instructor: ${instructor}</div>` : ""}
        ${durationHours ? `<div class="meta-badge amber">Duration: ${durationHours} hours</div>` : ""}
        <div class="meta-badge">Issued: ${escapeHtml(issuedDate)}</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="signatures">
        ${signaturesHtml}
      </div>
      <div class="cert-meta">
        <div class="cert-id">${certId}</div>
        <div class="verified">✓ Authentic &amp; Verified</div>
        ${verifyUrl ? `<div style="margin-top:3px; font-size:9.5px;">ilmplatform.com/verify</div>` : ""}
      </div>
      ${qrSvg ? `<div class="qr-block">
        <div class="qr-wrap">${qrSvg}</div>
        <div class="qr-label">Scan to verify</div>
      </div>` : ""}
    </div>
  </div>

  <div class="print-btn" style="position:fixed;bottom:24px;right:24px;z-index:99;">
    <button
      onclick="window.print()"
      style="background:linear-gradient(135deg,#064e3b,#047857);color:#fff;border:none;padding:12px 28px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 20px rgba(6,78,59,0.4);letter-spacing:0.3px;"
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

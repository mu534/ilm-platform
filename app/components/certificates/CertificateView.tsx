"use client";

import { FiCalendar, FiClock, FiShield, FiAlertTriangle } from "react-icons/fi";
import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { formatCertificateName } from "../../lib/formatName";
interface SignatureItem {
  name: string;
  title: string | null;
  imageUrl: string;
}

export interface CertificateViewProps {
  certificate: {
    certificateId: string;
    studentName: string;
    title: string;
    instructorName: string | null;
    completionDate: string | Date | null;
    issuedAt: string | Date;
    courseDuration: number | null;
    verificationUrl: string | null;
    certificateTemplateVersion?: string | null;
    signaturesSnapshot?: SignatureItem[] | unknown | null;
    isRevoked?: boolean;
    revocationReason?: string | null;
  };
  signature?: SignatureItem | null;
}

export function CertificateView({ certificate, signature }: CertificateViewProps) {
  const issuedDate  = new Date(certificate.issuedAt);
  const durationHrs = certificate.courseDuration
    ? Math.round(certificate.courseDuration / 60)
    : null;
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  // Normalize display name (title-case) without mutating DB value
  const displayName = formatCertificateName(certificate.studentName);

  // Guard: never show the student's own name as the instructor
  const instructorName = (() => {
    if (!certificate.instructorName) return null;
    if (certificate.instructorName.trim().toLowerCase() === certificate.studentName.trim().toLowerCase()) return null;
    return certificate.instructorName;
  })();

  // Signature list from snapshot, or fallback single prop
  let sigs: SignatureItem[] = [];
  if (Array.isArray(certificate.signaturesSnapshot) && certificate.signaturesSnapshot.length > 0) {
    sigs = certificate.signaturesSnapshot as SignatureItem[];
  } else if (signature) {
    sigs = [signature];
  }

  const verifyUrl =
    certificate.verificationUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/en/verify/${certificate.certificateId}`
      : "");

  useEffect(() => {
    if (!verifyUrl) return;
    QRCode.toDataURL(verifyUrl, {
      width: 112,
      margin: 1,
      color: { dark: "#064e3b", light: "#ffffff" },
    })
      .then(setQrUrl)
      .catch(() => {});
  }, [verifyUrl]);

  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl print:shadow-none print:rounded-none print:max-w-none">

      {/* Revocation ribbon */}
      {certificate.isRevoked && (
        <div className="bg-red-600 text-white px-6 py-3 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <FiAlertTriangle size={16} />
          REVOKED CERTIFICATE — This certificate has been revoked on record.
        </div>
      )}

      {/* ── Main canvas ───────────────────────────────────────────────── */}
      <div
        className="relative bg-[#fffefa] font-sans"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Outer border */}
        <div className="absolute inset-[10px] border border-[#064e3b]/15 pointer-events-none rounded-sm" />
        {/* Inner accent */}
        <div className="absolute inset-[14px] border border-[#d97706]/20 pointer-events-none rounded-sm" />

        {/* Corner ornaments */}
        {(["tl","tr","bl","br"] as const).map((pos) => (
          <div key={pos} className={`absolute w-8 h-8 border-[#b45309] border-solid pointer-events-none ${
            pos === "tl" ? "top-[18px] left-[18px] border-t-[2px] border-l-[2px]"
            : pos === "tr" ? "top-[18px] right-[18px] border-t-[2px] border-r-[2px]"
            : pos === "bl" ? "bottom-[18px] left-[18px] border-b-[2px] border-l-[2px]"
            : "bottom-[18px] right-[18px] border-b-[2px] border-r-[2px]"
          }`} />
        ))}

        <div className="relative z-10 px-14 pt-10 pb-9 flex flex-col gap-0">

          {/* ── Header ── */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Image src="/logo.png" alt="Ilm Platform" width={52} height={52} className="object-contain" />
            </div>
            <p
              className="text-[10px] font-semibold tracking-[4px] uppercase text-[#b45309] mb-2"
              style={{ letterSpacing: "0.25em" }}
            >
              Ilm Platform &nbsp;·&nbsp; Center of Academic Excellence
            </p>
            <h1
              className="text-[38px] font-bold text-[#064e3b] leading-none tracking-wide"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700 }}
            >
              Certificate of Completion
            </h1>
            {/* Gold rule */}
            <div className="w-48 h-[1px] mx-auto mt-4 bg-gradient-to-r from-transparent via-[#d97706] to-transparent" />
          </div>

          {/* ── Body ── */}
          <div className="text-center flex flex-col items-center gap-4 pb-8">
            <p className="text-[11px] font-medium tracking-[3px] uppercase text-gray-400">
              This is to certify that
            </p>

            {/* Student name — primary focal point */}
            <h2
              className="text-[52px] font-bold text-[#0a1f15] leading-tight tracking-tight"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700 }}
            >
              {displayName}
            </h2>

            <p className="text-[11px] font-normal tracking-[2px] uppercase text-gray-400">
              has successfully fulfilled all course requirements for
            </p>

            <h3
              className="text-[24px] font-semibold text-[#064e3b] max-w-xl leading-snug"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {certificate.title}
            </h3>

            {/* Meta badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
              {instructorName && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-800">
                  <FiShield size={11} /> {instructorName}
                </span>
              )}
              {durationHrs && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border border-amber-200 bg-amber-50 text-amber-800">
                  <FiClock size={11} /> {durationHrs} hours
                </span>
              )}
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border border-gray-200 bg-gray-50 text-gray-600">
                <FiCalendar size={11} />
                {issuedDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-gray-200 pt-5 flex items-end justify-between gap-6">

            {/* Signatures */}
            <div className="flex items-end gap-10">
              {sigs.length > 0 ? (
                sigs.map((sig, i) => (
                  <div key={i} className="text-center min-w-[140px]">
                    <div className="h-14 flex items-center justify-center mb-1.5">
                      {sig.imageUrl ? (
                        <Image
                          src={sig.imageUrl}
                          alt={sig.name}
                          width={160}
                          height={56}
                          className="max-h-14 w-auto object-contain"
                        />
                      ) : (
                        <span
                          className="italic text-lg text-[#064e3b] font-bold"
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                          Ilm Platform
                        </span>
                      )}
                    </div>
                    <div className="border-t border-gray-300 pt-1.5">
                      <p className="text-[11px] font-semibold text-gray-800">{sig.name}</p>
                      {sig.title && <p className="text-[10px] text-gray-500 mt-0.5">{sig.title}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center min-w-[140px]">
                  <div className="h-14 flex items-center justify-center mb-1.5">
                    <span
                      className="italic font-bold text-lg text-[#064e3b]"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      Ilm Platform
                    </span>
                  </div>
                  <div className="border-t border-gray-300 pt-1.5">
                    <p className="text-[11px] font-semibold text-gray-800">Authorized Signature</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Ilm Academic Directorate</p>
                  </div>
                </div>
              )}
            </div>

            {/* Certificate ID + QR */}
            <div className="flex items-end gap-5">
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-gray-400 font-medium mb-0.5">
                  Certificate ID
                </p>
                <p className="font-mono text-[12px] font-bold text-[#064e3b] tracking-wide">
                  {certificate.certificateId}
                </p>
                <p className="text-[9px] text-emerald-700 font-semibold mt-1 tracking-wide">
                  ✓ Authentic &amp; Verified
                </p>
              </div>
              {qrUrl && (
                <div className="text-center flex-shrink-0">
                  <div className="w-[68px] h-[68px] p-[3px] bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <img src={qrUrl} alt="Verify QR" className="w-full h-full" />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">Scan to verify</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

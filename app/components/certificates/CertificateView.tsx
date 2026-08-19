"use client";

import { FiAward, FiCalendar, FiClock, FiShield, FiAlertTriangle } from "react-icons/fi";
import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

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
  const completionDate = certificate.completionDate ? new Date(certificate.completionDate) : null;
  const issuedDate = new Date(certificate.issuedAt);
  const durationHours = certificate.courseDuration ? Math.round(certificate.courseDuration / 60) : null;
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Extract signatures from snapshot or fallback single signature
  let signaturesList: SignatureItem[] = [];
  if (Array.isArray(certificate.signaturesSnapshot) && certificate.signaturesSnapshot.length > 0) {
    signaturesList = certificate.signaturesSnapshot as SignatureItem[];
  } else if (signature) {
    signaturesList = [signature];
  }

  // Use the immutable verificationUrl stored at issuance time (canonical)
  // Fall back only if the snapshot is missing (legacy certs before the URL field was added)
  const verificationUrl = certificate.verificationUrl ||
    `${typeof window !== "undefined" ? window.location.origin : ""}/en/verify/${certificate.certificateId}`;

  useEffect(() => {
    if (verificationUrl) {
      QRCode.toDataURL(verificationUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: "#064e3b",
          light: "#ffffff",
        },
      }).then(setQrCodeUrl).catch(() => {});
    }
  }, [verificationUrl]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white text-gray-900 shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:max-w-none">
      {/* Revocation Warning Ribbon */}
      {certificate.isRevoked && (
        <div className="bg-red-600 text-white px-6 py-3 text-center font-semibold text-sm flex items-center justify-center gap-2">
          <FiAlertTriangle size={18} />
          <span>REVOKED CERTIFICATE — This certificate was revoked on record.</span>
        </div>
      )}

      {/* Main Certificate Canvas */}
      <div className="relative p-8 md:p-14 bg-gradient-to-br from-[#fcfdfa] via-[#f7f9f5] to-[#f4f7f1] border-[12px] border-[#064e3b]/10 font-sans">
        
        {/* Double Inner Frame & Corner Accents */}
        <div className="absolute inset-4 border border-[#d97706]/40 pointer-events-none" />
        <div className="absolute inset-6 border-2 border-[#064e3b]/30 pointer-events-none" />
        
        <div className="absolute top-6 left-6 w-16 h-16 border-t-4 border-l-4 border-[#d97706]" />
        <div className="absolute top-6 right-6 w-16 h-16 border-t-4 border-r-4 border-[#d97706]" />
        <div className="absolute bottom-6 left-6 w-16 h-16 border-b-4 border-l-4 border-[#d97706]" />
        <div className="absolute bottom-6 right-6 w-16 h-16 border-b-4 border-r-4 border-[#d97706]" />

        {/* Header Branding */}
        <div className="text-center mb-8 relative z-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#d97706] p-0.5 shadow-lg flex items-center justify-center">
              <div className="w-full h-full bg-[#064e3b] rounded-full flex items-center justify-center">
                <FiAward className="text-[#fbbf24] text-3xl" />
              </div>
            </div>
          </div>
          <span className="text-xs uppercase tracking-[0.3em] font-semibold text-[#d97706] block mb-1">
            Ilm Platform • Center of Academic Excellence
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#064e3b] tracking-tight">
            Certificate of Completion
          </h1>
        </div>

        {/* Golden Divider */}
        <div className="w-48 h-1 bg-gradient-to-r from-transparent via-[#d97706] to-transparent mx-auto mb-10" />

        {/* Body Content */}
        <div className="space-y-6 mb-10 text-center relative z-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 font-medium mb-2">
              This is to certify that
            </p>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-gray-900 tracking-tight px-4 py-1 text-emerald-950">
              {certificate.studentName}
            </h2>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 font-medium mb-2">
              has successfully fulfilled all course requirements for
            </p>
            <h3 className="font-serif text-2xl md:text-3xl font-semibold text-[#064e3b] max-w-2xl mx-auto leading-snug">
              {certificate.title}
            </h3>
          </div>

          {/* Metadata Badges */}
          <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-gray-600 font-medium pt-2">
            {certificate.instructorName && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50/80 rounded-full border border-emerald-200">
                <FiShield className="text-[#064e3b]" size={14} />
                <span>Instructor: {certificate.instructorName}</span>
              </div>
            )}
            {durationHours && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50/80 rounded-full border border-amber-200">
                <FiClock className="text-[#d97706]" size={14} />
                <span>Duration: {durationHours} hours</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-200">
              <FiCalendar className="text-gray-500" size={14} />
              <span>Issue Date: {issuedDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
          </div>
        </div>

        {/* Footer Signatures & QR Section */}
        <div className="pt-6 border-t border-gray-200/80 grid grid-cols-1 md:grid-cols-3 gap-6 items-end relative z-10">
          
          {/* Signatures */}
          <div className="md:col-span-2 flex flex-wrap items-end gap-8 justify-center md:justify-start">
            {signaturesList.length > 0 ? (
              signaturesList.map((sig, idx) => (
                <div key={idx} className="text-center min-w-[160px]">
                  <div className="h-14 flex items-center justify-center mb-1">
                    {sig.imageUrl ? (
                      <Image
                        src={sig.imageUrl}
                        alt={sig.name}
                        width={160}
                        height={50}
                        className="max-h-14 object-contain"
                      />
                    ) : (
                      <span className="font-serif italic text-lg text-gray-400">Signature</span>
                    )}
                  </div>
                  <div className="border-t border-gray-400 pt-1">
                    <p className="font-semibold text-xs text-gray-900">{sig.name}</p>
                    {sig.title && <p className="text-[10px] text-gray-500">{sig.title}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center min-w-[160px]">
                <div className="h-14 flex items-center justify-center mb-1">
                  <span className="font-serif italic text-[#064e3b] font-bold text-xl">Ilm Platform</span>
                </div>
                <div className="border-t border-gray-400 pt-1">
                  <p className="font-semibold text-xs text-gray-900">Authorized Signature</p>
                  <p className="text-[10px] text-gray-500">Ilm Academic Directorate</p>
                </div>
              </div>
            )}
          </div>

          {/* Unique ID & QR Verification */}
          <div className="flex items-center justify-end gap-4 text-right">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Certificate ID</p>
              <p className="font-mono text-xs font-bold text-gray-900">{certificate.certificateId}</p>
              <p className="text-[9px] text-emerald-800 font-medium mt-0.5">Authentic & Verified</p>
            </div>
            {qrCodeUrl && (
              <div className="p-1 bg-white border border-gray-300 rounded-lg shadow-sm">
                <img src={qrCodeUrl} alt="Verification QR Code" className="w-16 h-16" />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

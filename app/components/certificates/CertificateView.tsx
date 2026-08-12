"use client";

import { FiAward, FiCalendar, FiClock, FiShield } from "react-icons/fi";
import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface CertificateViewProps {
  certificate: {
    certificateId: string;
    studentName: string;
    title: string;
    instructorName: string | null;
    completionDate: string | Date;
    issuedAt: string | Date;
    courseDuration: number | null;
    verificationUrl: string | null;
  };
  signature?: {
    name: string;
    title: string | null;
    imageUrl: string;
  } | null;
}

export function CertificateView({ certificate, signature }: CertificateViewProps) {
  const completionDate = certificate.completionDate ? new Date(certificate.completionDate) : null;
  const issuedDate = new Date(certificate.issuedAt);
  const durationHours = certificate.courseDuration ? Math.round(certificate.courseDuration / 60) : null;
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (certificate.verificationUrl) {
      QRCode.toDataURL(certificate.verificationUrl, {
        width: 100,
        margin: 1,
        color: {
          dark: "#1a1510",
          light: "#ffffff",
        },
      }).then(setQrCodeUrl);
    }
  }, [certificate.verificationUrl]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white text-gray-900">
      {/* Certificate Container */}
      <div className="relative border-8 border-double border-amber-600/20 p-8 md:p-12 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30">
        
        {/* Decorative Corner Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 border-t-4 border-l-4 border-amber-600/30 rounded-tl-3xl" />
        <div className="absolute top-0 right-0 w-32 h-32 border-t-4 border-r-4 border-amber-600/30 rounded-tr-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 border-b-4 border-l-4 border-amber-600/30 rounded-bl-3xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-b-4 border-r-4 border-amber-600/30 rounded-br-3xl" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
              <FiAward className="text-white text-3xl" />
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-amber-800 tracking-tight mb-2">
            Certificate of Completion
          </h1>
          <p className="text-gray-600 text-lg">Ilm Platform - Islamic Knowledge Portal</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent mb-8" />

        {/* Certificate Content */}
        <div className="space-y-6 mb-8">
          {/* Student Name */}
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-gray-500 mb-2">This certifies that</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900">
              {certificate.studentName}
            </h2>
          </div>

          {/* Course Title */}
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-gray-500 mb-2">Has successfully completed</p>
            <h3 className="font-display text-2xl md:text-3xl font-semibold text-amber-800">
              {certificate.title}
            </h3>
          </div>

          {/* Course Details */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-sm text-gray-600">
            {certificate.instructorName && (
              <div className="flex items-center gap-2">
                <FiShield className="text-amber-600" size={16} />
                <span>Instructor: {certificate.instructorName}</span>
              </div>
            )}
            {durationHours && (
              <div className="flex items-center gap-2">
                <FiClock className="text-amber-600" size={16} />
                <span>Duration: {durationHours} hours</span>
              </div>
            )}
          </div>
        </div>

        {/* Dates Section */}
        <div className={`grid gap-8 mb-8 ${completionDate ? "grid-cols-2" : "grid-cols-1"}`}>
          {completionDate && (
            <div className="text-center p-4 bg-amber-50/50 rounded-lg border border-amber-200">
              <div className="flex items-center justify-center gap-2 text-amber-700 mb-1">
                <FiCalendar size={16} />
                <span className="text-xs uppercase tracking-wider">Completed</span>
              </div>
              <p className="font-semibold text-gray-900">
                {completionDate.toLocaleDateString("en-US", { 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}
              </p>
            </div>
          )}
          <div className="text-center p-4 bg-amber-50/50 rounded-lg border border-amber-200">
            <div className="flex items-center justify-center gap-2 text-amber-700 mb-1">
              <FiCalendar size={16} />
              <span className="text-xs uppercase tracking-wider">Issued</span>
            </div>
            <p className="font-semibold text-gray-900">
              {issuedDate.toLocaleDateString("en-US", { 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}
            </p>
          </div>
        </div>

        {/* Signature Section */}
        <div className="flex items-end justify-between gap-8 mb-8">
          <div className="flex-1 text-center">
            {signature?.imageUrl ? (
              <div className="mb-2 h-16 flex items-center justify-center">
                <Image 
                  src={signature.imageUrl} 
                  alt={signature.name}
                  width={200}
                  height={60}
                  className="max-h-16 object-contain"
                />
              </div>
            ) : (
              <div className="mb-2 h-16 flex items-center justify-center text-2xl font-script text-gray-400 italic">
                Signature
              </div>
            )}
            <div className="border-t-2 border-gray-400 pt-2">
              <p className="font-semibold text-gray-900">{signature?.name || "Ilm Platform"}</p>
              {signature?.title && (
                <p className="text-xs text-gray-600">{signature.title}</p>
              )}
            </div>
          </div>
          
          <div className="flex-1 text-center">
            <div className="mb-2 text-sm text-gray-500">
              Certificate ID
            </div>
            <div className="border-t-2 border-gray-400 pt-2">
              <p className="font-mono text-sm font-semibold text-gray-900">
                {certificate.certificateId}
              </p>
            </div>
          </div>
        </div>

        {/* Verification Badge */}
        {certificate.verificationUrl && (
          <div className="text-center space-y-3">
            {qrCodeUrl && (
              <div className="flex justify-center">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code for verification" 
                  className="w-24 h-24 border-2 border-gray-300 rounded-lg"
                />
              </div>
            )}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-xs text-gray-600">
              <FiShield size={12} />
              <span>Verify at: {new URL(certificate.verificationUrl).hostname}/verify/{certificate.certificateId}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

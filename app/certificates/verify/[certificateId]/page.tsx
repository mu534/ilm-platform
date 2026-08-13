import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prism";
import { CertificateView } from "../../../components/certificates/CertificateView";
import { FiShield, FiAlertTriangle, FiCheckCircle, FiArrowLeft, FiHome, FiBookOpen } from "react-icons/fi";
import Link from "next/link";

interface Props {
  params: Promise<{ certificateId: string }>;
}

async function getCertificate(certificateId: string) {
  return prisma.certificate.findUnique({
    where: { certificateId },
    include: {
      user: {
        select: { name: true, email: true },
      },
      course: {
        select: { title: true, slug: true },
      },
      revokedBy: {
        select: { name: true },
      },
      audits: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
}

export default async function PublicCertificateVerificationPage({ params }: Props) {
  const { certificateId } = await params;
  const certificate = await getCertificate(certificateId);

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertTriangle className="text-red-600 text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Certificate Not Found</h1>
          <p className="text-gray-600 text-sm mb-6">
            No valid record exists for certificate ID <code className="bg-gray-100 px-2 py-1 rounded text-red-600 font-mono text-xs font-bold">{certificateId}</code>.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#064e3b] text-white rounded-xl font-semibold text-sm hover:bg-[#047857] transition-colors"
          >
            <FiHome size={16} /> Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const isRevoked = certificate.isRevoked;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-100 flex flex-col">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-serif text-lg sm:text-xl font-bold text-[#064e3b] hover:opacity-90 transition-opacity"
          >
            <span>🌙</span>
            <span>Ilm Platform</span>
          </Link>
          <div className="hidden sm:block h-4 w-px bg-gray-300" />
          <span className="hidden sm:inline-block text-xs font-medium text-gray-500">
            Certificate Verification Portal
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard/certificates"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FiArrowLeft size={14} />
            <span>My Certificates</span>
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#064e3b] text-white text-xs font-semibold hover:bg-[#047857] transition-colors"
          >
            <FiBookOpen size={14} />
            <span className="hidden sm:inline">Explore Courses</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Verification Status Banner */}
        <div className="text-center">
          {isRevoked ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-semibold mb-4 border border-red-200">
              <FiAlertTriangle size={16} />
              <span>Certificate Revoked</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-900 rounded-full text-sm font-semibold mb-4 border border-emerald-200">
              <FiCheckCircle size={16} className="text-emerald-700" />
              <span>Authentic Verified Certificate</span>
            </div>
          )}

          <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Certificate Verification System
          </h1>
          <p className="text-gray-600 text-sm max-w-xl mx-auto">
            This page provides official proof of course completion verified against the Ilm Platform database.
          </p>
        </div>

        {/* Certificate Component Rendering */}
        <div className="bg-white rounded-2xl shadow-xl p-2 md:p-6 border border-gray-100">
          <CertificateView
            certificate={{
              certificateId: certificate.certificateId!,
              studentName: certificate.studentName || certificate.user.name || "Student",
              title: certificate.title || certificate.course.title,
              instructorName: certificate.instructorName,
              completionDate: certificate.completionDate,
              issuedAt: certificate.issuedAt,
              courseDuration: certificate.courseDuration,
              verificationUrl: certificate.verificationUrl,
              certificateTemplateVersion: certificate.certificateTemplateVersion,
              signaturesSnapshot: certificate.signaturesSnapshot,
              isRevoked: certificate.isRevoked,
              revocationReason: certificate.revocationReason,
            }}
          />
        </div>

        {/* Database Source of Truth Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100 space-y-6">
          <h2 className="font-serif text-xl font-bold text-gray-900 flex items-center gap-2">
            <FiShield className="text-[#064e3b]" />
            Official Verification Details (Database Record)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Status</p>
              <p className="font-semibold">
                {isRevoked ? (
                  <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                    Revoked ({certificate.revokedAt ? new Date(certificate.revokedAt).toLocaleDateString("en-US") : "Date unknown"})
                  </span>
                ) : (
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Valid & Active
                  </span>
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Certificate ID</p>
              <p className="font-mono font-bold text-gray-900">{certificate.certificateId}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Recipient Name</p>
              <p className="font-semibold text-gray-900">{certificate.studentName || certificate.user.name}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Course Title</p>
              <p className="font-semibold text-gray-900">{certificate.title || certificate.course.title}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Issue Date</p>
              <p className="font-medium text-gray-900">
                {new Date(certificate.issuedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Issuing Organization</p>
              <p className="font-semibold text-gray-900">Ilm Platform</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Template Version</p>
              <p className="font-mono text-xs text-gray-700">{certificate.certificateTemplateVersion || "v1.0"}</p>
            </div>

            {isRevoked && (
              <div className="md:col-span-2 p-4 bg-red-50 rounded-xl border border-red-200 space-y-1">
                <p className="text-xs text-red-800 font-semibold uppercase tracking-wider">Revocation Reason</p>
                <p className="text-sm text-red-900">{certificate.revocationReason || "Reason specified by administrator"}</p>
                {certificate.revokedBy && (
                  <p className="text-xs text-red-700">Revoked by: {certificate.revokedBy.name}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-500 border-t border-gray-200/60 bg-white/50 mt-auto">
        <p>© {new Date().getFullYear()} Ilm Platform. All rights reserved. Verifiable database record.</p>
      </footer>
    </div>
  );
}

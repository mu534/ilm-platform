import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prism";
import { CertificateView } from "../../../components/certificates/CertificateView";
import {
  FiShield, FiAlertTriangle, FiCheckCircle,
  FiArrowLeft, FiBookOpen, FiAward,
} from "react-icons/fi";
import Link from "next/link";
import { GiMoon } from "react-icons/gi";

interface Props {
  params: Promise<{ certificateId: string }>;
}

async function getCertificate(certificateId: string) {
  return prisma.certificate.findUnique({
    where: { certificateId },
    include: {
      user:      { select: { name: true, email: true } },
      course:    { select: { title: true, slug: true } },
      revokedBy: { select: { name: true } },
      audits:    { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
}

export async function generateMetadata({ params }: Props) {
  const { certificateId } = await params;
  const cert = await prisma.certificate.findUnique({
    where:  { certificateId },
    select: { studentName: true, title: true },
  });
  return {
    title: cert
      ? `Certificate — ${cert.studentName ?? "Student"} | Ilm Platform`
      : "Certificate Verification | Ilm Platform",
  };
}

export default async function PublicCertificateVerificationPage({ params }: Props) {
  const { certificateId } = await params;
  const certificate = await getCertificate(certificateId);

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!certificate) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <div className="max-w-md w-full glass-card rounded-3xl p-10 border border-red-500/20 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <FiAlertTriangle className="text-red-400" size={28} />
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Certificate Not Found
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            No valid record exists for certificate ID{" "}
            <code className="font-mono text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
              {certificateId}
            </code>
          </p>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold text-sm transition-colors"
          >
            Back to Ilm Platform
          </Link>
        </div>
      </div>
    );
  }

  const isRevoked = certificate.isRevoked;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-secondary)]/95 backdrop-blur-md px-4 sm:px-8">
        <div className="max-w-5xl mx-auto h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <GiMoon className="text-[var(--accent)] text-xl group-hover:rotate-12 transition-transform" />
            <span className="font-display text-lg font-semibold">
              <span className="gradient-text">Ilm</span>
              <span className="text-[var(--text-secondary)] ml-1">Platform</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/certificates"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
            >
              <FiArrowLeft size={12} /> My Certificates
            </Link>
            <Link
              href="/courses"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-semibold transition-colors"
            >
              <FiBookOpen size={12} /> Explore Courses
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* ── Verification status banner ── */}
        <div className="text-center space-y-3">
          {isRevoked ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
              <FiAlertTriangle size={14} /> Certificate Revoked
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
              <FiCheckCircle size={14} /> Authentic Verified Certificate
            </div>
          )}
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Certificate Verification
          </h1>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            This is an official verification of course completion from the Ilm Platform database.
          </p>
        </div>

        {/* ── Certificate visual ── */}
        <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border-strong)]">
          <CertificateView
            certificate={{
              certificateId:              certificate.certificateId!,
              studentName:                certificate.studentName || certificate.user.name || "Student",
              title:                      certificate.title || certificate.course.title,
              instructorName:             certificate.instructorName,
              completionDate:             certificate.completionDate,
              issuedAt:                   certificate.issuedAt,
              courseDuration:             certificate.courseDuration,
              verificationUrl:            certificate.verificationUrl,
              certificateTemplateVersion: certificate.certificateTemplateVersion,
              signaturesSnapshot:         certificate.signaturesSnapshot,
              isRevoked:                  certificate.isRevoked,
              revocationReason:           certificate.revocationReason,
            }}
          />
        </div>

        {/* ── Verification details ── */}
        <div className="glass-card rounded-2xl p-6 border border-[var(--border)] space-y-5">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <FiShield className="text-[var(--accent)]" size={16} />
            Official Verification Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              {
                label: "Status",
                value: isRevoked ? (
                  <span className="text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                    Revoked
                  </span>
                ) : (
                  <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                    Valid &amp; Active
                  </span>
                ),
              },
              { label: "Certificate ID", value: <span className="font-mono text-xs text-[var(--text-secondary)]">{certificate.certificateId}</span> },
              { label: "Recipient",      value: certificate.studentName || certificate.user.name },
              { label: "Course",         value: certificate.title || certificate.course.title },
              {
                label: "Issue Date",
                value: new Date(certificate.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
              },
              { label: "Issuer",         value: "Ilm Platform" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[var(--bg-secondary)] rounded-xl p-3.5 border border-[var(--border)]">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">{label}</p>
                <p className="font-semibold text-[var(--text-primary)]">{value}</p>
              </div>
            ))}
          </div>

          {/* Revocation reason */}
          {isRevoked && (
            <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20 space-y-1">
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Revocation Reason</p>
              <p className="text-sm text-[var(--text-secondary)]">{certificate.revocationReason ?? "Specified by administrator"}</p>
              {certificate.revokedBy && (
                <p className="text-xs text-[var(--text-muted)]">Revoked by: {certificate.revokedBy.name}</p>
              )}
            </div>
          )}
        </div>

        {/* ── CTA ── */}
        <div className="text-center space-y-3 pb-4">
          <p className="text-sm text-[var(--text-muted)]">Want to earn your own certificate?</p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] text-white font-semibold text-sm transition-all hover:scale-[1.01] shadow-md"
          >
            <FiAward size={15} /> Browse Courses
          </Link>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] py-5 text-center text-xs text-[var(--text-muted)]">
        © {new Date().getFullYear()} Ilm Platform · Certificate Verification Portal
      </footer>
    </div>
  );
}

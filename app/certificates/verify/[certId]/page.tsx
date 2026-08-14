import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "../../../lib/prism";
import {
  FiCheckCircle, FiXCircle, FiAward, FiCalendar,
  FiUser, FiBookOpen, FiAlertTriangle, FiExternalLink,
} from "react-icons/fi";

interface Props {
  params: Promise<{ certId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { certId } = await params;
  return {
    title:       `Certificate Verification — ${certId} | Ilm Platform`,
    description: "Verify the authenticity of an Ilm Platform certificate of completion.",
    robots:      { index: false, follow: false },
  };
}

async function getCertificate(certId: string) {
  if (!/^ILM-CERT-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(certId)) {
    return null;
  }
  return prisma.certificate.findUnique({
    where: { certificateId: certId },
    select: {
      id:              true,
      certificateId:   true,
      studentName:     true,
      title:           true,
      instructorName:  true,
      completionDate:  true,
      issuedAt:        true,
      isRevoked:       true,
      revokedAt:       true,
      revocationReason: true,
      course: {
        select: {
          id:         true,
          title:      true,
          slug:       true,
          thumbnailUrl: true,
          difficulty: true,
        },
      },
    },
  });
}

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default async function CertificateVerifyPage({ params }: Props) {
  const { certId } = await params;
  const cert = await getCertificate(certId);

  // Unknown / malformed ID
  if (cert === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full glass-card rounded-3xl p-10 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <FiXCircle className="text-red-400 text-3xl" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Invalid Certificate ID
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            The certificate ID <code className="font-mono text-xs bg-[var(--bg-secondary)] px-2 py-0.5 rounded">{certId}</code> is not in the correct format.
            Valid IDs follow the pattern <code className="font-mono text-xs bg-[var(--bg-secondary)] px-2 py-0.5 rounded">ILM-CERT-XXXXXXXX</code>.
          </p>
          <Link href="/" className="btn-secondary text-sm inline-flex items-center gap-2">
            ← Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Not found
  if (!cert) notFound();

  // Revoked
  if (cert.isRevoked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full space-y-6">
          <div className="glass-card rounded-3xl p-10 border border-red-500/20 bg-red-500/5 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <FiAlertTriangle className="text-red-400 text-3xl" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-3">
                <FiXCircle size={12} /> REVOKED
              </div>
              <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
                Certificate Revoked
              </h1>
            </div>
            <div className="text-left bg-[var(--bg-card)] rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Certificate ID</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">{cert.certificateId}</span>
              </div>
              {cert.revokedAt && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Revoked on</span>
                  <span className="text-red-400">{formatDate(cert.revokedAt)}</span>
                </div>
              )}
              {cert.revocationReason && (
                <div>
                  <span className="text-[var(--text-muted)] block mb-1">Reason</span>
                  <span className="text-red-300">{cert.revocationReason}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              This certificate has been revoked by Ilm Platform administrators and is no longer valid.
            </p>
          </div>
          <div className="text-center">
            <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
              ← Return to Ilm Platform
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Valid certificate
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-6">

        {/* Verification badge */}
        <div className="glass-card rounded-3xl p-8 border border-emerald-500/20 bg-emerald-500/5 space-y-6">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <FiCheckCircle className="text-emerald-400 text-3xl" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                <FiCheckCircle size={12} /> VERIFIED AUTHENTIC
              </div>
              <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
                Valid Certificate
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                This certificate was issued by Ilm Platform and is authentic.
              </p>
            </div>
          </div>

          {/* Certificate details */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-5 space-y-4">

            {/* Student */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
                <FiUser size={14} className="text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Recipient</p>
                <p className="text-base font-bold text-[var(--text-primary)] mt-0.5">{cert.studentName}</p>
              </div>
            </div>

            <div className="h-px bg-[var(--border)]" />

            {/* Course */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
                <FiBookOpen size={14} className="text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Course Completed</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{cert.title}</p>
                {cert.instructorName && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">by {cert.instructorName}</p>
                )}
              </div>
            </div>

            <div className="h-px bg-[var(--border)]" />

            {/* Dates */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
                <FiCalendar size={14} className="text-[var(--accent)]" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">Dates</p>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Completion</span>
                  <span className="text-[var(--text-primary)] font-medium">{formatDate(cert.completionDate ?? cert.issuedAt)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-[var(--text-muted)]">Issued</span>
                  <span className="text-[var(--text-primary)] font-medium">{formatDate(cert.issuedAt)}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-[var(--border)]" />

            {/* Certificate ID */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiAward size={14} className="text-[var(--accent)]" />
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  Certificate ID
                </span>
              </div>
              <code className="font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-1 rounded-lg">
                {cert.certificateId}
              </code>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {cert.course && (
              <Link
                href={`/courses/${cert.course.slug}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
              >
                <FiExternalLink size={13} /> View Course
              </Link>
            )}
            <Link
              href={`/api/certificates/${cert.id}/pdf`}
              target="_blank"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-sm font-semibold transition-colors"
            >
              <FiAward size={13} /> View Certificate
            </Link>
          </div>
        </div>

        {/* Issuer attribution */}
        <div className="text-center space-y-1">
          <p className="text-xs text-[var(--text-muted)]">
            Issued and verified by{" "}
            <Link href="/" className="text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors font-semibold">
              Ilm Platform
            </Link>
            {" "}— Center of Academic Excellence
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">
            This verification page confirms the authenticity of this certificate.
            Certificate ID: <span className="font-mono">{cert.certificateId}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

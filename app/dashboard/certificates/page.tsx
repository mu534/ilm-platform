import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import Link from "next/link";
import { FiAward, FiArrowLeft, FiDownload, FiExternalLink } from "react-icons/fi";import { formatDate } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";

export const metadata = { title: "My Certificates" };

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user) redirect("/login?callbackUrl=/dashboard/certificates");

  const certificates = await prisma.certificate.findMany({
    where: { userId: user.id },
    orderBy: { issuedAt: "desc" },
    include: {
      course: {
        select: {
          id: true, title: true, slug: true, thumbnailUrl: true,
          scholar: {
            select: { user: { select: { name: true } } },
          },
        },
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-8">
        <FiArrowLeft size={14} /> Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <FiAward className="text-[var(--accent)]" />
          My Certificates
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          {certificates.length} certificate{certificates.length !== 1 ? "s" : ""} earned
        </p>
      </div>

      {certificates.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <FiAward className="text-[var(--text-muted)] text-5xl mx-auto mb-4 opacity-30" />
          <p className="text-[var(--text-primary)] font-semibold mb-2">No certificates yet</p>
          <p className="text-[var(--text-muted)] text-sm mb-6">
            Complete a course to earn your first certificate.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-xl text-sm font-semibold hover:scale-105 transition-all"
          >
            <FiAward size={14} /> Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="glass-card rounded-2xl p-6 border border-[var(--border-strong)] hover:border-[var(--accent)] hover:shadow-[var(--shadow-md)] transition-all duration-300 relative overflow-hidden"
            >
              {/* Decorative accent line */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600" />

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center">
                  <FiAward className="text-[var(--accent)] text-2xl" />
                </div>
                {cert.certificateUrl && (
                  <a
                    href={cert.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors px-3 py-1.5 rounded-lg border border-[var(--border-strong)] hover:bg-[var(--accent-dim)]"
                  >
                    <FiDownload size={12} /> Download
                  </a>
                )}
              </div>

              {/* Certificate title */}
              <h3 className="font-display text-base font-semibold text-[var(--text-primary)] mb-1 leading-snug">
                {cert.title}
              </h3>

              {/* Course */}
              {cert.course && (
                <div className="mb-3">
                  <Link
                    href={`/courses/${cert.course.slug}`}
                    className="text-sm text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors flex items-center gap-1"
                  >
                    <FiExternalLink size={11} />
                    {cert.course.title}
                  </Link>
                  {cert.course.scholar && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      by {cert.course.scholar.user.name}
                    </p>
                  )}
                </div>
              )}

                {/* Date */}
                <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                  <p className="text-xs text-[var(--text-muted)]">
                    Issued on {formatDate(cert.issuedAt)}
                  </p>
                  <a
                    href={cert.certificateUrl ?? `/api/certificates/${cert.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors font-medium"
                  >
                    <FiDownload size={12} /> View / Download
                  </a>
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import Link from "next/link";
import { FiAward, FiDownload, FiCompass } from "react-icons/fi";
import { formatDate } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";

export const metadata = { title: "Certificates | Ilm Platform" };

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
          id: true,
          title: true,
          slug: true,
          thumbnailUrl: true,
          scholar: {
            select: { user: { select: { name: true } } },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <FiAward className="text-[var(--accent)]" />
            My Certificates
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Verified course completion credentials and achievements.
          </p>
        </div>

        <div className="px-4 py-2 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--accent)] self-start md:self-auto">
          {certificates.length} Certificate{certificates.length !== 1 ? "s" : ""} Earned
        </div>
      </div>

      {certificates.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] text-2xl mx-auto">
            <FiAward />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
              No certificates earned yet
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
              Complete any course and pass its requirements to earn your official certificate of completion.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/courses"
              className="btn-primary px-6 py-3 text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center gap-2 shadow-md"
            >
              <FiCompass size={16} /> Explore Courses
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="glass-card rounded-2xl p-6 border border-[var(--border-strong)] hover:border-[var(--accent)] hover:shadow-lg transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600" />

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center flex-shrink-0">
                    <FiAward className="text-[var(--accent)] text-2xl" />
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    Verified
                  </span>
                </div>

                <div>
                  <h2 className="font-display text-lg font-bold text-[var(--text-primary)] leading-snug">
                    {cert.title}
                  </h2>
                  {cert.course && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Course: <span className="text-[var(--text-primary)] font-medium">{cert.course.title}</span>
                      {cert.course.scholar && (
                        <span> · by {cert.course.scholar.user.name}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between">
                <p className="text-xs text-[var(--text-muted)]">
                  Issued {formatDate(cert.issuedAt)}
                </p>
                <a
                  href={cert.certificateUrl ?? `/api/certificates/${cert.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-4 py-2 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
                >
                  <FiDownload size={13} /> View / Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

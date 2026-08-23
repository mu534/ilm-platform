"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CertificateView } from "../../../components/certificates/CertificateView";
import { FiLoader, FiAlertTriangle, FiCheckCircle, FiShield } from "react-icons/fi";

interface CertData {
  id:               string;
  certificateId:    string;
  studentName:      string;
  title:            string;
  instructorName:   string | null;
  issuedAt:         string;
  completionDate:   string | null;
  courseDuration:   number | null;
  isRevoked:        boolean;
  revokedAt:        string | null;
  revocationReason: string | null;
  verificationUrl:  string | null;
  certificateTemplateVersion: string | null;
  signaturesSnapshot: unknown;
}

export default function VerifyCertificatePage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [cert,    setCert]    = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!certificateId) return;
    fetch(`/api/certificates/verify/${certificateId}`)
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: CertData }) => {
        if (d.success && d.data) setCert(d.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [certificateId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FiLoader className="animate-spin text-[var(--accent)]" size={32} />
      </div>
    );
  }

  if (notFound || !cert) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center space-y-4 border border-red-500/20 bg-red-500/5">
          <FiAlertTriangle className="text-red-400 mx-auto" size={40} />
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Certificate Not Found
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            No certificate with ID <span className="font-mono text-[var(--text-primary)]">{certificateId}</span> was found.
            It may have been entered incorrectly or does not exist.
          </p>
          <Link href="/" className="btn-secondary inline-block mt-2">← Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Verification status banner */}
        <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium ${
          cert.isRevoked
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        }`}>
          {cert.isRevoked
            ? <FiAlertTriangle size={18} />
            : <FiCheckCircle size={18} />
          }
          <div>
            <p className="font-semibold">
              {cert.isRevoked ? "This certificate has been revoked" : "✓ Authentic Certificate Verified"}
            </p>
            <p className="text-xs font-normal mt-0.5 opacity-80">
              {cert.isRevoked
                ? `Revoked on ${new Date(cert.revokedAt!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}${cert.revocationReason ? ` — ${cert.revocationReason}` : ""}`
                : `Certificate ID: ${cert.certificateId} · Issued by Ilm Platform`
              }
            </p>
          </div>
        </div>

        {/* Certificate */}
        <CertificateView certificate={cert} />

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] pb-6">
          <FiShield size={12} />
          <span>Verified by Ilm Platform · <Link href="/" className="hover:text-[var(--accent)] transition-colors">ilmplatform.com</Link></span>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { FiHome, FiSearch, FiBookOpen, FiArrowRight } from "react-icons/fi";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center px-4 py-16">
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, var(--accent-dim), transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 group">
          <Image src="/logo.png" alt="Ilm Platform" width={36} height={36} className="object-contain group-hover:scale-105 transition-transform" />
          <span className="font-display text-xl font-semibold">
            <span className="gradient-text">Ilm</span>
            <span className="text-[var(--text-secondary)] ml-1">Platform</span>
          </span>
        </Link>

        {/* 404 */}
        <div className="glass-card rounded-3xl p-10 border border-[var(--border-strong)] space-y-5">
          <div className="w-20 h-20 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto">
            <FiSearch className="text-[var(--accent)]" size={36} />
          </div>

          <div>
            <p className="text-6xl font-display font-bold gradient-text mb-3">404</p>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
              Page Not Found
            </h1>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] text-white font-semibold text-sm transition-all hover:scale-[1.01] shadow-md"
            >
              <FiHome size={14} /> Back to Home
            </Link>
            <Link
              href="/courses"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] text-sm transition-colors"
            >
              <FiBookOpen size={13} /> Browse Courses <FiArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

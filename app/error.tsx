"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FiAlertCircle, FiRefreshCw, FiHome } from "react-icons/fi";
import { GiMoon } from "react-icons/gi";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center px-4 py-16">
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(239,68,68,0.06), transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 group">
          <GiMoon className="text-[var(--accent)] text-2xl group-hover:rotate-12 transition-transform" />
          <span className="font-display text-xl font-semibold">
            <span className="gradient-text">Ilm</span>
            <span className="text-[var(--text-secondary)] ml-1">Platform</span>
          </span>
        </Link>

        <div className="glass-card rounded-3xl p-10 border border-red-500/20 bg-red-500/5 space-y-5">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <FiAlertCircle className="text-red-400" size={36} />
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
              Something Went Wrong
            </h1>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              An unexpected error occurred. This has been noted and we&apos;ll look into it.
            </p>
            {error.digest && (
              <p className="text-[11px] text-[var(--text-muted)] mt-2 font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] text-white font-semibold text-sm transition-all hover:scale-[1.01] shadow-md"
            >
              <FiRefreshCw size={14} /> Try Again
            </button>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] text-sm transition-colors"
            >
              <FiHome size={13} /> Back to Home
            </Link>
          </div>

          {process.env.NODE_ENV === "development" && (
            <details className="text-left mt-2">
              <summary className="cursor-pointer text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                Technical details (dev only)
              </summary>
              <pre className="mt-2 p-3 bg-[var(--bg-secondary)] rounded-lg text-[10px] overflow-auto max-h-40 text-[var(--text-muted)] text-left">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

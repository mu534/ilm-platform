"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GiMoon, GiStarFormation } from "react-icons/gi";
import { FiCheckCircle, FiAlertCircle, FiMail, FiLoader } from "react-icons/fi";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token        = searchParams?.get("token") ?? "";

  const [status,  setStatus]  = useState<"loading" | "success" | "error" | "resend">("loading");
  const [message, setMessage] = useState("");
  const [email,   setEmail]   = useState("");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  useEffect(() => {
    if (!token) { setStatus("resend"); return; }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStatus("success");
          setMessage(d.data.message);
        } else {
          setStatus("error");
          setMessage(d.error ?? "Verification failed");
        }
      })
      .catch(() => { setStatus("error"); setMessage("Something went wrong."); });
  }, [token]);

  const resend = async () => {
    if (!email) return;
    setSending(true);
    try {
      await fetch("/api/auth/verify-email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 hero-bg opacity-60" />
      <div className="absolute inset-0 pattern-overlay opacity-40" />

      <div className="relative w-full max-w-sm animate-fadeInUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] mb-4 mx-auto">
            <GiMoon className="text-[var(--accent)] text-3xl" />
            <GiStarFormation className="absolute -top-1 -right-1 text-[var(--accent-light)] text-xs animate-spin-slow" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Email Verification</h1>
        </div>

        <div className="glass-card rounded-2xl p-8 text-center">
          {/* Loading */}
          {status === "loading" && (
            <div className="space-y-3">
              <FiLoader className="text-[var(--accent)] text-4xl mx-auto animate-spin" />
              <p className="text-[var(--text-secondary)] text-sm">Verifying your email…</p>
            </div>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <FiCheckCircle className="text-emerald-400 text-3xl" />
              </div>
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">Email Verified!</h2>
              <p className="text-[var(--text-muted)] text-sm">{message}</p>
              <Link href="/login" className="btn-primary inline-flex mx-auto">
                Sign In Now
              </Link>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <FiAlertCircle className="text-red-400 text-3xl" />
              </div>
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">Verification Failed</h2>
              <p className="text-[var(--text-muted)] text-sm">{message}</p>
              <button
                onClick={() => setStatus("resend")}
                className="btn-secondary inline-flex mx-auto"
              >
                Request New Link
              </button>
            </div>
          )}

          {/* Resend */}
          {status === "resend" && (
            <div className="space-y-4">
              {sent ? (
                <>
                  <FiCheckCircle className="text-emerald-400 text-4xl mx-auto" />
                  <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">Email Sent!</h2>
                  <p className="text-[var(--text-muted)] text-sm">
                    Check your inbox for a new verification link.
                  </p>
                  <Link href="/login" className="btn-secondary inline-flex mx-auto text-sm">
                    Back to Sign In
                  </Link>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto">
                    <FiMail className="text-[var(--accent)] text-3xl" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">Resend Verification</h2>
                  <p className="text-[var(--text-muted)] text-sm">
                    Enter your email address and we&apos;ll send a new verification link.
                  </p>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-themed"
                  />
                  <button
                    onClick={resend}
                    disabled={sending || !email}
                    className="btn-primary w-full"
                  >
                    {sending ? <><FiLoader className="animate-spin" size={15} /> Sending…</> : "Send Verification Email"}
                  </button>
                  <Link href="/login" className="block text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                    ← Back to Sign In
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent-dim)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { GiMoon, GiStarFormation } from "react-icons/gi";
import { FiMail, FiArrowLeft, FiCheckCircle, FiLoader } from "react-icons/fi";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 hero-bg opacity-60" />
      <div className="absolute inset-0 pattern-overlay opacity-40" />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--accent-dim) 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-sm animate-fadeInUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] mb-4 mx-auto animate-pulse-accent">
            <GiMoon className="text-[var(--accent)] text-3xl" />
            <GiStarFormation className="absolute -top-1 -right-1 text-[var(--accent-light)] text-xs animate-spin-slow" />
          </div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Forgot Password
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            We&apos;ll send a reset link to your email
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <FiCheckCircle className="text-emerald-400 text-3xl" />
              </div>
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
                Check your inbox
              </h2>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                If <strong className="text-[var(--text-secondary)]">{email}</strong> is registered,
                you&apos;ll receive a password reset link shortly.
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Don&apos;t see it? Check your spam folder.
              </p>
              <Link href="/login" className="btn-secondary inline-flex mx-auto text-sm">
                <FiArrowLeft size={13} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={15} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-themed pl-10"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                  {loading ? (
                    <><FiLoader className="animate-spin" size={15} /> Sending…</>
                  ) : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                >
                  <FiArrowLeft size={13} /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

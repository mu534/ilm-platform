"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GiStarFormation } from "react-icons/gi";
import { FiLock, FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle, FiLoader } from "react-icons/fi";

function ResetContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams?.get("token") ?? "";

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState("");

  // Validate token on mount
  useEffect(() => {
    if (!token) { setTokenValid(false); setTokenError("No reset token found."); setValidating(false); return; }

    fetch(`/api/auth/reset-password?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setTokenValid(true); }
        else           { setTokenError(d.error ?? "Invalid or expired link."); }
      })
      .catch(() => setTokenError("Something went wrong."))
      .finally(() => setValidating(false));
  }, [token]);

  // Password strength
  const strength = password.length === 0 ? 0
    : password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 3
    : password.length >= 6 ? 2 : 1;
  const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];
  const strengthColor = ["", "bg-red-400", "bg-yellow-400", "bg-emerald-400"][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (strength < 3)         { setError("Password is not strong enough"); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(data.error ?? "Reset failed. Please try again.");
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
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Ilm Platform" width={80} height={80} className="object-contain" />
          </div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Reset Password
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            Choose a strong new password
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8">

          {/* Validating token */}
          {validating && (
            <div className="flex flex-col items-center gap-3 py-4">
              <FiLoader className="text-[var(--accent)] text-3xl animate-spin" />
              <p className="text-[var(--text-muted)] text-sm">Validating reset link…</p>
            </div>
          )}

          {/* Invalid token */}
          {!validating && !tokenValid && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <FiAlertCircle className="text-red-400 text-3xl" />
              </div>
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">Link Invalid</h2>
              <p className="text-[var(--text-muted)] text-sm">{tokenError}</p>
              <Link href="/forgot-password" className="btn-primary inline-flex mx-auto text-sm">
                Request New Link
              </Link>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <FiCheckCircle className="text-emerald-400 text-3xl" />
              </div>
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
                Password Reset!
              </h2>
              <p className="text-[var(--text-muted)] text-sm">
                Your password has been updated. Redirecting you to sign in…
              </p>
              <div className="w-6 h-6 border-2 border-[var(--accent-dim)] border-t-[var(--accent)] rounded-full animate-spin mx-auto" />
            </div>
          )}

          {/* Reset form */}
          {!validating && tokenValid && !success && (
            <>
              {error && (
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
                  <FiAlertCircle size={15} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1.5 uppercase tracking-wide">
                    New Password
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={15} />
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-themed pl-10 pr-10"
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      tabIndex={-1}
                    >
                      {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              strength >= i ? strengthColor : "bg-[var(--bg-secondary)]"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs ${["", "text-red-400", "text-yellow-400", "text-emerald-400"][strength]}`}>
                        {strengthLabel} password
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1.5 uppercase tracking-wide">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={15} />
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={`input-themed pl-10 ${
                        confirm && confirm !== password ? "error" : ""
                      }`}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                    />
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-400 mt-1.5">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="btn-primary w-full mt-2"
                >
                  {loading ? (
                    <><FiLoader className="animate-spin" size={15} /> Resetting…</>
                  ) : "Reset Password"}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link href="/login" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                  ← Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent-dim)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    }>
      <ResetContent />
    </Suspense>
  );
}

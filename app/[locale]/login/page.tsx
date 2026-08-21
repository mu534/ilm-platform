"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GiMoon, GiStarFormation } from "react-icons/gi";
import { FiMail, FiLock, FiAlertCircle, FiEye, FiEyeOff, FiLoader } from "react-icons/fi";

// ── Google SVG icon (no extra package needed) ────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent-dim)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const requestedCallbackUrl = searchParams?.get("callbackUrl");
  // If a specific callbackUrl was requested (e.g. from a protected link), honour it.
  // Otherwise, default destination after login is the home page "/".
  const callbackUrl  = requestedCallbackUrl && requestedCallbackUrl.startsWith("/")
    ? requestedCallbackUrl
    : "/";
  const urlError     = searchParams?.get("error");

  const [form,         setForm]         = useState({ email: "", password: "" });
  const [error,        setError]        = useState(
    urlError === "OAuthAccountNotLinked"
      ? "This email is linked to a different sign-in method."
      : ""
  );
  const [loading,      setLoading]      = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPw,       setShowPw]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email:    form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error.includes("verify")) {
        setError("Please verify your email before signing in. Check your inbox.");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } else {
      // Login successful — go to requested callbackUrl (or dashboard/home)
      router.push(callbackUrl);
      router.refresh();
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl });
    // Google redirects — no need to reset loading
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 hero-bg opacity-60" />
      <div className="absolute inset-0 pattern-overlay opacity-40" />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--accent-dim) 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-sm animate-fadeInUp">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] mb-4 animate-pulse-accent mx-auto">
            <GiMoon className="text-[var(--accent)] text-3xl" />
            <GiStarFormation className="absolute -top-1 -right-1 text-[var(--accent-light)] text-xs animate-spin-slow" />
          </div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Welcome Back
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            Sign in to continue your learning journey
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
              <FiAlertCircle className="flex-shrink-0 mt-0.5" size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* ── Google sign-in ── */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--accent)] text-[var(--text-primary)] text-sm font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mb-5"
          >
            {googleLoading ? (
              <FiLoader className="animate-spin" size={16} />
            ) : (
              <GoogleIcon />
            )}
            {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
          </button>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-[var(--text-muted)] bg-[var(--bg-card)]">
                or sign in with email
              </span>
            </div>
          </div>

          {/* ── Email/password form ── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <FiMail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  size={15}
                />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wide">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <FiLock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  size={15}
                />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  tabIndex={-1}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <><FiLoader className="animate-spin" size={15} /> Signing in…</>
              ) : "Sign In"}
            </button>
          </form>

          {/* Register link */}
          <div className="relative mt-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-[var(--text-muted)] bg-[var(--bg-card)]">
                New to Ilm Platform?
              </span>
            </div>
          </div>

          <Link href="/register" className="btn-secondary w-full text-center mt-5 block">
            Create Free Account
          </Link>

          {/* Verify email link */}
          <p className="text-center text-xs text-[var(--text-muted)] mt-4">
            Didn&apos;t receive verification email?{" "}
            <Link href="/verify-email" className="text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
              Resend it
            </Link>
          </p>
        </div>

        {/* Trust badge */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-5 flex items-center justify-center gap-1.5">
          <GiStarFormation className="text-[var(--accent)] text-xs" />
          Authentic Islamic Knowledge
          <GiStarFormation className="text-[var(--accent)] text-xs" />
        </p>
      </div>
    </div>
  );
}

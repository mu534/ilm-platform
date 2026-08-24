"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { GiMoon, GiStarFormation } from "react-icons/gi";
import { FiUser, FiMail, FiLock, FiAlertCircle, FiCheck, FiEye, FiEyeOff, FiLoader } from "react-icons/fi";

// ── Google SVG icon ───────────────────────────────────────────────────────────
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

export default function RegisterPage() {
  const router  = useRouter();

  const [form,    setForm]    = useState({ name: "", email: "", password: "", confirmPassword: "", country: "", termsAccepted: false, privacyAccepted: false });
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  // ── Google sign-up ───────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/" });
    // Google redirects — loading stays true
  };

  // ── Email registration ───────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.details) {
          const fe: Record<string, string> = {};
          Object.entries(data.details).forEach(([k, v]) => { fe[k] = (v as string[])[0]; });
          setErrors(fe);
        } else {
          setErrors({ general: data.error ?? "Registration failed" });
        }
      } else {
        setSuccess(true);
      }
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // ── Password strength ────────────────────────────────────────────────────────
  const pw = form.password;
  const strength      = pw.length === 0 ? 0 : pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) ? 3 : pw.length >= 6 ? 2 : 1;
  const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];
  const strengthColor = ["", "bg-red-400", "bg-yellow-400", "bg-emerald-400"][strength];

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
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Ilm Platform" width={80} height={80} className="object-contain" />
          </div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Create Account
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            Begin your journey of knowledge
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8">

          {/* ── Success state ── */}
          {success && (
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center mb-5">
              <FiCheck className="text-emerald-400" size={22} />
              <div>
                <p className="text-emerald-400 text-sm font-semibold">Account created!</p>
                <p className="text-[var(--text-muted)] text-xs mt-1">
                  Check your email for a verification link before signing in.
                </p>
              </div>
              <Link href="/login" className="btn-secondary text-sm px-4 py-2">
                Go to Sign In
              </Link>
            </div>
          )}

          {/* ── General error ── */}
          {errors.general && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
              <FiAlertCircle className="flex-shrink-0" size={16} />
              {errors.general}
            </div>
          )}

          {!success && (
            <>
              {/* ── Google sign-up ── */}
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

              {/* ── Divider ── */}
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border)]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-[var(--text-muted)] bg-[var(--bg-card)]">
                    or register with email
                  </span>
                </div>
              </div>

              {/* ── Email registration form ── */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Name */}
                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1.5 uppercase tracking-wide">
                    Full Name
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={15} />
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2.5 bg-[var(--bg-elevated)] border rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors ${errors.name ? "border-red-500/60" : "border-[var(--border-strong)]"}`}
                      placeholder="Your full name"
                      autoComplete="name"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                      <FiAlertCircle size={11} /> {errors.name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1.5 uppercase tracking-wide">
                    Email
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={15} />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2.5 bg-[var(--bg-elevated)] border rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors ${errors.email ? "border-red-500/60" : "border-[var(--border-strong)]"}`}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                      <FiAlertCircle size={11} /> {errors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1.5 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={15} />
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className={`w-full pl-10 pr-10 py-2.5 bg-[var(--bg-elevated)] border rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors ${errors.password ? "border-red-500/60" : "border-[var(--border-strong)]"}`}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      autoComplete="new-password"
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

                  {/* Strength bar */}
                  {pw.length > 0 && (
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

                  {errors.password && (
                    <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                      <FiAlertCircle size={11} /> {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs text-[var(--text-muted)] font-semibold mb-1.5 uppercase tracking-wide">Confirm Password</label>
                  <input id="confirmPassword" type={showPw ? "text" : "password"} required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className={`input-themed ${errors.confirmPassword ? "error" : ""}`} autoComplete="new-password" />
                  {errors.confirmPassword && <p className="text-xs text-red-400 mt-1.5"><FiAlertCircle size={11} className="inline" /> {errors.confirmPassword}</p>}
                </div>

                <div>
                  <label htmlFor="country" className="block text-xs text-[var(--text-muted)] font-semibold mb-1.5 uppercase tracking-wide">Country</label>
                  <input id="country" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={`input-themed ${errors.country ? "error" : ""}`} autoComplete="country-name" placeholder="Your country" />
                  {errors.country && <p className="text-xs text-red-400 mt-1.5"><FiAlertCircle size={11} className="inline" /> {errors.country}</p>}
                </div>

                <label className="flex items-start gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
                  <input type="checkbox" required checked={form.termsAccepted} onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })} className="mt-0.5 accent-[var(--accent)]" />
                  <span>I agree to the <Link href="/terms" className="text-[var(--accent)] underline">Terms of Service</Link>.</span>
                </label>
                {errors.termsAccepted && <p className="text-xs text-red-400 -mt-2"><FiAlertCircle size={11} className="inline" /> {errors.termsAccepted}</p>}
                <label className="flex items-start gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
                  <input type="checkbox" required checked={form.privacyAccepted} onChange={(e) => setForm({ ...form, privacyAccepted: e.target.checked })} className="mt-0.5 accent-[var(--accent)]" />
                  <span>I agree to the <Link href="/privacy" className="text-[var(--accent)] underline">Privacy Policy</Link>.</span>
                </label>
                {errors.privacyAccepted && <p className="text-xs text-red-400 -mt-2"><FiAlertCircle size={11} className="inline" /> {errors.privacyAccepted}</p>}

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="btn-primary w-full mt-2"
                >
                  {loading ? (
                    <><FiLoader className="animate-spin" size={15} /> Creating account…</>
                  ) : "Create Account"}
                </button>
              </form>

              {/* ── Sign in link ── */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border)]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-[var(--text-muted)] bg-[var(--bg-card)]">
                    Already have an account?
                  </span>
                </div>
              </div>

              <Link href="/login" className="btn-secondary w-full text-center block">
                Sign In Instead
              </Link>
            </>
          )}
        </div>

        {/* Trust badge */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-5 flex items-center justify-center gap-1.5">
          <GiStarFormation className="text-[var(--accent)] text-xs" />
          Join thousands of students seeking knowledge
          <GiStarFormation className="text-[var(--accent)] text-xs" />
        </p>
      </div>
    </div>
  );
}

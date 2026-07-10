"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GiMoon, GiStarFormation } from "react-icons/gi";
import { FiUser, FiMail, FiLock, FiAlertCircle, FiCheck, FiEye, FiEyeOff } from "react-icons/fi";

export default function RegisterPage() {
  const router  = useRouter();
  const [form,    setForm]    = useState({ name: "", email: "", password: "" });
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

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
        // Don't auto-redirect — tell them to verify email first
      }
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const pw = form.password;
  const strength = pw.length === 0 ? 0 : pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) ? 3 : pw.length >= 6 ? 2 : 1;
  const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];
  const strengthColor = ["", "bg-red-400", "bg-yellow-400", "bg-emerald-400"][strength];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 hero-bg opacity-60" />
      <div className="absolute inset-0 pattern-overlay opacity-40" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--accent-dim) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-sm animate-fadeInUp">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] mb-4 mx-auto">
            <GiMoon className="text-[var(--accent)] text-3xl" />
            <GiStarFormation className="absolute -top-1 -right-1 text-[var(--accent-light)] text-xs animate-spin-slow" />
          </div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Create Account
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            Begin your journey of knowledge
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8">

          {success && (
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center mb-5">
              <FiCheck className="text-emerald-400 flex-shrink-0" size={22} />
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

          {errors.general && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
              <FiAlertCircle className="flex-shrink-0" size={16} />
              {errors.general}
            </div>
          )}

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
                  className={`input-themed pl-10 ${errors.name ? "error" : ""}`}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </div>
              {errors.name && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><FiAlertCircle size={11} />{errors.name}</p>}
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
                  className={`input-themed pl-10 ${errors.email ? "error" : ""}`}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><FiAlertCircle size={11} />{errors.email}</p>}
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
                  className={`input-themed pl-10 pr-10 ${errors.password ? "error" : ""}`}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" tabIndex={-1}>
                  {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>

              {/* Strength indicator */}
              {pw.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${strength >= i ? strengthColor : "bg-[var(--bg-secondary)]"}`} />
                    ))}
                  </div>
                  <p className={`text-xs ${["","text-red-400","text-yellow-400","text-emerald-400"][strength]}`}>
                    {strengthLabel} password
                  </p>
                </div>
              )}

              {errors.password && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><FiAlertCircle size={11} />{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : "Create Account"}
            </button>
          </form>

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

          <Link href="/login" className="btn-secondary w-full text-center">
            Sign In Instead
          </Link>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-5 flex items-center justify-center gap-1.5">
          <GiStarFormation className="text-[var(--accent)] text-xs" />
          Join thousands of students seeking knowledge
          <GiStarFormation className="text-[var(--accent)] text-xs" />
        </p>
      </div>
    </div>
  );
}

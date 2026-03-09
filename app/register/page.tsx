"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GiMoon } from "react-icons/gi";
import { FiUser, FiMail, FiLock, FiAlertCircle, FiCheck } from "react-icons/fi";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          Object.entries(data.details).forEach(([k, v]) => {
            fieldErrors[k] = (v as string[])[0];
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.error });
        }
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 pattern-overlay opacity-30" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold-600/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <GiMoon className="text-gold-400 text-4xl mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold text-white">
            Create Account
          </h1>
          <p className="text-ink-400 text-sm mt-2">
            Begin your journey of knowledge
          </p>
        </div>

        <div className="glass-card gold-border rounded-2xl p-8">
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/20 border border-green-500/20 text-green-400 text-sm mb-5">
              <FiCheck /> Account created! Redirecting to login...
            </div>
          )}

          {errors.general && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-red-500/20 text-red-400 text-sm mb-5">
              <FiAlertCircle /> {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-ink-400 font-medium mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <FiUser
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
                  size={15}
                />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2.5 bg-ink-800/80 border rounded-xl text-white text-sm placeholder-ink-600 focus:outline-none focus:border-gold-500/50 transition-colors ${errors.name ? "border-red-500/40" : "border-white/10"}`}
                  placeholder="Your name"
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-400 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-ink-400 font-medium mb-1.5">
                Email
              </label>
              <div className="relative">
                <FiMail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
                  size={15}
                />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2.5 bg-ink-800/80 border rounded-xl text-white text-sm placeholder-ink-600 focus:outline-none focus:border-gold-500/50 transition-colors ${errors.email ? "border-red-500/40" : "border-white/10"}`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-ink-400 font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <FiLock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
                  size={15}
                />
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className={`w-full pl-10 pr-4 py-2.5 bg-ink-800/80 border rounded-xl text-white text-sm placeholder-ink-600 focus:outline-none focus:border-gold-500/50 transition-colors ${errors.password ? "border-red-500/40" : "border-white/10"}`}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-2.5 bg-gold-600 hover:bg-gold-500 disabled:opacity-60 text-white rounded-xl font-medium transition-colors text-sm mt-2"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-ink-500 mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-gold-400 hover:text-gold-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

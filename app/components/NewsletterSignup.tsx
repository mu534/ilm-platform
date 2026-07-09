"use client";

import { useState } from "react";
import { FiMail } from "react-icons/fi";
import { GiStarFormation } from "react-icons/gi";

export function NewsletterSignup() {
  const [email,        setEmail]        = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);

  // ── Hide entire section once subscribed ──────────────────
  if (isSubscribed) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      const res  = await fetch("/api/newsletter", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSubscribed(true);
        setEmail("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="relative rounded-3xl overflow-hidden border border-[var(--border-strong)]">

        <div className="absolute inset-0 hero-bg opacity-80" />
        <div className="absolute inset-0 pattern-overlay opacity-20" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 50% 100%, var(--accent-dim), transparent)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-60" />

        <div className="relative px-6 py-14 sm:py-20 flex flex-col items-center text-center">

          <div className="relative mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] animate-pulse-accent">
              <FiMail className="text-[var(--accent)] text-2xl" />
            </div>
            <GiStarFormation className="absolute -top-1 -right-2 text-gold-400 text-xs animate-spin-slow" />
            <GiStarFormation className="absolute -bottom-1 -left-2 text-gold-400 text-xs animate-spin-slow" style={{ animationDirection: "reverse" }} />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--accent-dim)] mb-4">
            <GiStarFormation className="text-gold-400 text-xs" />
            <span className="text-xs tracking-widest text-[var(--accent)] uppercase font-semibold">
              Stay Connected
            </span>
            <GiStarFormation className="text-gold-400 text-xs" />
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3 leading-tight">
            Stay Updated with New Knowledge
          </h2>

          <p className="text-[var(--text-secondary)] mb-8 max-w-md text-sm sm:text-base leading-relaxed">
            Get notified about new lectures, featured scholars, and exclusive
            content delivered to your inbox.
          </p>

          <form onSubmit={handleSubmit} className="w-full max-w-md">
            <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)]/80 backdrop-blur-sm shadow-[var(--shadow-md)]">
              <div className="flex-1 relative">
                <FiMail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  size={15}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full pl-10 pr-3 py-3 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none text-sm transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="
                  flex-shrink-0 px-5 py-3 rounded-xl text-sm font-semibold
                  bg-gradient-to-r from-gold-500 to-gold-600
                  hover:from-gold-400 hover:to-gold-500
                  disabled:from-[var(--bg-elevated)] disabled:to-[var(--bg-elevated)]
                  disabled:text-[var(--text-muted)] disabled:cursor-not-allowed
                  text-white shadow-md shadow-gold-600/30
                  transition-all duration-300 hover:scale-105 hover:shadow-gold-500/40
                  disabled:hover:scale-100 disabled:shadow-none
                  active:scale-95
                "
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Subscribe"
                )}
              </button>
            </div>
          </form>

          <p className="text-[var(--text-muted)] text-xs mt-5 flex items-center gap-1.5">
            <GiStarFormation className="text-gold-500 text-xs" />
            We respect your privacy. Unsubscribe at any time.
            <GiStarFormation className="text-gold-500 text-xs" />
          </p>
        </div>
      </div>
    </section>
  );
}
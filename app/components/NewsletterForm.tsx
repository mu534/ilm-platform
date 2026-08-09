"use client";

import { useState } from "react";
import { FiMail } from "react-icons/fi";

/**
 * Minimal newsletter form — used as a client island inside the
 * server-rendered Final CTA section. Handles its own submission state.
 */
export function NewsletterForm() {
  const [email,        setEmail]        = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);

  if (isSubscribed) {
    return (
      <p className="text-sm text-emerald-400 font-medium text-center py-2">
        ✓ You&apos;re subscribed! We&apos;ll keep you updated.
      </p>
    );
  }

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
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
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
            aria-label="Email for newsletter"
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
  );
}

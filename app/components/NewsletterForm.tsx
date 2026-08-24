"use client";

import { useState } from "react";
import { FiMail, FiLoader, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

/**
 * Newsletter subscription form.
 * Stores email in DB via POST /api/newsletter and sends a welcome email.
 */
export function NewsletterForm() {
  const [email,   setEmail]   = useState("");
  const [status,  setStatus]  = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  if (status === "success") {
    return (
      <div className="flex items-center justify-center gap-2.5 py-3 text-emerald-400">
        <FiCheckCircle size={18} />
        <p className="text-sm font-medium">
          You&apos;re subscribed! Check your inbox for a welcome email.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setMessage("");

    try {
      const res  = await fetch("/api/newsletter", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json() as { success?: boolean; error?: string };

      if (data.success) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please check your connection and try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-2">
      <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)]/80 backdrop-blur-sm shadow-[var(--shadow-md)]">
        <div className="flex-1 relative">
          <FiMail
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            size={15}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
            placeholder="Enter your email address"
            className="w-full pl-10 pr-3 py-3 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none text-sm transition-colors"
            required
            disabled={status === "loading"}
            aria-label="Email for newsletter"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading" || !email}
          className="
            flex-shrink-0 px-5 py-3 rounded-xl text-sm font-semibold
            bg-gradient-to-r from-gold-500 to-gold-600
            hover:from-gold-400 hover:to-gold-500
            disabled:from-[var(--bg-elevated)] disabled:to-[var(--bg-elevated)]
            disabled:text-[var(--text-muted)] disabled:cursor-not-allowed
            text-white shadow-md shadow-gold-600/30
            transition-all duration-300 hover:scale-105 hover:shadow-gold-500/40
            disabled:hover:scale-100 disabled:shadow-none active:scale-95
          "
        >
          {status === "loading" ? (
            <FiLoader className="animate-spin" size={16} />
          ) : (
            "Subscribe"
          )}
        </button>
      </div>

      {/* Error message */}
      {status === "error" && message && (
        <div className="flex items-center gap-2 text-red-400 text-xs px-1">
          <FiAlertCircle size={13} className="flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <p className="text-[11px] text-[var(--text-muted)] text-center">
        Get notified about new courses. No spam — unsubscribe any time.
      </p>
    </form>
  );
}

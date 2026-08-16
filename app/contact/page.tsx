"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "../components/NavBar";
import { Footer } from "../components/Footer";
import {
  FiMail, FiMessageCircle, FiUser, FiSend,
  FiCheckCircle, FiAlertCircle, FiLoader,
  FiHelpCircle, FiShield, FiBook, FiUsers,
} from "react-icons/fi";

type ContactType = "GENERAL" | "SUPPORT" | "PARTNERSHIP" | "REPORT" | "OTHER";

const SUBJECTS: { value: ContactType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "SUPPORT",     label: "Technical Support",  icon: <FiHelpCircle size={18} />,    desc: "Issues with the platform, account, or courses" },
  { value: "GENERAL",     label: "General Enquiry",    icon: <FiMessageCircle size={18} />, desc: "Questions about Ilm Platform" },
  { value: "PARTNERSHIP", label: "Partnership",        icon: <FiUsers size={18} />,         desc: "Scholar applications, institutional partnerships" },
  { value: "REPORT",      label: "Report a Problem",   icon: <FiShield size={18} />,        desc: "Report inappropriate content or misconduct" },
  { value: "OTHER",       label: "Other",              icon: <FiBook size={18} />,          desc: "Anything else you'd like to share" },
];

export default function ContactPage() {
  const [type,      setType]      = useState<ContactType>("GENERAL");
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [subject,   setSubject]   = useState("");
  const [message,   setMessage]   = useState("");
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (message.trim().length < 20) {
      setError("Message must be at least 20 characters.");
      return;
    }

    setSending(true);
    try {
      const res  = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim(), type }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        setSent(true);
      } else {
        setError(data.error ?? "Failed to send. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again or email us directly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navbar />

      {/* ── Hero header ── */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] text-[var(--accent)] text-xs font-semibold mb-4">
            <FiMail size={11} /> Get in Touch
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-3">
            Contact Us
          </h1>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
            Have a question, a suggestion, or need help? We&apos;re here to assist.
            Fill in the form below and we&apos;ll respond within 1–2 business days.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ── Left: Contact info ── */}
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-sm text-[var(--text-primary)] mb-4">
                Other ways to reach us
              </h2>
              <div className="space-y-4">
                <a
                  href="mailto:info@ilm-platform.com"
                  className="flex items-start gap-3 p-4 glass-card rounded-xl border border-[var(--border)] hover:border-[var(--accent)] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] flex-shrink-0 mt-0.5">
                    <FiMail size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      Email
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      info@ilm-platform.com
                    </p>
                  </div>
                </a>

                <div className="flex items-start gap-3 p-4 glass-card rounded-xl border border-[var(--border)]">
                  <div className="w-9 h-9 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] flex-shrink-0 mt-0.5">
                    <FiMessageCircle size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Response Time</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      1–2 business days
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h3 className="font-semibold text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Quick Help
              </h3>
              <div className="space-y-1.5">
                {[
                  { href: "/courses",              label: "Browse Courses" },
                  { href: "/scholars",             label: "Meet Our Scholars" },
                  { href: "/en/scholar-application", label: "Become an Instructor" },
                  { href: "/dashboard",            label: "My Dashboard" },
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors"
                  >
                    {label}
                    <span className="text-[var(--text-muted)]">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Form ── */}
          <div className="lg:col-span-2">
            {sent ? (
              /* Success state */
              <div className="glass-card rounded-3xl p-10 border border-emerald-500/20 bg-emerald-500/5 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <FiCheckCircle className="text-emerald-400" size={32} />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
                    Message Sent!
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">
                    Thank you for reaching out. We&apos;ve sent a confirmation to{" "}
                    <strong className="text-[var(--text-primary)]">{email}</strong> and will
                    reply within 1–2 business days.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button
                    onClick={() => { setSent(false); setName(""); setEmail(""); setSubject(""); setMessage(""); }}
                    className="btn-secondary text-sm px-5 py-2.5"
                  >
                    Send Another Message
                  </button>
                  <Link href="/" className="btn-primary text-sm px-5 py-2.5 text-center">
                    Back to Home
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} className="glass-card rounded-2xl p-6 sm:p-8 border border-[var(--border)] space-y-6">

                {/* Topic selector */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    What is this about?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SUBJECTS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => { setType(s.value); setError(""); }}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                          type === s.value
                            ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                            : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)]"
                        }`}
                      >
                        <span className={`mt-0.5 flex-shrink-0 ${type === s.value ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
                          {s.icon}
                        </span>
                        <div>
                          <p className="text-xs font-semibold">{s.label}</p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{s.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      Your Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <FiUser size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ahmad Ibn Ibrahim"
                        required
                        className="w-full pl-9 pr-3 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <FiMail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-9 pr-3 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Subject <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of your enquiry"
                    required
                    className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Message <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your question or issue in detail…"
                    required
                    rows={5}
                    className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 text-right">
                    {message.length}/3000
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    <FiAlertCircle size={13} className="flex-shrink-0" /> {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={sending}
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] hover:opacity-95 text-white font-bold text-sm transition-all shadow-md disabled:opacity-60 hover:scale-[1.01]"
                >
                  {sending ? (
                    <><FiLoader className="animate-spin" size={15} /> Sending…</>
                  ) : (
                    <><FiSend size={15} /> Send Message</>
                  )}
                </button>

                <p className="text-[11px] text-[var(--text-muted)] text-center">
                  By submitting this form you agree to our{" "}
                  <Link href="/en/privacy" className="text-[var(--accent)] hover:underline">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

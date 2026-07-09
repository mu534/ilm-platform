"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FiArrowLeft, FiSend } from "react-icons/fi";

export default function AskQuestionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm]     = useState({ title: "", body: "" });
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  if (status === "unauthenticated") {
    router.push("/login?callbackUrl=/forum/ask");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 5) { setError("Title must be at least 5 characters"); return; }
    if (form.body.trim().length < 10) { setError("Question must be at least 10 characters"); return; }

    setSaving(true);
    setError("");
    try {
      const res  = await fetch("/api/forum", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to post question");
      } else {
        router.push(`/forum/${data.data.id}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/forum" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-8">
        <FiArrowLeft size={14} /> Back to Forum
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">Ask a Question</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Share your question with the community</p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Question Title *</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            placeholder="What is your question? Be specific."
            required
          />
        </div>

        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Details *</label>
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className={inputClass}
            rows={8}
            placeholder="Provide all relevant details. Include what you've already tried..."
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
          >
            <FiSend size={14} /> {saving ? "Posting…" : "Post Question"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

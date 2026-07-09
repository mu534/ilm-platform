"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiSend } from "react-icons/fi";

interface Props {
  questionId: string;
  isLoggedIn: boolean;
  isResolved: boolean;
}

export function ForumReplySection({ questionId, isLoggedIn, isResolved }: Props) {
  const router  = useRouter();
  const [body, setBody]     = useState("");
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 2) { setError("Answer must be at least 2 characters"); return; }
    setSaving(true);
    setError("");
    try {
      const res  = await fetch(`/api/forum/${questionId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to post answer");
      } else {
        setBody("");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="text-[var(--text-muted)] text-sm mb-3">
          <Link href="/login" className="text-[var(--accent)] hover:text-[var(--accent-light)]">Sign in</Link>
          {" "}to post an answer
        </p>
      </div>
    );
  }

  if (isResolved) {
    return (
      <div className="glass-card rounded-2xl p-5 text-center">
        <p className="text-[var(--text-muted)] text-sm">
          This question has been resolved. You can still post additional answers below.
        </p>
        <ReplyForm body={body} setBody={setBody} error={error} saving={saving} onSubmit={submit} />
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-4">Your Answer</h3>
      <ReplyForm body={body} setBody={setBody} error={error} saving={saving} onSubmit={submit} />
    </div>
  );
}

function ReplyForm({
  body, setBody, error, saving, onSubmit,
}: {
  body: string;
  setBody: (v: string) => void;
  error: string;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 mt-4">
      {error && (
        <p className="text-sm text-red-400 p-3 rounded-xl bg-red-500/10 border border-red-500/20">{error}</p>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
        rows={5}
        placeholder="Write a detailed answer..."
        required
      />
      <button
        type="submit"
        disabled={saving || body.trim().length < 2}
        className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
      >
        <FiSend size={14} /> {saving ? "Posting…" : "Post Answer"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FiFlag } from "react-icons/fi";

const REASONS = [
  { value: "SPAM",              label: "Spam"                },
  { value: "INAPPROPRIATE",     label: "Inappropriate"       },
  { value: "INCORRECT_CONTENT", label: "Incorrect Content"   },
  { value: "ABUSE",             label: "Abuse / Harassment"  },
  { value: "OTHER",             label: "Other"               },
] as const;

interface ReportButtonProps {
  commentId: string;
}

export function ReportButton({ commentId }: ReportButtonProps) {
  const { data: session } = useSession();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);

  if (!session) return null;

  const report = async (reason: string) => {
    if (submitted || loading) return;
    setLoading(true);
    try {
      await fetch("/api/reports", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ commentId, reason }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <span className="text-xs text-emerald-400 opacity-70">Reported</span>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors rounded opacity-0 group-hover:opacity-100"
          title="Report comment"
          disabled={loading}
        >
          <FiFlag size={12} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] p-1.5 min-w-[180px] z-50"
          sideOffset={4}
          align="end"
        >
          <p className="px-3 py-1 text-xs text-[var(--text-muted)] font-medium">Report as…</p>
          {REASONS.map((r) => (
            <DropdownMenu.Item
              key={r.value}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer outline-none transition-colors"
              onClick={() => report(r.value)}
            >
              {r.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

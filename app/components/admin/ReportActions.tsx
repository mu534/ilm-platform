"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FiMoreVertical, FiCheck, FiX, FiEye } from "react-icons/fi";

export function ReportActions({ reportId }: { reportId: string }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  const resolve = async (
    status: "REVIEWED" | "RESOLVED" | "DISMISSED",
    note?: string,
  ) => {
    setLoading(true);
    try {
      await fetch(`/api/reports/${reportId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status, note }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          disabled={loading}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors disabled:opacity-50"
        >
          <FiMoreVertical size={14} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] p-1.5 min-w-[160px] z-50"
          sideOffset={4}
          align="end"
        >
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg cursor-pointer outline-none transition-colors"
            onClick={() => resolve("REVIEWED")}
          >
            <FiEye size={12} /> Mark Reviewed
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer outline-none transition-colors"
            onClick={() => resolve("RESOLVED", "Comment removed for violating community guidelines.")}
          >
            <FiCheck size={12} /> Resolve & Hide Comment
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] rounded-lg cursor-pointer outline-none transition-colors"
            onClick={() => resolve("DISMISSED")}
          >
            <FiX size={12} /> Dismiss
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

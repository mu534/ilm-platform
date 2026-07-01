"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiTrash2 } from "react-icons/fi";

export function BookmarkRemoveButton({ bookmarkId }: { bookmarkId: string }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  const remove = async () => {
    if (!confirm("Remove this bookmark?")) return;
    setLoading(true);
    try {
      await fetch(`/api/bookmarks/${bookmarkId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={remove}
      disabled={loading}
      className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 disabled:opacity-50"
      title="Remove bookmark"
    >
      <FiTrash2 size={14} />
    </button>
  );
}

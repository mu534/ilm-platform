"use client";
// src/components/admin/LectureActions.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiToggleLeft,
  FiToggleRight,
  FiStar,
} from "react-icons/fi";

interface Lecture {
  id: string;
  slug: string;
  published: boolean;
  featured: boolean;
}

export function AdminLectureActions({ lecture }: { lecture: Lecture }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const update = async (data: Partial<Lecture>) => {
    setLoading(true);
    try {
      await fetch(`/api/lectures/${lecture.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this lecture? This action cannot be undone.")) return;
    setLoading(true);
    try {
      await fetch(`/api/lectures/${lecture.id}`, { method: "DELETE" });
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
          className="p-1.5 text-ink-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
        >
          <FiMoreVertical size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="glass-card gold-border rounded-xl p-1.5 min-w-[160px] shadow-2xl"
          sideOffset={4}
          align="end"
        >
          <DropdownMenu.Item asChild>
            <Link
              href={`/lectures/${lecture.slug}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-ink-300 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer"
            >
              <FiEye size={13} /> View
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link
              href={`/admin/lectures/${lecture.id}/edit`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-ink-300 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer"
            >
              <FiEdit2 size={13} /> Edit
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink-300 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer"
            onClick={() => update({ published: !lecture.published })}
          >
            {lecture.published ? (
              <FiToggleRight size={13} className="text-green-400" />
            ) : (
              <FiToggleLeft size={13} />
            )}
            {lecture.published ? "Unpublish" : "Publish"}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink-300 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer"
            onClick={() => update({ featured: !lecture.featured })}
          >
            <FiStar
              size={13}
              className={lecture.featured ? "text-gold-400" : ""}
            />
            {lecture.featured ? "Unfeature" : "Feature"}
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 border-t border-white/5" />
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/10 rounded-lg cursor-pointer"
            onClick={handleDelete}
          >
            <FiTrash2 size={13} /> Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

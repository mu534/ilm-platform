"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FiMoreVertical, FiTrash2, FiToggleLeft, FiToggleRight, FiStar } from "react-icons/fi";

interface Course {
  id:       string;
  slug:     string;
  published: boolean;
  featured:  boolean;
}

export function AdminCourseActions({ course }: { course: Course }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  const update = async (data: Partial<Course>) => {
    setLoading(true);
    try {
      await fetch(`/api/courses/${course.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this course? This will also delete all modules and lectures within it.")) return;
    setLoading(true);
    try {
      await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
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
            onClick={() => update({ published: !course.published })}
          >
            {course.published
              ? <FiToggleRight size={13} className="text-emerald-400" />
              : <FiToggleLeft size={13} />}
            {course.published ? "Unpublish" : "Publish"}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg cursor-pointer outline-none transition-colors"
            onClick={() => update({ featured: !course.featured })}
          >
            <FiStar size={13} className={course.featured ? "text-[var(--accent)]" : ""} />
            {course.featured ? "Unfeature" : "Feature"}
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer outline-none transition-colors"
            onClick={handleDelete}
          >
            <FiTrash2 size={13} /> Delete Course
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

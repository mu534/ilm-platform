"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  FiMoreVertical, FiTrash2, FiToggleLeft, FiToggleRight,
  FiStar, FiCopy, FiLoader,
} from "react-icons/fi";

interface Course {
  id:        string;
  slug:      string;
  published: boolean;
  featured:  boolean;
  status:    string;
}

export function AdminCourseActions({ course }: { course: Course }) {
  const router          = useRouter();
  const [loading,    setLoading]    = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const update = async (data: Partial<Pick<Course, "published" | "featured">>) => {
    setLoading(true);
    try {
      await fetch(`/api/courses/${course.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this course? All modules and lectures will also be deleted.")) return;
    setLoading(true);
    setDeleteError("");
    try {
      const res  = await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        setDeleteError(data.error ?? "Delete failed");
      } else {
        router.refresh();
      }
    } finally { setLoading(false); }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const res  = await fetch(`/api/courses/${course.id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        router.push(`/admin/courses/${data.data.id}/edit`);
      }
    } finally { setDuplicating(false); }
  };

  const isPublished = course.published && course.status === "PUBLISHED";

  return (
    <>
      {/* Inline delete error (shown below the row when visible) */}
      {deleteError && (
        <p className="text-xs text-red-400 mt-1">{deleteError}</p>
      )}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            disabled={loading || duplicating}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors disabled:opacity-50"
          >
            {duplicating ? <FiLoader className="animate-spin" size={14} /> : <FiMoreVertical size={14} />}
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] p-1.5 min-w-[170px] z-50"
            sideOffset={4}
            align="end"
          >
            {/* Publish / Unpublish — only for admin */}
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg cursor-pointer outline-none transition-colors"
              onClick={() => update({ published: !course.published })}
            >
              {isPublished
                ? <FiToggleRight size={13} className="text-emerald-400" />
                : <FiToggleLeft  size={13} />}
              {isPublished ? "Unpublish" : "Publish"}
            </DropdownMenu.Item>

            {/* Feature / Unfeature */}
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg cursor-pointer outline-none transition-colors"
              onClick={() => update({ featured: !course.featured })}
            >
              <FiStar size={13} className={course.featured ? "text-[var(--accent)]" : ""} />
              {course.featured ? "Unfeature" : "Feature"}
            </DropdownMenu.Item>

            {/* Duplicate */}
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg cursor-pointer outline-none transition-colors"
              onClick={handleDuplicate}
            >
              <FiCopy size={13} /> Duplicate
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />

            {/* Delete */}
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer outline-none transition-colors"
              onClick={handleDelete}
            >
              <FiTrash2 size={13} /> Delete Course
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}

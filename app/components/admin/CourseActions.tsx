"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  FiMoreVertical, FiEye, FiEyeOff, FiStar, FiCopy,
  FiTrash2, FiLoader, FiCheckCircle, FiXCircle,
} from "react-icons/fi";

interface Course {
  id:        string;
  slug:      string;
  published: boolean;
  featured:  boolean;
  status:    string;
}

export function AdminCourseActions({ course }: { course: Course }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  const patch = async (data: Record<string, unknown>) => {
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

  const duplicate = async () => {
    setLoading(true);
    try {
      await fetch(`/api/courses/${course.id}/duplicate`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${course.id}"? This removes all modules, lessons, and enrollments. Cannot be undone.`)) return;
    setLoading(true);
    try {
      await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => patch({ approvalStatus: "APPROVED", status: "PUBLISHED", published: true });
  const reject  = async () => patch({ approvalStatus: "REJECTED", status: "REJECTED" });

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          disabled={loading}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors disabled:opacity-50"
          title="More actions"
        >
          {loading
            ? <FiLoader size={13} className="animate-spin" />
            : <FiMoreVertical size={13} />
          }
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="glass-card gold-border rounded-xl p-1.5 min-w-[180px] shadow-[var(--shadow-lg)] z-50 animate-fadeInUp"
          sideOffset={4}
          align="end"
        >
          {/* Publish / Unpublish */}
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-lg cursor-pointer transition-colors outline-none"
            onClick={() => void patch({ published: !course.published })}
          >
            {course.published
              ? <><FiEyeOff size={13} /> Unpublish</>
              : <><FiEye    size={13} /> Publish</>
            }
          </DropdownMenu.Item>

          {/* Feature / Unfeature */}
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-lg cursor-pointer transition-colors outline-none"
            onClick={() => void patch({ featured: !course.featured })}
          >
            <FiStar size={13} className={course.featured ? "text-[var(--accent)]" : ""} />
            {course.featured ? "Unfeature" : "Feature"}
          </DropdownMenu.Item>

          {/* Approve (only if pending review) */}
          {course.status === "PENDING_REVIEW" && (
            <>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer transition-colors outline-none"
                onClick={() => void approve()}
              >
                <FiCheckCircle size={13} /> Approve
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors outline-none"
                onClick={() => void reject()}
              >
                <FiXCircle size={13} /> Reject
              </DropdownMenu.Item>
            </>
          )}

          {/* Duplicate */}
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-lg cursor-pointer transition-colors outline-none"
            onClick={() => void duplicate()}
          >
            <FiCopy size={13} /> Duplicate
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />

          {/* Delete */}
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors outline-none"
            onClick={() => void handleDelete()}
          >
            <FiTrash2 size={13} /> Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

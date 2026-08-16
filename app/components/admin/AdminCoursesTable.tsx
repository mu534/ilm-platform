"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiEye, FiUsers, FiEdit2, FiLoader, FiCheckSquare, FiSquare,
  FiEyeOff, FiStar, FiTrash2, FiX,
} from "react-icons/fi";
import { AdminCourseActions } from "./CourseActions";

interface Course {
  id:        string;
  slug:      string;
  title:     string;
  status:    string;
  difficulty: string;
  createdAt: string | Date;
  published: boolean;
  featured:  boolean;
  author:    { name: string };
  category:  { name: string; icon: string | null } | null;
  _count:    { modules: number; enrollments: number; ratings: number };
}

const statusStyles: Record<string, string> = {
  PUBLISHED:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DRAFT:          "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]",
  PENDING_REVIEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  REJECTED:       "bg-red-500/10 text-red-400 border-red-500/20",
  ARCHIVED:       "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]",
};

const difficultyLabels: Record<string, string> = {
  BEGINNER: "Beg", INTERMEDIATE: "Int", ADVANCED: "Adv",
};

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type BulkAction = "publish" | "unpublish" | "feature" | "unfeature" | "delete";

export function AdminCoursesTable({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running,  setRunning]  = useState<BulkAction | null>(null);
  const [error,    setError]    = useState("");

  const allSelected = courses.length > 0 && selected.size === courses.length;
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(courses.map((c) => c.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runBulkAction = async (action: BulkAction) => {
    if (selected.size === 0) return;

    if (action === "delete") {
      const ok = confirm(
        `Delete ${selected.size} course${selected.size > 1 ? "s" : ""}? All their modules and lessons will also be deleted. This can't be undone.`,
      );
      if (!ok) return;
    }

    setRunning(action);
    setError("");
    try {
      const res  = await fetch("/api/courses/bulk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ids: Array.from(selected), action }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Bulk action failed");
        return;
      }
      setSelected(new Set());
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">

      {/* Bulk action bar — only shown once something is selected */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[var(--border-strong)] bg-[var(--accent-dim)]">
          <span className="text-xs font-semibold text-[var(--text-primary)] mr-2">
            {selected.size} selected
          </span>

          <button
            onClick={() => void runBulkAction("publish")}
            disabled={running !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-emerald-400 hover:text-emerald-400 transition-colors disabled:opacity-60"
          >
            {running === "publish" ? <FiLoader className="animate-spin" size={12} /> : <FiEye size={12} />}
            Publish
          </button>
          <button
            onClick={() => void runBulkAction("unpublish")}
            disabled={running !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-60"
          >
            {running === "unpublish" ? <FiLoader className="animate-spin" size={12} /> : <FiEyeOff size={12} />}
            Unpublish
          </button>
          <button
            onClick={() => void runBulkAction("feature")}
            disabled={running !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-60"
          >
            {running === "feature" ? <FiLoader className="animate-spin" size={12} /> : <FiStar size={12} />}
            Feature
          </button>
          <button
            onClick={() => void runBulkAction("unfeature")}
            disabled={running !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-60"
          >
            Unfeature
          </button>
          <button
            onClick={() => void runBulkAction("delete")}
            disabled={running !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-60"
          >
            {running === "delete" ? <FiLoader className="animate-spin" size={12} /> : <FiTrash2 size={12} />}
            Delete
          </button>

          <button
            onClick={() => setSelected(new Set())}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-auto"
          >
            <FiX size={12} /> Clear
          </button>

          {error && <p className="text-xs text-red-400 w-full">{error}</p>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-3 w-10">
                <button onClick={toggleAll} className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors" title={allSelected ? "Deselect all" : "Select all"}>
                  {allSelected ? <FiCheckSquare size={15} /> : <FiSquare size={15} />}
                </button>
              </th>
              {["Course", "Category", "Level", "Status", "Modules", "Students", "Date", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {courses.map((course) => {
              const isSelected = selected.has(course.id);
              return (
                <tr key={course.id} className={`transition-colors ${isSelected ? "bg-[var(--accent-dim)]" : "hover:bg-[var(--bg-card-hover)]"}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleOne(course.id)} className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                      {isSelected ? <FiCheckSquare size={15} className="text-[var(--accent)]" /> : <FiSquare size={15} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-xs">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{course.title}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{course.author.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {course.category ? `${course.category.icon ?? ""} ${course.category.name}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {difficultyLabels[course.difficulty] ?? course.difficulty}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyles[course.status || "DRAFT"] ?? statusStyles.DRAFT}`}>
                      {(course.status || "DRAFT").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {course._count.modules}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <FiUsers size={11} /> {course._count.enrollments}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {formatDate(course.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/courses/${course.slug}`}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors"
                        title="View"
                      >
                        <FiEye size={13} />
                      </Link>
                      <Link
                        href={`/admin/courses/${course.id}/edit`}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors"
                        title="Edit Details"
                      >
                        <FiEdit2 size={13} />
                      </Link>
                      <Link
                        href={`/admin/courses/${course.id}/builder`}
                        className="p-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors font-semibold"
                        title="Course Builder — Modules & Lessons"
                      >
                        Build
                      </Link>
                      {course.status === "PENDING_REVIEW" && (
                        <Link
                          href={`/admin/courses/${course.id}/review`}
                          className="p-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors font-semibold"
                          title="Review this course submission"
                        >
                          Review
                        </Link>
                      )}
                      <AdminCourseActions course={course} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {courses.length === 0 && (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <p>No courses yet.</p>
            <Link href="/admin/courses/new" className="text-[var(--accent)] text-sm hover:text-[var(--accent-light)] mt-2 inline-block">
              Create one →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

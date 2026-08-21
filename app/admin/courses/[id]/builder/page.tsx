"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiPlus, FiTrash2, FiEdit2, FiChevronUp, FiChevronDown,
  FiArrowLeft, FiSave, FiX, FiLoader, FiVideo,
  FiFileText, FiHeadphones, FiFile, FiEye, FiEyeOff,
  FiCheckCircle, FiHelpCircle,
} from "react-icons/fi";
import { FileUploader } from "../../../../components/FileUploader";
import { LectureResourceManager } from "../../../../components/lectures/LectureResourceManager";
import RichTextEditor from "../../../../components/admin/RichTextEditor";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LectureItem {
  id:           string;
  title:        string;
  slug:         string;
  type:         "TEXT" | "VIDEO" | "AUDIO" | "PDF";
  published:    boolean;
  duration:     number | null;
  order:        number;
}

interface ModuleItem {
  id:          string;
  title:       string;
  description: string | null;
  order:       number;
  lectures:    LectureItem[];
  _count:      { lectures: number; quizzes: number };
}

interface Course {
  id:    string;
  title: string;
  slug:  string;
}

const typeIcon: Record<string, React.ReactNode> = {
  VIDEO: <FiVideo      size={12} />,
  TEXT:  <FiFileText   size={12} />,
  AUDIO: <FiHeadphones size={12} />,
  PDF:   <FiFile       size={12} />,
};

const inputClass =
  "w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors";

// ── Module form (inline) ──────────────────────────────────────────────────────
function ModuleForm({
  courseId,
  initial,
  onSave,
  onCancel,
}: {
  courseId: string;
  initial?: ModuleItem;
  onSave:   () => void;
  onCancel: () => void;
}) {
  const [title, setTitle]   = useState(initial?.title ?? "");
  const [desc,  setDesc]    = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true); setError("");
    try {
      const res = initial
        ? await fetch(`/api/modules/${initial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title.trim(), description: desc.trim() || undefined, courseId }),
          })
        : await fetch(`/api/courses/${courseId}/modules`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title.trim(), description: desc.trim() || undefined, courseId, order: 0 }),
          });
      const data = await res.json();
      if (!data.success) { setError(data.error ?? "Failed to save module"); return; }
      onSave();
    } catch { setError("Something went wrong"); }
    finally   { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="glass-card rounded-xl p-4 border border-[var(--border-strong)] space-y-3">
      <div>
        <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Module Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Introduction to Tafsir" autoFocus />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Description</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputClass} placeholder="Brief description (optional)" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-xs px-4 py-2">
          {saving ? <FiLoader className="animate-spin" size={13} /> : <FiSave size={13} />}
          {saving ? "Saving…" : initial ? "Update" : "Add Module"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-xs px-4 py-2">
          <FiX size={13} /> Cancel
        </button>
      </div>
    </form>
  );
}

// ── Lecture form (inline, inside a module) ────────────────────────────────────
//
// This is the ONLY place lectures are created and edited. It intentionally
// carries everything the old standalone `/admin/lectures/[id]/edit` page did
// (description, content, media upload, thumbnail, tags, resources) so an
// instructor never has to leave the Course Builder to fully set up a lesson.
interface FullLectureData {
  title:        string;
  description:  string;
  content:      string;
  type:         "TEXT" | "VIDEO" | "AUDIO" | "PDF";
  tags:         string;
  published:    boolean;
  featured:     boolean;
  mediaUrl:     string;
  thumbnailUrl: string;
}

const emptyLectureData: FullLectureData = {
  title: "", description: "", content: "", type: "TEXT",
  tags: "", published: false, featured: false, mediaUrl: "", thumbnailUrl: "",
};

function LectureForm({
  moduleId,
  initial,
  nextOrder,
  onSave,
  onCancel,
}: {
  moduleId:   string;
  courseId:   string;
  initial?:   LectureItem;
  nextOrder?: number;
  onSave:     () => void;
  onCancel:   () => void;
}) {
  const [form,    setForm]    = useState<FullLectureData>(emptyLectureData);
  const [loading, setLoading] = useState(!!initial);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  // When editing an existing lesson, load its full record — the module list
  // only carries summary fields (title/type/published/order), not the
  // description/content/media/resources this form also manages.
  useEffect(() => {
    if (!initial) { setForm(emptyLectureData); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/lectures/${initial.id}?edit=1`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success || !d.data) return;
        const lec = d.data;
        setForm({
          title:        lec.title        ?? "",
          description:  lec.description  ?? "",
          content:      lec.content      ?? "",
          type:         lec.type         ?? "TEXT",
          tags:         (lec.tags ?? []).join(", "),
          published:    lec.published    ?? false,
          featured:     lec.featured     ?? false,
          mediaUrl:     lec.mediaUrl     ?? "",
          thumbnailUrl: lec.thumbnailUrl ?? "",
        });
      })
      .catch(() => setError("Failed to load lesson details"))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim())       { setError("Title is required");       return; }
    if (!form.description.trim()) { setError("Description is required"); return; }
    setSaving(true); setError("");

    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);

    try {
      let res: Response;
      if (initial) {
        res = await fetch(`/api/lectures/${initial.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ ...form, tags }),
        });
      } else {
        const slug = form.title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now().toString(36);
        res = await fetch("/api/lectures", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ ...form, tags, moduleId, slug, order: nextOrder ?? 0 }),
        });
      }
      const data = await res.json() as { success?: boolean; error?: string; details?: Record<string, string[]> };
      if (!data.success) {
        // Show the first validation field error if available, otherwise the general error
        const fieldError = data.details
          ? Object.entries(data.details).map(([k, v]) => `${k}: ${v[0]}`).join(", ")
          : null;
        setError(fieldError ?? data.error ?? "Failed to save lesson");
        return;
      }
      onSave();
    } catch { setError("Something went wrong"); }
    finally   { setSaving(false); }
  };

  const typeOptions: { value: FullLectureData["type"]; label: string; icon: React.ReactNode }[] = [
    { value: "TEXT",  label: "Article", icon: <FiFileText   size={13} /> },
    { value: "VIDEO", label: "Video",   icon: <FiVideo       size={13} /> },
    { value: "AUDIO", label: "Audio",   icon: <FiHeadphones  size={13} /> },
    { value: "PDF",   label: "PDF",     icon: <FiFile        size={13} /> },
  ];

  if (loading) {
    return (
      <div className="mt-2 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-9 rounded-lg shimmer" />)}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] space-y-4">
      <div>
        <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Lesson Title *</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="e.g. Understanding the First Verse" autoFocus />
      </div>

      <div>
        <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Content Type</label>
        <div className="flex gap-2 flex-wrap">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm({ ...form, type: opt.value })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                form.type === opt.value
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Description *</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={inputClass}
          rows={3}
          placeholder="Brief description of this lesson — shown on the course page"
        />
      </div>

      {form.type === "TEXT" && (
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">
            Content <span className="font-normal text-[var(--text-muted)]">— rich text editor</span>
          </label>
          <RichTextEditor
            value={form.content}
            onChange={(html) => setForm({ ...form, content: html })}
            placeholder="Write your full lesson content here. Use headings, lists, quotes and more…"
            minHeight="320px"
          />
        </div>
      )}

      {/* Media upload — matches selected content type */}
      {form.type === "VIDEO" && (
        <FileUploader accept="video/*" folder="ilm-platform/lectures" label="Video File" onUpload={(url) => setForm({ ...form, mediaUrl: url })} currentUrl={form.mediaUrl} />
      )}
      {form.type === "AUDIO" && (
        <FileUploader accept="audio/*" folder="ilm-platform/lectures" label="Audio File" onUpload={(url) => setForm({ ...form, mediaUrl: url })} currentUrl={form.mediaUrl} />
      )}
      {form.type === "PDF" && (
        <FileUploader accept="application/pdf" folder="ilm-platform/lectures" label="PDF Document" onUpload={(url) => setForm({ ...form, mediaUrl: url })} currentUrl={form.mediaUrl} />
      )}

      <FileUploader accept="image/*" folder="ilm-platform/thumbnails" label="Thumbnail Image" onUpload={(url) => setForm({ ...form, thumbnailUrl: url })} currentUrl={form.thumbnailUrl} />

      <div>
        <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">
          Tags <span className="font-normal">(comma-separated)</span>
        </label>
        <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputClass} placeholder="Fiqh, Quran, Hadith, Aqeedah" />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="w-3.5 h-3.5 accent-[var(--accent)]" />
          <span className="text-xs text-[var(--text-secondary)]">Publish immediately</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="w-3.5 h-3.5 accent-[var(--accent)]" />
          <span className="text-xs text-[var(--text-secondary)]">Featured</span>
        </label>
      </div>

      {/* Resources — only meaningful once the lesson exists */}
      {initial && (
        <div className="border-t border-[var(--border)] pt-4">
          <LectureResourceManager lectureId={initial.id} />
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-xs px-4 py-2">
          {saving ? <FiLoader className="animate-spin" size={13} /> : <FiSave size={13} />}
          {saving ? "Saving…" : initial ? "Update Lesson" : "Add Lesson"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-xs px-4 py-2">
          <FiX size={13} /> Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function CourseBuilderPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const router = useRouter();

  const [course,  setCourse]  = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [addingModule,    setAddingModule]    = useState(false);
  const [editingModule,   setEditingModule]   = useState<string | null>(null);   // module id
  const [addingLectureIn, setAddingLectureIn] = useState<string | null>(null);  // module id
  const [editingLecture,  setEditingLecture]  = useState<string | null>(null);  // lecture id

  // ── Load data ───────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!courseId) return;
    try {
      const [courseRes, modulesRes] = await Promise.all([
        fetch(`/api/courses/${courseId}`),
        fetch(`/api/courses/${courseId}/modules`),
      ]);
      const cd = await courseRes.json();
      const md = await modulesRes.json();
      if (cd.success) setCourse({ id: cd.data.id, title: cd.data.title, slug: cd.data.slug });
      if (md.success) setModules(md.data);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { void load(); }, [load]);

  // ── Module reorder ──────────────────────────────────────────────────────────
  const reorderModule = async (index: number, direction: "up" | "down") => {
    const next = [...modules];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];

    // Optimistic update
    setModules(next);

    // Persist new orders
    await Promise.all(
      next.map((m, i) =>
        fetch(`/api/modules/${m.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ title: m.title, courseId, order: i }),
        }),
      ),
    );
  };

  // ── Lecture reorder ─────────────────────────────────────────────────────────
  const reorderLecture = async (moduleId: string, index: number, direction: "up" | "down") => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const lectures = [...mod.lectures];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= lectures.length) return;
    [lectures[index], lectures[swap]] = [lectures[swap], lectures[index]];

    setModules((prev) =>
      prev.map((m) => m.id === moduleId ? { ...m, lectures } : m),
    );

    await Promise.all(
      lectures.map((l, i) =>
        fetch(`/api/lectures/${l.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ order: i }),
        }),
      ),
    );
  };

  // ── Delete module ───────────────────────────────────────────────────────────
  const deleteModule = async (moduleId: string, title: string) => {
    if (!confirm(`Delete module "${title}"? All lectures inside will also be deleted.`)) return;
    await fetch(`/api/modules/${moduleId}`, { method: "DELETE" });
    void load();
  };

  // ── Delete lecture ──────────────────────────────────────────────────────────
  const deleteLecture = async (lectureId: string, title: string) => {
    if (!confirm(`Delete lecture "${title}"?`)) return;
    await fetch(`/api/lectures/${lectureId}`, { method: "DELETE" });
    void load();
  };

  // ── Toggle lecture publish ──────────────────────────────────────────────────
  const togglePublish = async (lectureId: string, current: boolean) => {
    await fetch(`/api/lectures/${lectureId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ published: !current }),
    });
    void load();
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl shimmer" />)}
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-3"
          >
            <FiArrowLeft size={12} /> All Courses
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Course Builder
          </h1>
          {course && (
            <p className="text-[var(--text-muted)] text-sm mt-1">
              {course.title} ·{" "}
              <Link href={`/courses/${course.slug}`} target="_blank" className="text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
                Preview
              </Link>{" "}·{" "}
              <Link href={`/admin/courses/${courseId}/edit`} className="text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
                Edit Details
              </Link>
            </p>
          )}
        </div>
        <button
          onClick={() => setAddingModule(true)}
          className="btn-primary text-sm"
          disabled={addingModule}
        >
          <FiPlus size={14} /> Add Module
        </button>
      </div>

      {/* Add module form */}
      {addingModule && (
        <div className="mb-6">
          <ModuleForm
            courseId={courseId}
            onSave={() => { setAddingModule(false); void load(); }}
            onCancel={() => setAddingModule(false)}
          />
        </div>
      )}

      {/* Empty state */}
      {modules.length === 0 && !addingModule && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto mb-4">
            <FiFileText className="text-[var(--accent)] text-xl" />
          </div>
          <p className="text-[var(--text-primary)] font-semibold mb-1">No modules yet</p>
          <p className="text-[var(--text-muted)] text-sm mb-4">
            Modules organise your course into sections. Add your first module to get started.
          </p>
          <button onClick={() => setAddingModule(true)} className="btn-primary text-sm">
            <FiPlus size={14} /> Add First Module
          </button>
        </div>
      )}

      {/* Module list */}
      <div className="space-y-4">
        {modules.map((mod, modIdx) => (
          <div key={mod.id} className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">

            {/* Module header */}
            <div className="flex items-start gap-3 px-5 py-4 bg-[var(--bg-secondary)]">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
                <button
                  onClick={() => reorderModule(modIdx, "up")}
                  disabled={modIdx === 0}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                  title="Move up"
                >
                  <FiChevronUp size={14} />
                </button>
                <button
                  onClick={() => reorderModule(modIdx, "down")}
                  disabled={modIdx === modules.length - 1}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                  title="Move down"
                >
                  <FiChevronDown size={14} />
                </button>
              </div>

              {/* Module info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">
                    Module {modIdx + 1}
                  </span>
                </div>
                {editingModule === mod.id ? (
                  <ModuleForm
                    courseId={courseId}
                    initial={mod}
                    onSave={() => { setEditingModule(null); void load(); }}
                    onCancel={() => setEditingModule(null)}
                  />
                ) : (
                  <>
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">{mod.title}</h3>
                    {mod.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{mod.description}</p>
                    )}
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {mod._count.lectures} lesson{mod._count.lectures !== 1 ? "s" : ""}
                      {mod._count.quizzes > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[10px] font-medium">
                          {mod._count.quizzes} quiz
                        </span>
                      )}
                    </p>
                  </>
                )}
              </div>

              {/* Module actions */}
              {editingModule !== mod.id && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingModule(mod.id)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors"
                    title="Edit module"
                  >
                    <FiEdit2 size={13} />
                  </button>
                  <button
                    onClick={() => deleteModule(mod.id, mod.title)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete module"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Lecture list */}
            <div className="divide-y divide-[var(--border)]">
              {mod.lectures.map((lecture, lIdx) => (
                <div key={lecture.id} className="px-5 py-3">
                  {editingLecture === lecture.id ? (
                    <LectureForm
                      moduleId={mod.id}
                      courseId={courseId}
                      initial={lecture}
                      onSave={() => { setEditingLecture(null); void load(); }}
                      onCancel={() => setEditingLecture(null)}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      {/* Reorder */}
                      <div className="flex flex-col gap-0 flex-shrink-0">
                        <button
                          onClick={() => reorderLecture(mod.id, lIdx, "up")}
                          disabled={lIdx === 0}
                          className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 rounded transition-colors"
                        >
                          <FiChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => reorderLecture(mod.id, lIdx, "down")}
                          disabled={lIdx === mod.lectures.length - 1}
                          className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 rounded transition-colors"
                        >
                          <FiChevronDown size={12} />
                        </button>
                      </div>

                      {/* Type icon */}
                      <span className="text-[var(--text-muted)] flex-shrink-0">
                        {typeIcon[lecture.type]}
                      </span>

                      {/* Title */}
                      <span className="flex-1 text-sm text-[var(--text-primary)] truncate">
                        {lecture.title}
                      </span>

                      {/* Published badge */}
                      <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        lecture.published
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]"
                      }`}>
                        {lecture.published ? "Live" : "Draft"}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => togglePublish(lecture.id, lecture.published)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors"
                          title={lecture.published ? "Unpublish" : "Publish"}
                        >
                          {lecture.published ? <FiEyeOff size={12} /> : <FiEye size={12} />}
                        </button>
                        <button
                          onClick={() => setEditingLecture(lecture.id)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors"
                          title="Edit lesson"
                        >
                          <FiEdit2 size={12} />
                        </button>
                        <button
                          onClick={() => deleteLecture(lecture.id, lecture.title)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete lecture"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add lesson + manage quiz — module footer */}
            <div className="px-5 py-3 border-t border-[var(--border)]">
              {addingLectureIn === mod.id ? (
                <LectureForm
                  moduleId={mod.id}
                  courseId={courseId}
                  nextOrder={mod.lectures.length}
                  onSave={() => { setAddingLectureIn(null); void load(); }}
                  onCancel={() => setAddingLectureIn(null)}
                />
              ) : (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <button
                    onClick={() => setAddingLectureIn(mod.id)}
                    className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors py-1"
                  >
                    <FiPlus size={12} /> Add Lesson
                  </button>

                  {/* Quiz button — links to the dedicated quiz builder for this module */}
                  <Link
                    href={`/admin/modules/${mod.id}/quiz`}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      mod._count.quizzes > 0
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]"
                    }`}
                    title={mod._count.quizzes > 0 ? "Edit module quiz" : "Add a quiz to this module"}
                  >
                    <FiHelpCircle size={12} />
                    {mod._count.quizzes > 0 ? `Quiz (${mod._count.quizzes})` : "Add Quiz"}
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {modules.length > 0 && (
        <div className="mt-6 p-4 glass-card rounded-xl flex items-center gap-3 text-sm text-[var(--text-muted)]">
          <FiCheckCircle className="text-emerald-400 flex-shrink-0" size={16} />
          <span>
            {modules.length} module{modules.length !== 1 ? "s" : ""} ·{" "}
            {modules.reduce((s, m) => s + m._count.lectures, 0)} lesson{modules.reduce((s, m) => s + m._count.lectures, 0) !== 1 ? "s" : ""}
          </span>
          <Link
            href={course ? `/courses/${course.slug}` : "#"}
            target="_blank"
            className="ml-auto text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
          >
            Preview course →
          </Link>
        </div>
      )}
    </div>
  );
}

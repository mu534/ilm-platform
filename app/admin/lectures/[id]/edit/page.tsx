"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FileUploader } from "../../../../components/FileUploader";
import { LectureResourceManager } from "../../../../components/lectures/LectureResourceManager";
import { FiSave, FiX, FiArrowLeft } from "react-icons/fi";

interface LectureFormData {
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

export default function EditLecturePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [form, setForm] = useState<LectureFormData>({
    title:        "",
    description:  "",
    content:      "",
    type:         "TEXT",
    tags:         "",
    published:    false,
    featured:     false,
    mediaUrl:     "",
    thumbnailUrl: "",
  });

  // Track the parent course builder URL so we can navigate back correctly
  const [builderUrl, setBuilderUrl] = useState<string>("/admin/courses");
  const [courseTitle, setCourseTitle] = useState<string>("");

  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchLecture() {
      try {
        const res  = await fetch(`/api/lectures/${id}`);
        const data = await res.json();
        if (data.success && data.data) {
          const lecture = data.data;
          setForm({
            title:        lecture.title        ?? "",
            description:  lecture.description  ?? "",
            content:      lecture.content      ?? "",
            type:         lecture.type         ?? "TEXT",
            tags:         (lecture.tags ?? []).join(", "),
            published:    lecture.published    ?? false,
            featured:     lecture.featured     ?? false,
            mediaUrl:     lecture.mediaUrl     ?? "",
            thumbnailUrl: lecture.thumbnailUrl ?? "",
          });

          // Resolve the parent course builder URL
          const courseId = lecture.module?.courseId ?? lecture.courseId ?? null;
          if (courseId) {
            setBuilderUrl(`/admin/courses/${courseId}/builder`);
            setCourseTitle(lecture.module?.course?.title ?? "");
          }
        }
      } catch (err) {
        console.error("Failed to fetch lecture:", err);
        setErrors({ general: "Failed to load lecture data." });
      } finally {
        setLoading(false);
      }
    }

    void fetchLecture();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    try {
      const payload = {
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const res  = await fetch(`/api/lectures/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          Object.entries(data.details).forEach(([k, v]) => {
            fieldErrors[k] = (v as string[])[0];
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.error ?? "Update failed" });
        }
      } else {
        // Go back to the Course Builder, not to /admin/lectures
        router.push(builderUrl);
      }
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-2.5 bg-[var(--bg-card)] border rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors ${
      errors[field] ? "border-red-500/40" : "border-[var(--border)]"
    }`;

  const typeOptions: { value: LectureFormData["type"]; label: string }[] = [
    { value: "TEXT",  label: "Article" },
    { value: "VIDEO", label: "Video"   },
    { value: "AUDIO", label: "Audio"   },
    { value: "PDF",   label: "PDF"     },
  ];

  if (loading) {
    return (
      <div className="p-8 max-w-3xl">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href={builderUrl}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-3"
          >
            <FiArrowLeft size={12} />
            {courseTitle ? `Back to "${courseTitle}" Builder` : "Back to Course Builder"}
          </Link>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Edit Lesson
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Update lesson details and content
          </p>
        </div>
        <Link
          href={builderUrl}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-lg hover:bg-[var(--accent-dim)] transition-colors"
          title="Close"
        >
          <FiX />
        </Link>
      </div>

      {errors.general && (
        <div className="mb-6 p-3 rounded-xl bg-red-900/20 border border-red-500/20 text-red-400 text-sm">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Title */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Title *</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass("title")}
            placeholder="Lesson title"
            required
          />
          {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
        </div>

        {/* Content Type */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Content Type *</label>
          <div className="flex gap-2 flex-wrap">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, type: opt.value })}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  form.type === opt.value
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Description *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass("description")}
            rows={3}
            placeholder="Brief description of this lesson"
            required
          />
          {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
        </div>

        {/* Content body — only for TEXT */}
        {form.type === "TEXT" && (
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
              Content <span className="font-normal">(HTML supported)</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className={inputClass("content")}
              rows={14}
              placeholder="<p>Write the full lesson content here…</p>"
            />
          </div>
        )}

        {/* Media upload — VIDEO / AUDIO / PDF */}
        {form.type === "VIDEO" && (
          <FileUploader
            accept="video/*"
            folder="ilm-platform/lectures"
            label="Video File"
            onUpload={(url) => setForm({ ...form, mediaUrl: url })}
            currentUrl={form.mediaUrl}
          />
        )}
        {form.type === "AUDIO" && (
          <FileUploader
            accept="audio/*"
            folder="ilm-platform/lectures"
            label="Audio File"
            onUpload={(url) => setForm({ ...form, mediaUrl: url })}
            currentUrl={form.mediaUrl}
          />
        )}
        {form.type === "PDF" && (
          <FileUploader
            accept="application/pdf"
            folder="ilm-platform/lectures"
            label="PDF Document"
            onUpload={(url) => setForm({ ...form, mediaUrl: url })}
            currentUrl={form.mediaUrl}
          />
        )}

        {/* Thumbnail */}
        <FileUploader
          accept="image/*"
          folder="ilm-platform/thumbnails"
          label="Thumbnail Image"
          onUpload={(url) => setForm({ ...form, thumbnailUrl: url })}
          currentUrl={form.thumbnailUrl}
        />

        {/* Tags */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
            Tags <span className="font-normal">(comma-separated)</span>
          </label>
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className={inputClass("tags")}
            placeholder="Fiqh, Quran, Hadith, Aqeedah"
          />
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">Published (visible to students)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">Featured on homepage</span>
          </label>
        </div>

        {/* Resources */}
        <div className="border-t border-[var(--border)] pt-6">
          <LectureResourceManager lectureId={id} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
          >
            <FiSave size={15} />
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <Link
            href={builderUrl}
            className="px-6 py-2.5 border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition-colors text-sm"
          >
            Cancel
          </Link>
        </div>

      </form>
    </div>
  );
}

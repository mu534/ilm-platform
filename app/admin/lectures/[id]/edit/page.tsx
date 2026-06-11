"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { FileUploader } from "../../../../components/FileUploader";
import { FiSave, FiX } from "react-icons/fi";

interface LectureFormData {
  title: string;
  description: string;
  content: string;
  type: "TEXT" | "VIDEO";
  tags: string;
  published: boolean;
  featured: boolean;
  mediaUrl: string;
  thumbnailUrl: string;
}

export default function EditLecturePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [form, setForm] = useState<LectureFormData>({
    title: "",
    description: "",
    content: "",
    type: "TEXT",
    tags: "",
    published: false,
    featured: false,
    mediaUrl: "",
    thumbnailUrl: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchLecture() {
      try {
        const res = await fetch(`/api/lectures/${id}`);
        const data = await res.json();
        if (data.success && data.data) {
          const lecture = data.data;
          setForm({
            title: lecture.title ?? "",
            description: lecture.description ?? "",
            content: lecture.content ?? "",
            type: lecture.type ?? "TEXT",
            tags: (lecture.tags ?? []).join(", "),
            published: lecture.published ?? false,
            featured: lecture.featured ?? false,
            mediaUrl: lecture.mediaUrl ?? "",
            thumbnailUrl: lecture.thumbnailUrl ?? "",
          });
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

      const res = await fetch(`/api/lectures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        router.push("/admin/lectures");
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Edit Lecture
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Update lecture details and content
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-lg hover:bg-[var(--accent-dim)] transition-colors"
        >
          <FiX />
        </button>
      </div>

      {errors.general && (
        <div className="mb-6 p-3 rounded-xl bg-red-900/20 border border-red-500/20 text-red-400 text-sm">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
            Title *
          </label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass("title")}
            placeholder="Lecture title"
            required
          />
          {errors.title && (
            <p className="text-xs text-red-400 mt-1">{errors.title}</p>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
            Content Type *
          </label>
          <div className="flex gap-3">
            {(["TEXT", "VIDEO"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm({ ...form, type })}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  form.type === type
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
            Description *
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass("description")}
            rows={3}
            placeholder="Brief description of the lecture"
            required
          />
          {errors.description && (
            <p className="text-xs text-red-400 mt-1">{errors.description}</p>
          )}
        </div>

        {/* Content (TEXT type) */}
        {form.type === "TEXT" && (
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
              Content (HTML supported)
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className={inputClass("content")}
              rows={12}
              placeholder="<p>Write the full lecture content here...</p>"
            />
          </div>
        )}

        {/* Video upload */}
        {form.type !== "TEXT" && (
          <FileUploader
            accept="video/*"
            folder="ilm-platform/lectures"
            label="Video File"
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
            Tags (comma-separated)
          </label>
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className={inputClass("tags")}
            placeholder="Fiqh, Quran, Hadith, Aqeedah"
          />
        </div>

        {/* Options */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">Published</span>
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

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
          >
            <FiSave size={15} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

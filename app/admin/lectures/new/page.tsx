"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploader } from "../../../components/FileUploader";
import { FiSave, FiX } from "react-icons/fi";

export default function NewLecturePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    type: "TEXT" as "TEXT" | "VIDEO",
    tags: "",
    published: false,
    featured: false,
    mediaUrl: "",
    thumbnailUrl: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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

      const res = await fetch("/api/lectures", {
        method: "POST",
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
          setErrors({ general: data.error });
        }
      } else {
        router.push("/admin/lectures");
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-2.5 bg-ink-800/80 border rounded-xl text-white text-sm placeholder-ink-600 focus:outline-none focus:border-gold-500/50 transition-colors ${
      errors[field] ? "border-red-500/40" : "border-white/10"
    }`;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            New Lecture
          </h1>
          <p className="text-ink-400 text-sm mt-1">
            Create and publish a new lecture
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-ink-400 hover:text-white p-2"
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
          <label className="block text-xs text-ink-400 font-medium mb-1.5">
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
          <label className="block text-xs text-ink-400 font-medium mb-1.5">
            Content Type *
          </label>
          <div className="flex gap-3">
            {([ "TEXT", "VIDEO"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm({ ...form, type })}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  form.type === type
                    ? "bg-gold-600 text-white"
                    : "border border-white/10 text-ink-300 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-ink-400 font-medium mb-1.5">
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

        {/* Content (for TEXT type) */}
        {form.type === "TEXT" && (
          <div>
            <label className="block text-xs text-ink-400 font-medium mb-1.5">
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

        {/* Media upload */}
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
          <label className="block text-xs text-ink-400 font-medium mb-1.5">
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
              onChange={(e) =>
                setForm({ ...form, published: e.target.checked })
              }
              className="w-4 h-4 accent-gold-500"
            />
            <span className="text-sm text-ink-300">Publish immediately</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="w-4 h-4 accent-gold-500"
            />
            <span className="text-sm text-ink-300">Feature on homepage</span>
          </label>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gold-600 hover:bg-gold-500 disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
          >
            <FiSave size={15} />
            {saving ? "Saving..." : "Save Lecture"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-white/10 text-ink-300 hover:text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

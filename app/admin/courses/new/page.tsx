"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileUploader } from "../../../components/FileUploader";
import { FiSave, FiX, FiPlus, FiTrash2 } from "react-icons/fi";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

interface FormData {
  title:             string;
  description:       string;
  thumbnailUrl:      string;
  bannerUrl:         string;
  difficulty:        "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  estimatedDuration: number;
  categoryId:        string;
  objectives:        string[];
  prerequisites:     string[];
  published:         boolean;
  featured:          boolean;
}

export default function NewCoursePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm]   = useState<FormData>({
    title: "", description: "", thumbnailUrl: "", bannerUrl: "",
    difficulty: "BEGINNER", estimatedDuration: 0, categoryId: "",
    objectives: [""], prerequisites: [""],
    published: false, featured: false,
  });
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); })
      .catch(() => {});
  }, []);

  const updateListItem = (field: "objectives" | "prerequisites", idx: number, value: string) => {
    const arr = [...form[field]];
    arr[idx] = value;
    setForm({ ...form, [field]: arr });
  };

  const addListItem    = (field: "objectives" | "prerequisites") =>
    setForm({ ...form, [field]: [...form[field], ""] });

  const removeListItem = (field: "objectives" | "prerequisites", idx: number) =>
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== idx) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        ...form,
        objectives:    form.objectives.filter(Boolean),
        prerequisites: form.prerequisites.filter(Boolean),
        categoryId:    form.categoryId || undefined,
      };
      const res  = await fetch("/api/courses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.details) {
          const fe: Record<string, string> = {};
          Object.entries(data.details).forEach(([k, v]) => { fe[k] = (v as string[])[0]; });
          setErrors(fe);
        } else {
          setErrors({ general: data.error ?? "Failed to create course" });
        }
      } else {
        router.push("/admin/courses");
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field?: string) =>
    `w-full px-4 py-2.5 bg-[var(--bg-card)] border rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors ${
      field && errors[field] ? "border-red-500/40" : "border-[var(--border)]"
    }`;

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">New Course</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Create a structured learning path</p>
        </div>
        <button onClick={() => router.back()} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-dim)] transition-colors">
          <FiX />
        </button>
      </div>

      {errors.general && (
        <div className="mb-6 p-3 rounded-xl bg-red-900/20 border border-red-500/20 text-red-400 text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Title *</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass("title")} placeholder="Course title" required />
          {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Description *</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass("description")} rows={4} placeholder="What students will learn in this course..." required />
          {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
        </div>

        {/* Category + Difficulty + Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Category</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputClass()}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Difficulty</label>
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as FormData["difficulty"] })} className={inputClass()}>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Duration (min)</label>
            <input type="number" min="0" value={form.estimatedDuration} onChange={(e) => setForm({ ...form, estimatedDuration: Number(e.target.value) })} className={inputClass()} placeholder="0" />
          </div>
        </div>

        {/* Thumbnail */}
        <FileUploader
          accept="image/*"
          folder="ilm-platform/courses/thumbnails"
          label="Thumbnail Image"
          onUpload={(url) => setForm({ ...form, thumbnailUrl: url })}
          currentUrl={form.thumbnailUrl}
        />

        {/* Banner */}
        <FileUploader
          accept="image/*"
          folder="ilm-platform/courses/banners"
          label="Banner Image"
          onUpload={(url) => setForm({ ...form, bannerUrl: url })}
          currentUrl={form.bannerUrl}
        />

        {/* Objectives */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Learning Objectives</label>
          <div className="space-y-2">
            {form.objectives.map((obj, i) => (
              <div key={i} className="flex gap-2">
                <input value={obj} onChange={(e) => updateListItem("objectives", i, e.target.value)} className={inputClass()} placeholder={`Objective ${i + 1}`} />
                {form.objectives.length > 1 && (
                  <button type="button" onClick={() => removeListItem("objectives", i)} className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0">
                    <FiTrash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => addListItem("objectives")} className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
              <FiPlus size={13} /> Add objective
            </button>
          </div>
        </div>

        {/* Prerequisites */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Prerequisites</label>
          <div className="space-y-2">
            {form.prerequisites.map((pre, i) => (
              <div key={i} className="flex gap-2">
                <input value={pre} onChange={(e) => updateListItem("prerequisites", i, e.target.value)} className={inputClass()} placeholder={`Prerequisite ${i + 1}`} />
                {form.prerequisites.length > 1 && (
                  <button type="button" onClick={() => removeListItem("prerequisites", i)} className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0">
                    <FiTrash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => addListItem("prerequisites")} className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
              <FiPlus size={13} /> Add prerequisite
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="w-4 h-4 accent-[var(--accent)]" />
            <span className="text-sm text-[var(--text-secondary)]">Publish immediately</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="w-4 h-4 accent-[var(--accent)]" />
            <span className="text-sm text-[var(--text-secondary)]">Feature on homepage</span>
          </label>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-60 text-white rounded-xl font-medium transition-colors">
            <FiSave size={15} />
            {saving ? "Saving..." : "Create Course"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

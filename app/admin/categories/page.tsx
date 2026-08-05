"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiX,
  FiLoader, FiTag, FiBookOpen, FiVideo,
} from "react-icons/fi";

interface Category {
  id:          string;
  name:        string;
  slug:        string;
  description: string | null;
  icon:        string | null;
  color:       string | null;
  order:       number;
  _count:      { courses: number; lectures: number };
}

interface FormState {
  name:        string;
  slug:        string;
  description: string;
  icon:        string;
  color:       string;
  order:       number;
}

const emptyForm: FormState = { name: "", slug: "", description: "", icon: "📖", color: "#c8871a", order: 0 };

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");
}

const inputClass =
  "w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,     setLoading]   = useState(true);
  const [error,       setError]     = useState("");

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form,      setForm]      = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) setCategories(data.data);
      else setError(data.error ?? "Failed to load categories");
    } catch {
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const startCreate = () => {
    setForm(emptyForm);
    setSlugTouched(false);
    setFormError("");
    setEditingId(null);
    setCreating(true);
  };

  const startEdit = (cat: Category) => {
    setForm({
      name: cat.name, slug: cat.slug, description: cat.description ?? "",
      icon: cat.icon ?? "📖", color: cat.color ?? "#c8871a", order: cat.order,
    });
    setSlugTouched(true);
    setFormError("");
    setCreating(false);
    setEditingId(cat.id);
  };

  const cancel = () => { setCreating(false); setEditingId(null); setForm(emptyForm); setFormError(""); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    const slug = form.slug.trim() || slugify(form.name);
    if (!slug) { setFormError("Slug is required"); return; }

    setSaving(true); setFormError("");
    try {
      const endpoint = editingId ? `/api/categories/${editingId}` : "/api/categories";
      const method   = editingId ? "PATCH" : "POST";
      const res  = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, slug, order: Number(form.order) || 0 }),
      });
      const data = await res.json();
      if (!data.success) { setFormError(data.error ?? "Failed to save category"); return; }
      cancel();
      await load();
    } catch {
      setFormError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    const inUse = cat._count.courses + cat._count.lectures;
    const msg = inUse > 0
      ? `"${cat.name}" is used by ${cat._count.courses} course(s) and ${cat._count.lectures} lecture(s). Delete anyway? Those items will keep working but lose this category.`
      : `Delete "${cat.name}"? This can't be undone.`;
    if (!confirm(msg)) return;

    setDeletingId(cat.id);
    try {
      const res  = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        alert(data.error ?? "Failed to delete category — it may still be referenced by existing courses.");
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch {
      alert("Failed to delete category.");
    } finally {
      setDeletingId(null);
    }
  };

  const formCard = (
    <form onSubmit={submit} className="p-5 bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl space-y-4 mb-6">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        {editingId ? "Edit Category" : "New Category"}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Name *</label>
          <input
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
            }}
            className={inputClass}
            placeholder="e.g. Tafsir"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Slug *</label>
          <input
            value={form.slug}
            onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: slugify(e.target.value) }); }}
            className={inputClass}
            placeholder="tafsir"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={inputClass}
          rows={2}
          placeholder="Brief description shown to students"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Icon (emoji)</label>
          <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={inputClass} placeholder="📖" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-9 h-9 rounded-lg border border-[var(--border)] bg-transparent cursor-pointer" />
            <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Sort Order</label>
          <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className={inputClass} />
        </div>
      </div>

      {formError && <p className="text-xs text-red-400">{formError}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2">
          {saving ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
          {saving ? "Saving…" : editingId ? "Update Category" : "Create Category"}
        </button>
        <button type="button" onClick={cancel} className="btn-secondary text-sm px-4 py-2">
          <FiX size={14} /> Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1.5">
            Taxonomy
          </p>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Categories</h1>
        </div>
        {!creating && !editingId && (
          <button onClick={startCreate} className="btn-primary text-sm px-4 py-2">
            <FiPlus size={14} /> New Category
          </button>
        )}
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Categories power the subject dropdown when creating a course or lecture, and the &quot;Browse by Subject&quot; section on the homepage.
      </p>

      {(creating || editingId) && formCard}

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl shimmer" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[var(--border)] rounded-2xl">
          <FiTag className="mx-auto text-3xl text-[var(--text-muted)] mb-3" />
          <p className="text-[var(--text-primary)] font-semibold mb-1">No categories yet</p>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            This is why the category dropdown is empty when creating a course — add your first one below.
          </p>
          <button onClick={startCreate} className="btn-primary text-sm px-4 py-2 mx-auto">
            <FiPlus size={14} /> Create First Category
          </button>
        </div>
      ) : (
        <div className="border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-4 px-4 py-3.5 bg-[var(--bg-card)]">
              <div
                className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-lg border border-[var(--border-subtle)]"
                style={{ background: cat.color ? `${cat.color}1a` : "var(--accent-dim)" }}
              >
                {cat.icon ?? "📖"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{cat.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">/{cat.slug}</p>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs text-[var(--text-muted)] flex-shrink-0">
                <span className="flex items-center gap-1"><FiBookOpen size={12} /> {cat._count.courses}</span>
                <span className="flex items-center gap-1"><FiVideo size={12} /> {cat._count.lectures}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(cat)}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors"
                  title="Edit"
                >
                  <FiEdit2 size={13} />
                </button>
                <button
                  onClick={() => void handleDelete(cat)}
                  disabled={deletingId === cat.id}
                  className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-60"
                  title="Delete"
                >
                  {deletingId === cat.id ? <FiLoader className="animate-spin" size={13} /> : <FiTrash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

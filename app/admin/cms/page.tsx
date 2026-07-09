"use client";

import { useState, useEffect, useCallback } from "react";
import { FiSave, FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";

interface CmsItem {
  id:       string;
  key:      string;
  title:    string | null;
  content:  string;
  imageUrl: string | null;
  link:     string | null;
  active:   boolean;
  order:    number;
}

const PRESET_KEYS = [
  { key: "homepage_banner",     label: "Homepage Banner"    },
  { key: "homepage_announcement", label: "Announcement Bar" },
  { key: "footer_message",      label: "Footer Message"     },
  { key: "about_intro",         label: "About Introduction" },
];

export default function AdminCmsPage() {
  const [items,   setItems]   = useState<CmsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<CmsItem> | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/cms");
      const data = await res.json();
      if (data.success) setItems(data.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res  = await fetch("/api/cms", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(editing),
      });
      const data = await res.json();
      if (data.success) {
        setMsg("Saved!"); setEditing(null); void load();
        setTimeout(() => setMsg(""), 2000);
      }
    } finally { setSaving(false); }
  };

  const remove = async (key: string) => {
    if (!confirm(`Delete "${key}"?`)) return;
    await fetch(`/api/cms?key=${encodeURIComponent(key)}`, { method: "DELETE" }).catch(() => {});
    void load();
  };

  const inputClass = "w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors";

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">Content</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">CMS</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Manage homepage and site content</p>
        </div>
        <button
          onClick={() => setEditing({ key: "", title: "", content: "", active: true, order: 0 })}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <FiPlus size={14} /> Add Content
        </button>
      </div>

      {msg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{msg}</div>
      )}

      {/* Preset quick-add */}
      <div className="mb-6">
        <p className="text-xs text-[var(--text-muted)] font-medium mb-2">Quick Add Presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_KEYS.map((p) => (
            <button
              key={p.key}
              onClick={() => setEditing({ key: p.key, title: p.label, content: "", active: true, order: 0 })}
              className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="glass-card rounded-2xl p-6 mb-8">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm mb-5">
            {editing.id ? "Edit Content" : "New Content"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Key *</label>
              <input value={editing.key ?? ""} onChange={(e) => setEditing({ ...editing, key: e.target.value })} className={inputClass} placeholder="e.g. homepage_banner" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Title</label>
              <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inputClass} placeholder="Display title" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Content *</label>
            <textarea value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className={inputClass} rows={4} placeholder="Content text or HTML" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Image URL</label>
              <input value={editing.imageUrl ?? ""} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} className={inputClass} placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Link URL</label>
              <input value={editing.link ?? ""} onChange={(e) => setEditing({ ...editing, link: e.target.value })} className={inputClass} placeholder="https://..." />
            </div>
          </div>
          <div className="flex items-center gap-4 mb-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="w-4 h-4 accent-[var(--accent)]" />
              <span className="text-sm text-[var(--text-secondary)]">Active</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Order:</span>
              <input type="number" value={editing.order ?? 0} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} className="w-16 px-2 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] text-center" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving || !editing.key || !editing.content} className="flex items-center gap-2 px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors">
              <FiSave size={13} /> {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(null)} className="px-5 py-2 border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[var(--border)]">
            {[1,2,3].map((i) => <div key={i} className="h-14 shimmer" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-muted)] text-sm">No CMS content yet.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--bg-card-hover)] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.title ?? item.key}</p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">{item.key}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${item.active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]"}`}>
                  {item.active ? "Active" : "Inactive"}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(item)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors"><FiEdit2 size={13} /></button>
                  <button onClick={() => remove(item.key)} className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><FiTrash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

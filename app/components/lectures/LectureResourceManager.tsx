"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  FiUploadCloud, FiTrash2, FiFile, FiVideo,
  FiHeadphones, FiImage, FiFileText, FiLoader,
  FiExternalLink, FiPlus, FiLink, FiX,
} from "react-icons/fi";

type Category = "RESOURCE" | "REFERENCE";

interface MediaItem {
  id:       string;
  url:      string;
  type:     string;
  category: Category;
  filename: string;
  size:     number;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0)           return "";
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const typeIcon: Record<string, React.ReactNode> = {
  VIDEO:    <FiVideo      size={13} className="text-blue-400"         />,
  AUDIO:    <FiHeadphones size={13} className="text-purple-400"       />,
  IMAGE:    <FiImage      size={13} className="text-emerald-400"      />,
  PDF:      <FiFileText   size={13} className="text-red-400"          />,
  DOCUMENT: <FiFile       size={13} className="text-[var(--accent)]"  />,
  LINK:     <FiLink       size={13} className="text-[var(--accent)]"  />,
};

interface Props {
  lectureId: string;
}

export function LectureResourceManager({ lectureId }: Props) {
  const [media,     setMedia]     = useState<MediaItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState("");
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [retagging, setRetagging] = useState<string | null>(null);

  // What the NEXT upload/link will be tagged as
  const [nextCategory, setNextCategory] = useState<Category>("RESOURCE");

  // Inline "add external link" form
  const [addingLink, setAddingLink] = useState(false);
  const [linkUrl,    setLinkUrl]    = useState("");
  const [linkLabel,  setLinkLabel]  = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res  = await fetch(`/api/lectures/${lectureId}/media`);
      const data = await res.json();
      if (data.success) setMedia(data.data as MediaItem[]);
    } finally {
      setLoading(false);
    }
  }, [lectureId]);

  useEffect(() => { void load(); }, [load]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("filename", file.name);
      form.append("category", nextCategory);
      const res  = await fetch(`/api/lectures/${lectureId}/media`, {
        method: "POST",
        body:   form,
      });
      const data = await res.json();
      if (!data.success) { setError(data.error ?? "Upload failed"); return; }
      setMedia((prev) => [...prev, data.data as MediaItem]);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;
    setUploading(true);
    setError("");
    try {
      const res  = await fetch(`/api/lectures/${lectureId}/media`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: linkUrl.trim(), filename: linkLabel.trim() || linkUrl.trim(), category: nextCategory }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error ?? "Failed to add link"); return; }
      setMedia((prev) => [...prev, data.data as MediaItem]);
      setLinkUrl(""); setLinkLabel(""); setAddingLink(false);
    } catch {
      setError("Failed to add link. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId: string) => {
    if (!confirm("Remove this item?")) return;
    setDeleting(mediaId);
    try {
      await fetch(`/api/lectures/${lectureId}/media?mediaId=${mediaId}`, {
        method: "DELETE",
      });
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } finally {
      setDeleting(null);
    }
  };

  const handleRetag = async (item: MediaItem) => {
    const newCategory: Category = item.category === "REFERENCE" ? "RESOURCE" : "REFERENCE";
    setRetagging(item.id);
    try {
      const res  = await fetch(`/api/lectures/${lectureId}/media?mediaId=${item.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ category: newCategory }),
      });
      const data = await res.json();
      if (data.success) {
        setMedia((prev) => prev.map((m) => (m.id === item.id ? { ...m, category: newCategory } : m)));
      }
    } finally {
      setRetagging(null);
    }
  };

  const resources  = media.filter((m) => m.category === "RESOURCE");
  const references = media.filter((m) => m.category === "REFERENCE");

  const renderItem = (item: MediaItem) => (
    <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--bg-card)]">
      <span className="flex-shrink-0">
        {typeIcon[item.type] ?? <FiFile size={13} className="text-[var(--text-muted)]" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{item.filename}</p>
        <p className="text-[10px] text-[var(--text-muted)]">
          {item.type.toLowerCase()}{item.size > 0 ? ` · ${formatBytes(item.size)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => void handleRetag(item)}
          disabled={retagging === item.id}
          className="px-2 py-1 text-[10px] font-medium rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-60"
          title={item.category === "RESOURCE" ? "Move to References" : "Move to Resources"}
        >
          {retagging === item.id ? <FiLoader className="animate-spin" size={10} /> : (item.category === "RESOURCE" ? "→ Reference" : "→ Resource")}
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          title="Preview"
        >
          <FiExternalLink size={12} />
        </a>
        <button
          type="button"
          onClick={() => void handleDelete(item.id)}
          disabled={deleting === item.id}
          className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors disabled:opacity-60"
          title="Remove"
        >
          {deleting === item.id
            ? <FiLoader className="animate-spin" size={12} />
            : <FiTrash2 size={12} />
          }
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Add controls ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Add Lesson Material
          </label>
          {/* What the next attachment gets tagged as */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
            {(["RESOURCE", "REFERENCE"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNextCategory(c)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                  nextCategory === c
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {c === "RESOURCE" ? "Resource" : "Reference"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-60"
          >
            {uploading ? <FiLoader className="animate-spin" size={12} /> : <FiUploadCloud size={12} />}
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setAddingLink((v) => !v)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            <FiLink size={12} /> Add Link
          </button>
        </div>

        {addingLink && (
          <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] space-y-2">
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
            <input
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder="Label (e.g. Surah Al-Baqarah 2:255 — Tafsir Ibn Kathir)"
              className="w-full px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleAddLink()}
                disabled={uploading || !linkUrl.trim()}
                className="btn-primary text-xs px-3 py-1.5 disabled:opacity-60"
              >
                {uploading ? <FiLoader className="animate-spin" size={11} /> : <FiPlus size={11} />}
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAddingLink(false); setLinkUrl(""); setLinkLabel(""); }}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                <FiX size={11} /> Cancel
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* ── Resources list ── */}
      <div>
        <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
          Resources ({resources.length})
        </p>
        {loading ? (
          <div className="h-9 rounded-lg shimmer" />
        ) : resources.length > 0 ? (
          <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
            {resources.map(renderItem)}
          </div>
        ) : (
          <p className="text-[11px] text-[var(--text-muted)] italic">No resources attached yet.</p>
        )}
      </div>

      {/* ── References list ── */}
      <div>
        <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
          References ({references.length})
        </p>
        {loading ? (
          <div className="h-9 rounded-lg shimmer" />
        ) : references.length > 0 ? (
          <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
            {references.map(renderItem)}
          </div>
        ) : (
          <p className="text-[11px] text-[var(--text-muted)] italic">No references attached yet.</p>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*,audio/*,video/*,application/pdf"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ""; }}
        multiple={false}
      />
    </div>
  );
}

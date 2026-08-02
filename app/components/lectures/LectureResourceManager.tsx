"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  FiUploadCloud, FiTrash2, FiFile, FiVideo,
  FiHeadphones, FiImage, FiFileText, FiLoader,
  FiExternalLink, FiPlus,
} from "react-icons/fi";

interface MediaItem {
  id:       string;
  url:      string;
  type:     string;
  filename: string;
  size:     number;
}

function formatBytes(bytes: number): string {
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

  const handleDelete = async (mediaId: string) => {
    if (!confirm("Remove this resource?")) return;
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Lesson Resources
        </label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors disabled:opacity-60"
        >
          {uploading ? (
            <><FiLoader className="animate-spin" size={12} /> Uploading…</>
          ) : (
            <><FiPlus size={12} /> Add Resource</>
          )}
        </button>
      </div>

      {/* Resource list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-10 rounded-lg shimmer" />)}
        </div>
      ) : media.length > 0 ? (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
          {media.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--bg-card)]">
              <span className="flex-shrink-0">
                {typeIcon[item.type] ?? <FiFile size={13} className="text-[var(--text-muted)]" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{item.filename}</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {item.type.toLowerCase()} · {formatBytes(item.size)}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
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
                  onClick={() => handleDelete(item.id)}
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
          ))}
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="border border-dashed border-[var(--border)] rounded-xl p-5 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
        >
          <FiUploadCloud className="mx-auto text-2xl text-[var(--text-muted)] mb-1.5" />
          <p className="text-xs text-[var(--text-muted)]">
            Upload PDFs, documents, or other resources
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">PDF, DOCX, images, audio — max 100 MB</p>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

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

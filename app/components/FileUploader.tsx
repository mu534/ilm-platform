"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { FiUploadCloud, FiX, FiFile, FiLoader } from "react-icons/fi";

interface FileUploaderProps {
  accept:      string;
  folder:      string;
  label:       string;
  onUpload:    (url: string) => void;
  currentUrl?: string;
  /** Aspect ratio for the preview box, e.g. "16/9" or "3/1". Defaults to "16/9". */
  aspectRatio?: string;
}

export function FileUploader({
  accept,
  folder,
  label,
  onUpload,
  currentUrl,
  aspectRatio = "16/9",
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState("");
  const [preview,   setPreview]   = useState(currentUrl ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage = accept.includes("image");
  const isVideo = accept.includes("video");

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    setProgress(15);

    try {
      const formData = new FormData();
      formData.append("file",   file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      setProgress(85);

      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Upload failed");

      setPreview(data.data.url);
      onUpload(data.data.url);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const clear = () => { setPreview(""); onUpload(""); };

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">
        {label}
      </label>

      {preview ? (
        /* ── Preview ── */
        <div className="relative rounded-xl overflow-hidden border border-[var(--border-strong)] group bg-[var(--bg-secondary)]"
          style={{ aspectRatio }}
        >
          {isImage && (
            <Image
              src={preview}
              alt="Preview"
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-contain"   /* contain = full image, no crop */
              unoptimized                  /* bypass Next.js optimizer — Cloudinary serves directly */
            />
          )}
          {isVideo && (
            <video src={preview} controls className="w-full h-full object-contain" />
          )}
          {!isImage && !isVideo && (
            <div className="w-full h-full flex items-center justify-center gap-2 text-[var(--text-muted)]">
              <FiFile size={20} />
              <span className="text-sm">File uploaded</span>
            </div>
          )}

          {/* Remove button */}
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
            aria-label="Remove file"
          >
            <FiX size={14} />
          </button>

          {/* Re-upload overlay */}
          <div
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors cursor-pointer flex items-center justify-center"
          >
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white font-medium bg-black/60 px-3 py-1.5 rounded-lg">
              Click to replace
            </span>
          </div>
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-8 text-center cursor-pointer transition-colors group"
          style={{ aspectRatio }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          aria-label={`Upload ${label}`}
        >
          <FiUploadCloud
            className="mx-auto text-3xl text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors mb-3"
          />
          <p className="text-sm text-[var(--text-secondary)]">
            Drag &amp; drop or{" "}
            <span className="text-[var(--accent)] font-medium">browse</span>
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Max 100 MB
          </p>
        </div>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <FiLoader className="animate-spin" size={12} />
            Uploading…
          </div>
          <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />
    </div>
  );
}

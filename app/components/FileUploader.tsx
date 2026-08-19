"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  FiUploadCloud, FiX, FiFile, FiLoader,
  FiCheckCircle, FiAlertTriangle, FiVideo,
} from "react-icons/fi";

interface FileUploaderProps {
  accept:      string;
  folder:      string;
  label:       string;
  onUpload:    (url: string, publicId?: string) => void;
  currentUrl?: string;
  aspectRatio?: string;
  /** Maximum file size in bytes — client enforced before upload starts. Default 500 MB. */
  maxSize?: number;
}

const DEFAULT_MAX_SIZE = 500 * 1024 * 1024; // 500 MB

/** Human-readable file size */
function fmtSize(bytes: number): string {
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)     return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Format seconds → mm:ss */
function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FileUploader({
  accept,
  folder,
  label,
  onUpload,
  currentUrl,
  aspectRatio = "16/9",
  maxSize = DEFAULT_MAX_SIZE,
}: FileUploaderProps) {
  const [uploading,    setUploading]    = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [speedKBs,     setSpeedKBs]     = useState(0);
  const [bytesLoaded,  setBytesLoaded]  = useState(0);
  const [totalBytes,   setTotalBytes]   = useState(0);
  const [error,        setError]        = useState("");
  const [preview,      setPreview]      = useState(currentUrl ?? "");
  const [videoDur,     setVideoDur]     = useState<number | null>(null);
  const [done,         setDone]         = useState(false);

  const inputRef  = useRef<HTMLInputElement>(null);
  const xhrRef    = useRef<XMLHttpRequest | null>(null);
  const startRef  = useRef<number>(0);

  const isImage = accept.includes("image");
  const isVideo = accept.includes("video");

  // ── Client-side validation ─────────────────────────────────────────────────
  const validate = useCallback((file: File): string | null => {
    if (file.size > maxSize) {
      return `File too large (${fmtSize(file.size)}). Maximum is ${fmtSize(maxSize)}.`;
    }
    // Validate MIME against accept string segments
    const acceptedTypes = accept.split(",").map((t) => t.trim());
    const mimeOk = acceptedTypes.some((t) => {
      if (t.endsWith("/*")) return file.type.startsWith(t.slice(0, -2));
      return file.type === t || file.name.endsWith(t); // handle extensions like .pdf
    });
    if (!mimeOk) {
      return `Unsupported file type "${file.type}". Accepted: ${accept}`;
    }
    return null;
  }, [accept, maxSize]);

  // ── XHR upload with real progress ─────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    const validationError = validate(file);
    if (validationError) { setError(validationError); return; }

    setError(""); setDone(false); setProgress(0); setBytesLoaded(0);
    setTotalBytes(file.size); setSpeedKBs(0); setUploading(true);
    startRef.current = Date.now();

    try {
      // ── Step 1: Get a signed upload URL from our server ──────────────────
      const resourceType = file.type.startsWith("video/") ? "video"
        : file.type.startsWith("image/") ? "image"
        : file.type.startsWith("audio/") ? "auto"
        : "raw";

      const sigRes = await fetch("/api/upload-signature", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ folder, resourceType }),
      });

      if (!sigRes.ok) {
        const errData = await sigRes.json() as { error?: string };
        throw new Error(errData.error ?? "Failed to get upload signature");
      }

      const sigData = await sigRes.json() as {
        success: boolean;
        data: {
          signature: string; timestamp: number;
          cloudName: string; apiKey: string;
          folder: string; resourceType: string;
        };
      };

      if (!sigData.success) throw new Error("Failed to get upload signature");
      const sig = sigData.data;

      // ── Step 2: Upload directly to Cloudinary from the browser ──────────
      const cloudUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`;
      const formData = new FormData();
      formData.append("file",        file);
      formData.append("api_key",     sig.apiKey);
      formData.append("timestamp",   String(sig.timestamp));
      formData.append("signature",   sig.signature);
      formData.append("folder",      sig.folder);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.addEventListener("progress", (e) => {
        if (!e.lengthComputable) return;
        const pct     = Math.round((e.loaded / e.total) * 100);
        const elapsed = (Date.now() - startRef.current) / 1000;
        const speed   = elapsed > 0 ? Math.round(e.loaded / 1024 / elapsed) : 0;
        setProgress(pct);
        setBytesLoaded(e.loaded);
        setSpeedKBs(speed);
      });

      xhr.addEventListener("load", () => {
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText) as {
              secure_url?: string; public_id?: string; error?: { message?: string };
            };
            if (result.error) { setError(result.error.message ?? "Upload failed"); return; }
            if (!result.secure_url) { setError("Upload failed — no URL returned"); return; }
            setPreview(result.secure_url);
            setDone(true);
            onUpload(result.secure_url, result.public_id);
          } catch { setError("Upload failed — invalid response"); }
        } else {
          setError(`Upload failed (HTTP ${xhr.status})`);
        }
      });

      xhr.addEventListener("error", () => {
        setUploading(false);
        setError("Network error — check your connection and try again");
      });

      xhr.addEventListener("abort", () => {
        setUploading(false);
        setProgress(0);
      });

      xhr.open("POST", cloudUrl);
      xhr.send(formData);

    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }, [folder, onUpload, validate]);

  const cancelUpload = () => {
    xhrRef.current?.abort();
    xhrRef.current = null;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const clear = () => {
    cancelUpload();
    setPreview(""); setDone(false); setProgress(0);
    setVideoDur(null); setError("");
    onUpload("", undefined);
  };

  // Extract video duration for display before upload
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.onloadedmetadata = () => {
        setVideoDur(vid.duration);
        URL.revokeObjectURL(url);
      };
      vid.src = url;
    }

    void handleFile(file);
  };

  const etaSec = speedKBs > 0 && totalBytes > bytesLoaded
    ? Math.round((totalBytes - bytesLoaded) / 1024 / speedKBs)
    : null;

  return (
    <div className="space-y-2">
      <label className="block text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">
        {label}
      </label>

      {preview ? (
        /* ── Preview ── */
        <div
          className="relative rounded-xl overflow-hidden border border-[var(--border-strong)] group bg-[var(--bg-secondary)]"
          style={{ aspectRatio }}
        >
          {isImage && (
            <Image
              src={preview}
              alt="Preview"
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-contain"
              unoptimized
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

          {/* Success tick */}
          {done && (
            <div className="absolute top-2 left-2 p-1.5 bg-emerald-500/80 rounded-full text-white">
              <FiCheckCircle size={14} />
            </div>
          )}

          {/* Remove */}
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
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors group ${
            uploading
              ? "border-[var(--accent)] cursor-not-allowed"
              : "border-[var(--border)] hover:border-[var(--accent)] cursor-pointer"
          }`}
          style={{ aspectRatio }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && !uploading && inputRef.current?.click()}
          aria-label={`Upload ${label}`}
        >
          {isVideo ? (
            <FiVideo className="mx-auto text-3xl text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors mb-3" />
          ) : (
            <FiUploadCloud className="mx-auto text-3xl text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors mb-3" />
          )}
          <p className="text-sm text-[var(--text-secondary)]">
            Drag &amp; drop or{" "}
            <span className="text-[var(--accent)] font-medium">browse</span>
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Max {fmtSize(maxSize)}
            {videoDur != null && (
              <span className="ml-2 text-[var(--accent)]">· Duration: {fmtTime(videoDur)}</span>
            )}
          </p>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-2">
          {/* Top row: percentage + cancel */}
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <FiLoader className="animate-spin" size={12} />
              Uploading {fmtSize(bytesLoaded)} / {fmtSize(totalBytes)}
              {speedKBs > 0 && (
                <span className="ml-2 text-[var(--accent)]">
                  {speedKBs >= 1024 ? `${(speedKBs / 1024).toFixed(1)} MB/s` : `${speedKBs} KB/s`}
                  {etaSec != null && etaSec < 3600 && (
                    <span className="ml-1 text-[var(--text-muted)]">
                      · {etaSec < 60 ? `${etaSec}s` : `${Math.round(etaSec / 60)}m`} left
                    </span>
                  )}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={cancelUpload}
              className="text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>

          {/* Progress bar with percentage */}
          <div className="relative">
            <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="absolute right-0 -top-5 text-[10px] text-[var(--accent)] font-semibold tabular-nums">
              {progress}%
            </span>
          </div>
        </div>
      )}

      {/* Success banner */}
      {done && !uploading && (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
          <FiCheckCircle size={12} /> Uploaded successfully
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <FiAlertTriangle size={12} /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}

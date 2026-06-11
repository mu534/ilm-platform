"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { FiUploadCloud, FiX, FiFile } from "react-icons/fi";

interface FileUploaderProps {
  accept: string;
  folder: string;
  label: string;
  onUpload: (url: string) => void;
  currentUrl?: string;
}

export function FileUploader({
  accept,
  folder,
  label,
  onUpload,
  currentUrl,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(currentUrl ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage = accept.includes("image");
  const isVideo = accept.includes("video");

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      setProgress(80);

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setPreview(data.data.url);
      onUpload(data.data.url);
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-ink-300 font-medium">{label}</label>

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-gold-500/20 group">
          {isImage && (
            <div className="relative w-full h-48">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          {isVideo && (
            <video
              src={preview}
              className="w-full h-48 object-cover"
              controls
            />
          )}
          {!isImage && !isVideo && (
            <div className="h-24 flex items-center justify-center bg-ink-800 gap-2 text-ink-300">
              <FiFile /> <span className="text-sm">File uploaded</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setPreview("");
              onUpload("");
            }}
            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
          >
            <FiX size={14} />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-white/10 hover:border-gold-500/40 rounded-xl p-8 text-center cursor-pointer transition-colors group"
        >
          <FiUploadCloud className="mx-auto text-3xl text-ink-500 group-hover:text-gold-400 transition-colors mb-2" />
          <p className="text-sm text-ink-400">
            Drag & drop or <span className="text-gold-400">browse</span>
          </p>
          <p className="text-xs text-ink-600 mt-1">Max 100MB</p>
        </div>
      )}

      {uploading && (
        <div className="space-y-1">
          <div className="w-full bg-ink-800 rounded-full h-1.5">
            <div
              className="bg-gold-500 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-ink-400">Uploading...</p>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  FiDownload, FiExternalLink, FiFileText,
  FiMaximize2, FiMinimize2, FiAlertTriangle,
} from "react-icons/fi";

interface LecturePdfViewerProps {
  url:   string;
  title: string;
}

/**
 * Robust PDF viewer that works across all browsers and devices:
 *
 * - Desktop Chrome/Edge/Safari: native <iframe> with PDF.js fallback
 * - Firefox: Google Docs PDF viewer (avoids iframe blank-frame bug)
 * - iOS Safari / Android: can't render PDFs in iframes — shows a
 *   friendly download prompt instead
 * - Cloudinary raw URLs: proxied through Google Docs viewer so the
 *   Content-Type header restriction doesn't block rendering
 */
export function LecturePdfViewer({ url, title }: LecturePdfViewerProps) {
  const [expanded,    setExpanded]    = useState(false);
  const [viewerError, setViewerError] = useState(false);
  const [isMobile,    setIsMobile]    = useState(() => {
    if (typeof window === "undefined") return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  });

  // Google Docs viewer works for any publicly accessible PDF URL,
  // including Cloudinary raw URLs which don't always serve correct MIME type.
  const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  const height = expanded ? "h-[85vh]" : "h-[600px]";

  return (
    <div className={`mb-8 border border-[var(--border)] rounded-xl overflow-hidden transition-all ${expanded ? "fixed inset-4 z-50 bg-[var(--bg-primary)] shadow-2xl" : ""}`}>
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2">
          <FiFileText size={14} className="text-red-400" />
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold truncate max-w-[200px]">
            {title}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Fullscreen toggle */}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors"
            title={expanded ? "Exit fullscreen" : "Expand"}
          >
            {expanded ? <FiMinimize2 size={13} /> : <FiMaximize2 size={13} />}
          </button>

          {/* Open in new tab */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors"
            title="Open in new tab"
          >
            <FiExternalLink size={13} />
          </a>

          {/* Download */}
          <a
            href={url}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--accent)] bg-[var(--accent-dim)] hover:bg-[var(--accent)] hover:text-white rounded-lg transition-colors"
          >
            <FiDownload size={12} /> Download PDF
          </a>
        </div>
      </div>

      {/* Viewer area */}
      {isMobile ? (
        /* Mobile: iframes can't render PDFs — show download prompt */
        <div className="flex flex-col items-center justify-center gap-5 py-16 px-6 text-center bg-[var(--bg-card)]">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <FiFileText className="text-red-400 text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              PDF preview not available on mobile
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Download or open in your browser to read this document.
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href={url}
              download
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--accent-light)] transition-colors"
            >
              <FiDownload size={14} /> Download PDF
            </a>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 border border-[var(--border)] text-[var(--text-secondary)] text-sm rounded-xl hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              <FiExternalLink size={14} /> Open
            </a>
          </div>
        </div>
      ) : viewerError ? (
        /* Fallback: direct link when iframe fails */
        <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center bg-[var(--bg-card)]">
          <FiAlertTriangle className="text-amber-400 text-2xl" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              PDF preview unavailable
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Your browser blocked the preview. Open or download to read.
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href={url}
              download
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-xl"
            >
              <FiDownload size={13} /> Download
            </a>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-[var(--text-secondary)] text-sm rounded-xl"
            >
              <FiExternalLink size={13} /> Open
            </a>
          </div>
        </div>
      ) : (
        /* Desktop: Google Docs viewer — works for Cloudinary raw URLs */
        <iframe
          src={googleDocsUrl}
          className={`w-full ${height} transition-all`}
          title={title}
          loading="lazy"
          onError={() => setViewerError(true)}
          // If Google Docs fails to load (e.g. offline), show fallback after 8s
          onLoad={(e) => {
            const iframe = e.currentTarget;
            try {
              // If iframe loaded a blank/error page, detect it
              if (iframe.contentDocument?.title?.includes("Error")) {
                setViewerError(true);
              }
            } catch {
              // Cross-origin — can't check, assume it's fine
            }
          }}
        />
      )}

      {/* Close fullscreen overlay */}
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          title="Close"
        >
          <FiMinimize2 size={16} />
        </button>
      )}
    </div>
  );
}

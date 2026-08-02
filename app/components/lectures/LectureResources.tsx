import {
  FiDownload, FiFile, FiVideo, FiHeadphones,
  FiImage, FiExternalLink, FiFileText,
} from "react-icons/fi";

interface MediaItem {
  id:       string;
  url:      string;
  type:     string;
  filename: string;
  size:     number;
  mimeType?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isExternalLink(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  VIDEO:    { icon: <FiVideo       size={14} />, label: "Video",     color: "text-blue-400"            },
  AUDIO:    { icon: <FiHeadphones  size={14} />, label: "Audio",     color: "text-purple-400"          },
  IMAGE:    { icon: <FiImage       size={14} />, label: "Image",     color: "text-emerald-400"         },
  PDF:      { icon: <FiFileText    size={14} />, label: "PDF",       color: "text-red-400"             },
  DOCUMENT: { icon: <FiFile        size={14} />, label: "Document",  color: "text-[var(--accent)]"     },
};

export function LectureResources({ media }: { media: MediaItem[] }) {
  if (!media || media.length === 0) return null;

  return (
    <section aria-labelledby="resources-heading">
      <h2
        id="resources-heading"
        className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2"
      >
        <FiDownload className="text-[var(--accent)]" size={15} aria-hidden="true" />
        Lesson Resources
        <span className="text-xs text-[var(--text-muted)] font-normal">({media.length})</span>
      </h2>

      <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
        {media.map((item) => {
          const conf    = typeConfig[item.type] ?? { icon: <FiFile size={14} />, label: item.type, color: "text-[var(--text-muted)]" };
          const isLink  = isExternalLink(item.url);

          return (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              download={!isLink ? item.filename : undefined}
              className="flex items-center gap-3 px-4 py-3.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-colors group"
            >
              {/* Type icon */}
              <span className={`flex-shrink-0 ${conf.color}`} aria-hidden="true">
                {conf.icon}
              </span>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                  {item.filename}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {conf.label}
                  {item.size > 0 && ` · ${formatBytes(item.size)}`}
                </p>
              </div>

              {/* Action icon */}
              <span className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
                {isLink
                  ? <FiExternalLink size={13} aria-label="Open link" />
                  : <FiDownload     size={13} aria-label="Download" />
                }
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

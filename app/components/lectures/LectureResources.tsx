import Link from "next/link";
import { FiDownload, FiFile, FiVideo, FiHeadphones, FiImage } from "react-icons/fi";

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
  VIDEO:    <FiVideo     size={15} className="text-blue-400"   />,
  AUDIO:    <FiHeadphones size={15} className="text-purple-400" />,
  IMAGE:    <FiImage     size={15} className="text-green-400"  />,
  PDF:      <FiFile      size={15} className="text-red-400"    />,
  DOCUMENT: <FiFile      size={15} className="text-[var(--accent)]" />,
};

export function LectureResources({ media }: { media: MediaItem[] }) {
  if (!media || media.length === 0) return null;

  return (
    <section className="mb-8 glass-card rounded-2xl p-5">
      <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <FiDownload className="text-[var(--accent)]" size={18} />
        Resources &amp; Attachments
      </h2>
      <div className="space-y-2">
        {media.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            download={item.filename}
            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] transition-all group"
          >
            <div className="flex-shrink-0">
              {typeIcon[item.type] ?? <FiFile size={15} className="text-[var(--text-muted)]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                {item.filename}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {item.type.toLowerCase()} · {formatBytes(item.size)}
              </p>
            </div>
            <FiDownload
              size={14}
              className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0"
            />
          </a>
        ))}
      </div>
    </section>
  );
}

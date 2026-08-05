import {
  FiFile, FiVideo, FiHeadphones, FiImage, FiFileText,
  FiDownload, FiExternalLink, FiLink, FiBookOpen,
} from "react-icons/fi";

interface MediaItem {
  id:       string;
  url:      string;
  type:     string;
  category?: "RESOURCE" | "REFERENCE";
  filename: string;
  size:     number;
}

interface LectureResourcesProps {
  media: MediaItem[];
}

function formatBytes(bytes: number): string {
  if (bytes <= 0)          return "";
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const typeIcon: Record<string, React.ReactNode> = {
  VIDEO:    <FiVideo      size={14} className="text-blue-400"        />,
  AUDIO:    <FiHeadphones size={14} className="text-purple-400"      />,
  IMAGE:    <FiImage      size={14} className="text-emerald-400"     />,
  PDF:      <FiFileText   size={14} className="text-red-400"         />,
  DOCUMENT: <FiFile       size={14} className="text-[var(--accent)]" />,
  LINK:     <FiLink       size={14} className="text-[var(--accent)]" />,
};

function ResourceRow({ item }: { item: MediaItem }) {
  const isLink = item.type === "LINK";
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition-colors group"
    >
      <span className="flex-shrink-0">
        {typeIcon[item.type] ?? <FiFile size={14} className="text-[var(--text-muted)]" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
          {item.filename}
        </p>
        {item.size > 0 && (
          <p className="text-[11px] text-[var(--text-muted)]">{formatBytes(item.size)}</p>
        )}
      </div>
      <span className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
        {isLink ? <FiExternalLink size={13} /> : <FiDownload size={13} />}
      </span>
    </a>
  );
}

/**
 * Renders a lecture's attachments split into two sections, matching how
 * students actually use them:
 *
 *  - Resources  — lesson notes, workbooks, slides, recordings: things to
 *                 download and work through alongside the lesson.
 *  - References — Qur'an verses, hadith, books, articles, external links:
 *                 things to look up and read further.
 */
export function LectureResources({ media }: LectureResourcesProps) {
  if (!media || media.length === 0) return null;

  const resources  = media.filter((m) => (m.category ?? "RESOURCE") === "RESOURCE");
  const references = media.filter((m) => m.category === "REFERENCE");

  return (
    <div className="space-y-6">
      {resources.length > 0 && (
        <section aria-labelledby="resources-heading">
          <h2
            id="resources-heading"
            className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-3"
          >
            <FiDownload size={14} className="text-[var(--accent)]" />
            Resources
          </h2>
          <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] bg-[var(--bg-card)]">
            {resources.map((item) => <ResourceRow key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {references.length > 0 && (
        <section aria-labelledby="references-heading">
          <h2
            id="references-heading"
            className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-3"
          >
            <FiBookOpen size={14} className="text-[var(--accent)]" />
            References
          </h2>
          <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] bg-[var(--bg-card)]">
            {references.map((item) => <ResourceRow key={item.id} item={item} />)}
          </div>
        </section>
      )}
    </div>
  );
}

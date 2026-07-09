import Link from "next/link";
import * as Avatar from "@radix-ui/react-avatar";
import { FiBookOpen, FiStar, FiUsers } from "react-icons/fi";
import type { Scholar } from "../../types/auth.types";

interface ScholarCardProps {
  scholar: Scholar;
}

export function ScholarCard({ scholar }: ScholarCardProps) {
  const photoSrc = scholar.photo ?? scholar.user.image;

  return (
    <Link href={`/scholars/${scholar.id}`} className="group block">
      <article className="glass-card card-lift rounded-2xl p-6 text-center">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <Avatar.Root className="w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--border-strong)] group-hover:border-[var(--accent)] transition-colors">
            {photoSrc && (
              <Avatar.Image src={photoSrc} alt={scholar.user.name} className="w-full h-full object-cover" />
            )}
            <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-[var(--accent-dim)] text-[var(--accent)] text-2xl font-display font-bold">
              {scholar.user.name[0]?.toUpperCase()}
            </Avatar.Fallback>
          </Avatar.Root>
        </div>

        {/* Badges */}
        <div className="flex items-center justify-center gap-1.5 mb-2 flex-wrap">
          {scholar.featured && (
            <span className="flex items-center gap-1 text-xs text-[var(--accent)] font-medium">
              <FiStar size={11} /> Featured
            </span>
          )}
          {(scholar as Scholar & { verified?: boolean }).verified && (
            <span className="text-xs text-emerald-400 font-medium">✓ Verified</span>
          )}
        </div>

        <h3 className="font-display text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-1">
          {scholar.user.name}
        </h3>

        <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-4 leading-relaxed">
          {scholar.bio}
        </p>

        {/* Topics */}
        <div className="flex flex-wrap gap-1.5 justify-center mb-4">
          {scholar.topics.slice(0, 3).map((topic: string) => (
            <span key={topic} className="tag text-xs">
              {topic}
            </span>
          ))}
          {scholar.topics.length > 3 && (
            <span className="tag text-xs">+{scholar.topics.length - 3}</span>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <FiBookOpen size={12} className="text-[var(--accent)]" />
            {scholar._count?.lectures ?? 0} lectures
          </span>
          {(scholar as Scholar & { _count?: { followers?: number } })._count?.followers !== undefined && (
            <span className="flex items-center gap-1">
              <FiUsers size={12} className="text-[var(--accent)]" />
              {(scholar as Scholar & { _count?: { followers?: number } })._count?.followers} followers
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}

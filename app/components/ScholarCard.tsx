import Link from "next/link";
import * as Avatar from "@radix-ui/react-avatar";
import { FiBookOpen, FiStar } from "react-icons/fi";
import type { Scholar } from "../types/auth.types";

interface ScholarCardProps {
  scholar: Scholar;
}

export function ScholarCard({ scholar }: ScholarCardProps) {
  const photoSrc = scholar.photo ?? scholar.user.image;

  return (
    <Link href={`/scholars/${scholar.id}`} className="group block">
      <article className="glass-card gold-border rounded-2xl p-6 hover:border-gold-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold-900/10 text-center">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <Avatar.Root className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold-500/30 group-hover:border-gold-400/60 transition-colors">
            {photoSrc && (
              <Avatar.Image
                src={photoSrc}
                alt={scholar.user.name}
                className="w-full h-full object-cover"
              />
            )}
            <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-gold-800/50 text-gold-300 text-2xl font-display font-bold">
              {scholar.user.name[0]?.toUpperCase()}
            </Avatar.Fallback>
          </Avatar.Root>
        </div>

        {scholar.featured && (
          <div className="flex items-center justify-center gap-1 mb-2">
            <FiStar className="text-gold-400" size={12} />
            <span className="text-xs text-gold-400 font-medium">
              Featured Scholar
            </span>
          </div>
        )}

        <h3 className="font-display text-lg font-semibold text-white group-hover:text-gold-300 transition-colors mb-1">
          {scholar.user.name}
        </h3>

        <p className="text-sm text-ink-400 line-clamp-2 mb-4 leading-relaxed">
          {scholar.bio}
        </p>

        {/* Topics */}
        <div className="flex flex-wrap gap-1.5 justify-center mb-4">
          {scholar.topics.slice(0, 3).map((topic: string) => (
            <span
              key={topic}
              className="text-xs px-2 py-0.5 rounded-full bg-gold-900/30 text-gold-400 border border-gold-700/30"
            >
              {topic}
            </span>
          ))}
          {scholar.topics.length > 3 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-ink-400">
              +{scholar.topics.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center justify-center gap-1 text-xs text-ink-500">
          <FiBookOpen size={12} />
          <span>{scholar._count?.lectures ?? 0} lectures</span>
        </div>
      </article>
    </Link>
  );
}

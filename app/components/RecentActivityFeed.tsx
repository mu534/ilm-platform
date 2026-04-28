import Link from "next/link";
import { FiMessageCircle, FiVideo, FiUser, FiClock, FiArrowRight } from "react-icons/fi";
import { GiStarFormation } from "react-icons/gi";

interface Activity {
  id:   string;
  type: "comment" | "lecture" | "scholar" | "view";
  title:       string;
  description: string;
  user: { name: string; image?: string | null };
  timestamp: Date;
  link:      string;
}

interface RecentActivityFeedProps {
  activities: Activity[];
}

const iconConfig = {
  comment: { icon: FiMessageCircle, color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/20"   },
  lecture: { icon: FiVideo,         color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  scholar: { icon: FiUser,          color: "text-purple-400",  bg: "bg-purple-400/10 border-purple-400/20"  },
  view:    { icon: FiClock,         color: "text-orange-400",  bg: "bg-orange-400/10 border-orange-400/20"  },
} as const;

function formatTimeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  if (activities.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-[var(--border-subtle)]">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--accent-dim)] mb-3">
          <GiStarFormation className="text-gold-400 text-xs" />
          <span className="text-xs tracking-widest text-[var(--accent)] uppercase font-semibold">
            Recent Activity
          </span>
          <GiStarFormation className="text-gold-400 text-xs" />
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] leading-tight">
          Community in Action
        </h2>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">
          See what&apos;s happening in our Islamic learning community
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-3">
        {activities.map((activity, i) => {
          const cfg  = iconConfig[activity.type] ?? iconConfig.comment;
          const Icon = cfg.icon;

          return (
            <Link
              key={activity.id}
              href={activity.link}
              className="
                group flex items-start gap-4 p-4 rounded-2xl
                border border-[var(--border)]
                bg-[var(--bg-card)] hover:border-[var(--border-strong)]
                hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-md)]
                transition-all duration-300 animate-fadeInUp
              "
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Icon */}
              <div className={`flex-shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${cfg.bg}`}>
                <Icon className={cfg.color} size={15} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-[var(--text-primary)] text-sm font-semibold mb-0.5 group-hover:text-[var(--accent)] transition-colors">
                  {activity.title}
                </h4>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-1.5 line-clamp-2">
                  {activity.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="font-medium">{activity.user.name}</span>
                  <span>·</span>
                  <span>{formatTimeAgo(activity.timestamp)}</span>
                </div>
              </div>

              <FiArrowRight
                className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all mt-1"
                size={14}
              />
            </Link>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <Link
          href="/activity"
          className="
            inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium
            border border-[var(--border-strong)]
            text-[var(--text-primary)]
            hover:bg-[var(--accent-dim)] hover:border-[var(--accent)]
            transition-all duration-300 hover:scale-105 active:scale-95
          "
        >
          View All Activity <FiArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
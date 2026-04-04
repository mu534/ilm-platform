import { FiMessageCircle, FiVideo, FiUser, FiClock } from "react-icons/fi";

interface Activity {
  id: string;
  type: "comment" | "lecture" | "scholar" | "view";
  title: string;
  description: string;
  user: {
    name: string;
    image?: string;
  };
  timestamp: Date;
  link: string;
}

interface RecentActivityFeedProps {
  activities: Activity[];
}

function getActivityIcon(type: Activity["type"]) {
  switch (type) {
    case "comment":
      return <FiMessageCircle className="text-blue-400" size={16} />;
    case "lecture":
      return <FiVideo className="text-green-400" size={16} />;
    case "scholar":
      return <FiUser className="text-purple-400" size={16} />;
    case "view":
      return <FiClock className="text-orange-400" size={16} />;
    default:
      return <FiMessageCircle className="text-ink-400" size={16} />;
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  if (activities.length === 0) {
    return null; // Don't render if no activities
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-white/5">
      <div className="text-center mb-8">
        <p className="text-xs text-gold-400 uppercase tracking-widest font-semibold mb-1.5">
          Recent Activity
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
          Community in Action
        </h2>
        <p className="text-ink-300 mt-2 text-sm">
          See what's happening in our Islamic learning community
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className="glass-card gold-border rounded-xl p-4 hover:bg-white/[0.03] transition-all duration-300 hover:scale-[1.02] animate-fadeInUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-white text-sm font-medium mb-1">
                    {activity.title}
                  </h4>
                  <p className="text-ink-300 text-sm leading-relaxed mb-2">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-ink-400">
                    <span>{activity.user.name}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <a
            href="/activity"
            className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 hover:border-gold-500/30 hover:bg-white/5 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 text-sm"
          >
            View All Activity
          </a>
        </div>
      </div>
    </section>
  );
}
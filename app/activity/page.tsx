import Link from "next/link";
import { prisma } from "@/app/lib/prism";
import { formatDate } from "@/app/utils/api";
import {
  FiMessageCircle, FiVideo, FiUser, FiArrowLeft,
} from "react-icons/fi";
import { GiStarFormation } from "react-icons/gi";

export const metadata = { title: "Recent Activity" };

async function getActivity() {
  const [recentComments, recentLectures, recentCourses, recentScholars] = await Promise.all([
    prisma.comment.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        author:  { select: { name: true, image: true } },
        lecture: { select: { title: true, slug: true } },
      },
    }),
    prisma.lecture.findMany({
      where: { published: true },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        author:  { select: { name: true } },
        scholar: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.course.findMany({
      where: { published: true },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, slug: true, createdAt: true,
        author: { select: { name: true } },
      },
    }),
    prisma.scholar.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  type ActivityItem = {
    id: string;
    type: "comment" | "lecture" | "course" | "scholar";
    title: string;
    description: string;
    user: { name: string };
    timestamp: Date;
    link: string;
  };

  const activities: ActivityItem[] = [
    ...recentComments.map((c) => ({
      id:          `comment-${c.id}`,
      type:        "comment" as const,
      title:       `New comment on "${c.lecture.title}"`,
      description: c.body.length > 120 ? `${c.body.slice(0, 120)}…` : c.body,
      user:        { name: c.author.name },
      timestamp:   c.createdAt,
      link:        `/lectures/${c.lecture.slug}`,
    })),
    ...recentLectures.map((l) => ({
      id:          `lecture-${l.id}`,
      type:        "lecture" as const,
      title:       "New lecture published",
      description: `"${l.title}" by ${l.scholar?.user.name ?? l.author.name}`,
      user:        { name: l.author.name },
      timestamp:   l.createdAt,
      link:        `/lectures/${l.slug}`,
    })),
    ...recentCourses.map((c) => ({
      id:          `course-${c.id}`,
      type:        "course" as const,
      title:       "New course published",
      description: `"${c.title}" by ${c.author.name}`,
      user:        { name: c.author.name },
      timestamp:   c.createdAt,
      link:        `/courses/${c.slug}`,
    })),
    ...recentScholars.map((s) => ({
      id:          `scholar-${s.id}`,
      type:        "scholar" as const,
      title:       "New scholar joined",
      description: `${s.user.name} joined the platform`,
      user:        { name: s.user.name },
      timestamp:   s.createdAt,
      link:        `/scholars/${s.id}`,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 30);

  return activities;
}

const iconConfig = {
  comment: { icon: FiMessageCircle, color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/20"    },
  lecture: { icon: FiVideo,         color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  course:  { icon: FiVideo,         color: "text-purple-400",  bg: "bg-purple-400/10 border-purple-400/20"  },
  scholar: { icon: FiUser,          color: "text-orange-400",  bg: "bg-orange-400/10 border-orange-400/20"  },
} as const;

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

export default async function ActivityPage() {
  const activities = await getActivity();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-8"
      >
        <FiArrowLeft size={14} /> Back to Home
      </Link>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--accent-dim)] mb-3">
          <GiStarFormation className="text-gold-400 text-xs" />
          <span className="text-xs tracking-widest text-[var(--accent)] uppercase font-semibold">
            Live Feed
          </span>
          <GiStarFormation className="text-gold-400 text-xs" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
          Community Activity
        </h1>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">
          Everything happening across the ILM Platform
        </p>
      </div>

      {/* Feed */}
      {activities.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <FiMessageCircle className="text-4xl mx-auto mb-4 opacity-30" />
          <p>No activity yet. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, i) => {
            const cfg  = iconConfig[activity.type];
            const Icon = cfg.icon;

            return (
              <Link
                key={activity.id}
                href={activity.link}
                className="group flex items-start gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-md)] transition-all duration-300 animate-fadeInUp"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${cfg.bg}`}>
                  <Icon className={cfg.color} size={16} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[var(--text-primary)] text-sm font-semibold mb-0.5 group-hover:text-[var(--accent)] transition-colors">
                    {activity.title}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed line-clamp-2">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--text-muted)]">
                    <span className="font-medium">{activity.user.name}</span>
                    <span>·</span>
                    <span>{timeAgo(activity.timestamp)}</span>
                    <span>·</span>
                    <span>{formatDate(activity.timestamp)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

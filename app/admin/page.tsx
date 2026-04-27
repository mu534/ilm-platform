import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "../lib/auth";
import { prisma } from "../lib/prism";
import { formatDate } from "../utils/api";
import {
  FiBookOpen,
  FiUsers,
  FiMessageCircle,
  FiStar,
  FiPlus,
  FiEye,
} from "react-icons/fi";

async function getDashboardStats() {
  const [
    lectureCount,
    userCount,
    commentCount,
    scholarCount,
    recentLectures,
    recentUsers,
  ] = await Promise.all([
    prisma.lecture.count(),
    prisma.user.count(),
    prisma.comment.count(),
    prisma.scholar.count(),
    prisma.lecture.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        published: true,
        views: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);
  return {
    lectureCount,
    userCount,
    commentCount,
    scholarCount,
    recentLectures,
    recentUsers,
  };
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (user?.role !== "ADMIN") redirect("/admin/lectures");

  const stats = await getDashboardStats();

  const statCards = [
    {
      icon: <FiBookOpen />,
      label: "Total Lectures",
      value: stats.lectureCount,
      href: "/admin/lectures",
      color: "text-accent",
    },
    {
      icon: <FiUsers />,
      label: "Registered Users",
      value: stats.userCount,
      href: "/admin/users",
      color: "text-accent",
    },
    {
      icon: <FiMessageCircle />,
      label: "Comments",
      value: stats.commentCount,
      href: "#",
      color: "text-accent",
    },
    {
      icon: <FiStar />,
      label: "Scholars",
      value: stats.scholarCount,
      href: "/admin/scholars",
      color: "text-accent",
    },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">
            Dashboard
          </h1>
          <p className="text-muted text-sm mt-1">Platform overview</p>
        </div>
        <Link
          href="/admin/lectures/new"
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-primary rounded-xl text-sm font-medium transition-colors"
        >
          <FiPlus /> New Lecture
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="glass-card border-accent rounded-xl p-5 hover:border-accent transition-colors"
          >
            <div className={`${card.color} mb-3`}>{card.icon}</div>
            <div className="font-display text-2xl font-bold text-primary">
              {card.value.toLocaleString()}
            </div>
            <div className="text-xs text-muted mt-1">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent lectures */}
        <div className="glass-card rounded-xl overflow-hidden border border-theme">
          <div className="p-5 border-b border-theme flex items-center justify-between">
            <h2 className="font-semibold text-primary">Recent Lectures</h2>
            <Link href="/admin/lectures" className="text-xs text-accent">
              View all
            </Link>
          </div>
          <div className="divide-y divide-theme">
            {stats.recentLectures.map((lecture) => (
              <div key={lecture.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary truncate">{lecture.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {lecture.author.name} · {formatDate(lecture.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${lecture.published ? "bg-accent/30 text-accent" : "bg-secondary text-muted"}`}
                  >
                    {lecture.published ? "Published" : "Draft"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <FiEye size={11} /> {lecture.views}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div className="glass-card rounded-xl overflow-hidden border border-theme">
          <div className="p-5 border-b border-theme flex items-center justify-between">
            <h2 className="font-semibold text-primary">Recent Users</h2>
            <Link href="/admin/users" className="text-xs text-accent">
              View all
            </Link>
          </div>
          <div className="divide-y divide-theme">
            {stats.recentUsers.map((user) => (
              <div key={user.id} className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-accent text-sm font-bold">
                  {user.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary truncate">{user.name}</p>
                  <p className="text-xs text-muted truncate">{user.email}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    user.role === "ADMIN"
                      ? "bg-red-900/30 text-red-400 border-red-700/30"
                      : user.role === "SCHOLAR"
                        ? "bg-accent/30 text-accent border-accent/30"
                        : "bg-secondary text-muted border-theme"
                  }`}
                >
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

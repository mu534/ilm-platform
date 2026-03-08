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
      color: "text-blue-400",
    },
    {
      icon: <FiUsers />,
      label: "Registered Users",
      value: stats.userCount,
      href: "/admin/users",
      color: "text-green-400",
    },
    {
      icon: <FiMessageCircle />,
      label: "Comments",
      value: stats.commentCount,
      href: "#",
      color: "text-purple-400",
    },
    {
      icon: <FiStar />,
      label: "Scholars",
      value: stats.scholarCount,
      href: "/admin/scholars",
      color: "text-gold-400",
    },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Dashboard
          </h1>
          <p className="text-ink-400 text-sm mt-1">Platform overview</p>
        </div>
        <Link
          href="/admin/lectures/new"
          className="flex items-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded-xl text-sm font-medium transition-colors"
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
            className="glass-card gold-border rounded-xl p-5 hover:border-gold-500/40 transition-colors"
          >
            <div className={`${card.color} mb-3`}>{card.icon}</div>
            <div className="font-display text-2xl font-bold text-white">
              {card.value.toLocaleString()}
            </div>
            <div className="text-xs text-ink-500 mt-1">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent lectures */}
        <div className="glass-card rounded-xl overflow-hidden border border-white/5">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-semibold text-white">Recent Lectures</h2>
            <Link href="/admin/lectures" className="text-xs text-gold-400">
              View all
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {stats.recentLectures.map((lecture) => (
              <div key={lecture.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{lecture.title}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {lecture.author.name} · {formatDate(lecture.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${lecture.published ? "bg-green-900/30 text-green-400" : "bg-ink-700 text-ink-400"}`}
                  >
                    {lecture.published ? "Published" : "Draft"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-ink-500">
                    <FiEye size={11} /> {lecture.views}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div className="glass-card rounded-xl overflow-hidden border border-white/5">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-semibold text-white">Recent Users</h2>
            <Link href="/admin/users" className="text-xs text-gold-400">
              View all
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {stats.recentUsers.map((user) => (
              <div key={user.id} className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gold-700/30 flex items-center justify-center text-gold-400 text-sm font-bold">
                  {user.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{user.name}</p>
                  <p className="text-xs text-ink-500 truncate">{user.email}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    user.role === "ADMIN"
                      ? "bg-red-900/30 text-red-400 border-red-700/30"
                      : user.role === "SCHOLAR"
                        ? "bg-gold-900/30 text-gold-400 border-gold-700/30"
                        : "bg-blue-900/20 text-blue-400 border-blue-700/20"
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
